import { NextRequest, NextResponse } from 'next/server';
import {
  TOKEN_COOKIE, TOKEN_REFRESH_BELOW_MS, tokenAusstellen, tokenRestlaufzeit
} from '@/lib/security/guards';

/**
 * Stellt jedem Besucher ein kurzlebiges, HMAC-signiertes Request-Token als
 * httpOnly-Cookie aus (30 min TTL, Refresh unterhalb 15 min Restlaufzeit).
 * Die Heizlast-API akzeptiert Berechnungen nur mit gültigem Token — ein
 * Scraper, der die Endpoints ohne vorherigen Seitenaufruf direkt anspricht,
 * scheitert daran zusätzlich zu Origin-Check, BotID und Rate-Limit.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const vorhandenes = req.cookies.get(TOKEN_COOKIE)?.value;
  const jetzt = Date.now();

  if (tokenRestlaufzeit(vorhandenes, jetzt) < TOKEN_REFRESH_BELOW_MS) {
    const frisch = await tokenAusstellen(jetzt);
    if (frisch) {
      res.cookies.set(TOKEN_COOKIE, frisch, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60,
      });
    }
  }
  return res;
}

export const config = {
  // Statische Assets aussparen, Seiten und API-Routen abdecken.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)'],
};
