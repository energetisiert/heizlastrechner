import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { ipHash } from './guards';

/**
 * Fixed-Window-Rate-Limiting über die Supabase-Funktion
 * heizlast_bump_rate_limit (siehe Migration heizlastrechner_konsolidierung
 * im gemeinsamen Projekt "foerderrechner"). Laeuft ueber den oeffentlichen
 * publishable/anon Key -- kein Service-Role-Key mehr noetig: die Funktion
 * ist SECURITY DEFINER und zaehlt/prueft atomar serverseitig, EXECUTE ist
 * an anon/authenticated gewaehrt (einheitlich mit CO2-Rechner/
 * Gebaeudeabgrenzung/Sanierungsrechner). Die zugrunde liegende Tabelle
 * bleibt fuer anon/authenticated per RLS ohne Policies vollstaendig
 * gesperrt -- nur der Weg ueber die Funktion ist erlaubt.
 *
 * Fail-open: Ohne IP_SALT oder Supabase-Konfiguration, oder wenn Supabase
 * nicht erreichbar ist, wird der Request durchgelassen (Verfügbarkeit vor
 * Blockade); der Vorfall landet im Log.
 */
export async function rateLimitUeberschritten(
  req: NextRequest,
  route: string,
  limitProMinute: number
): Promise<boolean> {
  const hash = await ipHash(req);
  if (!hash) {
    console.warn('IP_SALT nicht gesetzt — Rate-Limiting übersprungen.');
    return false;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn('Kein Supabase konfiguriert — Rate-Limiting übersprungen.');
    return false;
  }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc('heizlast_bump_rate_limit', {
      p_ip_hash: hash,
      p_route: route,
      p_window_seconds: 60,
    });
    if (error) {
      console.error('heizlast_bump_rate_limit fehlgeschlagen:', error.message);
      return false;
    }
    return typeof data === 'number' && data > limitProMinute;
  } catch (e) {
    console.error('Rate-Limit-Check fehlgeschlagen:', e);
    return false;
  }
}
