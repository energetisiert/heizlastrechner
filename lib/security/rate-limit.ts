import 'server-only';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ipHash } from './guards';

/**
 * Fixed-Window-Rate-Limiting über die Supabase-Funktion bump_rate_limit
 * (siehe supabase/migrations/0002_heizlast_rate_limits.sql). Läuft über den
 * Service-Role-Client — die Tabelle selbst ist per RLS für anon/authenticated
 * komplett gesperrt, von außen also weder les- noch schreibbar.
 *
 * Fail-open: Ohne IP_SALT oder Service-Key, oder wenn Supabase nicht
 * erreichbar ist, wird der Request durchgelassen (Verfügbarkeit vor
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
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Kein Supabase-Service-Key — Rate-Limiting übersprungen.');
    return false;
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('bump_rate_limit', {
      p_ip_hash: hash,
      p_route: route,
      p_window_seconds: 60,
    });
    if (error) {
      console.error('bump_rate_limit fehlgeschlagen:', error.message);
      return false;
    }
    return typeof data === 'number' && data > limitProMinute;
  } catch (e) {
    console.error('Rate-Limit-Check fehlgeschlagen:', e);
    return false;
  }
}
