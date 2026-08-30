import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase-Client für Client Components ("use client"). Nutzt nur den
 * öffentlichen anon/publishable Key, niemals den Service-Role-Key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
