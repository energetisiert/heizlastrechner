import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { ipHash } from './guards';

/**
 * Fixed-Window-Rate-Limiting über die geteilte Supabase-Funktion
 * rate_limit_hit (siehe Migration rate_limit_consolidation im gemeinsamen
 * Projekt "foerderrechner" -- ersetzt die frueher app-eigenen Funktionen,
 * eine je Tool, durch eine gemeinsame). Laeuft ueber den oeffentlichen
 * publishable/anon Key -- kein Service-Role-Key noetig: die Funktion ist
 * SECURITY DEFINER und zaehlt/prueft atomar serverseitig, EXECUTE ist an
 * anon/authenticated gewaehrt. Die zugrunde liegende Tabelle bleibt fuer
 * anon/authenticated per RLS ohne Policies vollstaendig gesperrt -- nur der
 * Weg ueber die Funktion ist erlaubt.
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
    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_scope: `heizlastrechner:${route}`,
      p_ip_hash: hash,
      p_limit: limitProMinute,
      p_window_seconds: 60,
    });
    if (error) {
      console.error('rate_limit_hit fehlgeschlagen:', error.message);
      return false;
    }
    return data !== true;
  } catch (e) {
    console.error('Rate-Limit-Check fehlgeschlagen:', e);
    return false;
  }
}
