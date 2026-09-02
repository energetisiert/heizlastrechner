import type { NextRequest } from 'next/server';

/**
 * Schuetzt die geteilte Postgres-Datenbank ("foerderrechner") vor Flut-
 * Anfragen, BEVOR proxy.ts die zugriffsstatus()-RPC aufruft. Zwei Stufen:
 *
 * 1. Keine SSO-Session-Cookie vorhanden -> gar keine RPC noetig, das Ergebnis
 *    waere ohnehin status:'anonym' (auth.uid() ist dann null -- siehe
 *    zugriffsstatus()/hat_zugriff() in der DB). Deckt den Grossteil einer
 *    anonymen Flut ab, ohne die Datenbank ueberhaupt zu erreichen.
 * 2. In-Memory Fixed-Window pro IP fuer alles, was Stufe 1 passiert (also
 *    Requests MIT irgendeiner Session-Cookie) -- faengt Floods mit alten/
 *    fremden Cookies ab. Bewusst In-Memory statt DB-RPC: ein zweiter
 *    RPC-Call pro Request waere kontraproduktiv, der Zweck ist ja gerade,
 *    die DB vor Last zu schuetzen. Nur so lange wirksam, wie die Edge-
 *    Instanz warm bleibt -- kein Ersatz fuer Vercel-seitigen DDoS-Schutz,
 *    aber blendet den haeufigsten Fall (einzelne IP, viele Requests) guenstig
 *    aus. Diese Datei wird bewusst unveraendert in jede der fuenf Rechner-
 *    Apps kopiert, wie der Rest des Security-Layers auch.
 */

const FENSTER_MS = 10_000;
const MAX_PRO_FENSTER = 30;
// Deckel gegen Speicherwachstum durch viele verschiedene Quell-IPs (z.B. ein
// Botnetz) -- statt aufwendiger LRU-Verdraengung wird die Map beim
// Ueberschreiten einfach geleert, ein seltenes, billiges Ereignis.
const MAX_EINTRAEGE = 5000;

const zaehler = new Map<string, { anzahl: number; ablauf: number }>();

export function hatSsoSessionCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unbekannt'
  );
}

/** true = Anfrage ablehnen, bevor die zugriffsstatus()-RPC aufgerufen wird. */
export function rpcRateLimitUeberschritten(req: NextRequest): boolean {
  const jetzt = Date.now();
  const ip = clientIp(req);

  if (zaehler.size > MAX_EINTRAEGE) zaehler.clear();

  const eintrag = zaehler.get(ip);
  if (!eintrag || jetzt > eintrag.ablauf) {
    zaehler.set(ip, { anzahl: 1, ablauf: jetzt + FENSTER_MS });
    return false;
  }
  eintrag.anzahl += 1;
  return eintrag.anzahl > MAX_PRO_FENSTER;
}
