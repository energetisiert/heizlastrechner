import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase-Client für Server Components, Server Actions und API-Routes.
 * Liest/schreibt Auth-Cookies über den Next.js cookies()-Store.
 *
 * Erwartet die Umgebungsvariablen, die die Vercel-Supabase-Integration
 * automatisch setzt: NEXT_PUBLIC_SUPABASE_URL und den anon/publishable Key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // set() aus einer Server Component aufgerufen: ignorierbar, wenn Middleware
            // die Session ohnehin aktualisiert.
          }
        }
      }
    }
  );
}
