import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import {
  TOKEN_COOKIE, TOKEN_REFRESH_BELOW_MS, tokenAusstellen, tokenRestlaufzeit
} from '@/lib/security/guards';
import { ssoCookieOptions } from '@/lib/supabase/cookie-options';
import type { Zugriffsstatus } from '@/lib/supabase/zugriffsstatus';

const TOOL_SLUG = 'heizlastrechner';
const HUB_URL = 'https://tools.energetisiert.de';

/**
 * Zwei Aufgaben in einer Funktion (Next 16 erlaubt nur eine Middleware/Proxy-
 * Datei pro App), auf demselben response-Objekt:
 *
 * 1. Zugriffskontrolle: Session vorhanden? Konto freigeschaltet? Enthaelt das
 *    gebuchte Paket dieses Tool? Sonst Redirect zum Hub. Live-Pruefung per
 *    RPC (zugriffsstatus(), gemeinsames Supabase-Projekt "foerderrechner" --
 *    seit der Konsolidierung derselbe Client, der auch das Rate-Limiting
 *    dieses Tools bedient, siehe lib/security/rate-limit.ts). Bewusst LIVE,
 *    nicht der JWT-Claim (der bis zu ~1h veraltet sein kann) -- ein Redirect
 *    hier ist Datenzugriffskontrolle, dafuer gilt dieselbe Regel wie fuer RLS.
 * 2. Bestehende Anti-Scraping-Schicht (unveraendert): kurzlebiges,
 *    HMAC-signiertes Request-Token als httpOnly-Cookie ausstellen/auffrischen.
 */
export async function proxy(req: NextRequest) {
  let response = NextResponse.next({ request: req });
  const host = req.headers.get('host')?.split(':')[0];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: ssoCookieOptions(host),
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) req.cookies.set(name, value);
          response = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data, error } = await supabase.rpc('zugriffsstatus', { p_tool_slug: TOOL_SLUG });
  if (error) {
    console.error('proxy: zugriffsstatus fehlgeschlagen:', error.message);
    return NextResponse.redirect(`${HUB_URL}/login?redirect_to=${encodeURIComponent(req.url)}`);
  }

  const zustand = data as Zugriffsstatus | null;
  if (!zustand || zustand.status === 'anonym') {
    return NextResponse.redirect(`${HUB_URL}/login?redirect_to=${encodeURIComponent(req.url)}`);
  }
  if (zustand.status !== 'approved') {
    return NextResponse.redirect(`${HUB_URL}/warten-auf-freischaltung`);
  }
  if (!zustand.hat_zugriff) {
    return NextResponse.redirect(`${HUB_URL}/kein-zugriff?tool=${TOOL_SLUG}`);
  }

  const vorhandenes = req.cookies.get(TOKEN_COOKIE)?.value;
  const jetzt = Date.now();
  if (tokenRestlaufzeit(vorhandenes, jetzt) < TOKEN_REFRESH_BELOW_MS) {
    const frisch = await tokenAusstellen(jetzt);
    if (frisch) {
      response.cookies.set(TOKEN_COOKIE, frisch, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60,
      });
    }
  }

  return response;
}

export const config = {
  // Statische Assets aussparen, Seiten und API-Routen abdecken.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)'],
};
