import type { NextRequest, NextResponse } from 'next/server';

/**
 * Schuetzt die geteilte Postgres-Datenbank ("Tool Hub energetisiert.") vor Flut-
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

  // Erst die abgelaufenen Fenster wegwerfen und nur dann, wenn das nicht
  // reicht (viele verschiedene IPs INNERHALB desselben Fensters), die Map ganz
  // leeren. Ein sofortiges clear() verwirft auch laufende Zaehler und wuerde
  // damit ausgerechnet unter Last das Limit fuer alle zuruecksetzen.
  if (zaehler.size > MAX_EINTRAEGE) {
    for (const [schluessel, wert] of zaehler) {
      if (jetzt > wert.ablauf) zaehler.delete(schluessel);
    }
    if (zaehler.size > MAX_EINTRAEGE) zaehler.clear();
  }

  const eintrag = zaehler.get(ip);
  if (!eintrag || jetzt > eintrag.ablauf) {
    zaehler.set(ip, { anzahl: 1, ablauf: jetzt + FENSTER_MS });
    return false;
  }
  eintrag.anzahl += 1;
  return eintrag.anzahl > MAX_PRO_FENSTER;
}

/* ------------------------------------------------------------------------
 * Automatische Abmeldung nach 30 Minuten Inaktivitaet.
 *
 * Der Cookie `ea_aktiv` traegt den Zeitstempel (ms) der letzten Anfrage an
 * irgendeine App der Suite (Domain .energetisiert.de, httpOnly). Jede
 * Middleware liest ihn: ist er aelter als INAKTIVITAET_MAX_MS, wird die
 * Session beendet und zum Hub-Login umgeleitet; sonst wird er aufgefrischt
 * (hoechstens einmal pro Minute, um Set-Cookie-Rauschen zu vermeiden).
 * Fehlt der Cookie (frisch angemeldet, oder aus der Zeit vor dieser Funktion),
 * beginnt die Frist mit dieser Anfrage.
 * ---------------------------------------------------------------------- */

export const AKTIV_COOKIE = 'ea_aktiv';
export const INAKTIVITAET_MAX_MS = 30 * 60 * 1000;
const AKTIV_REFRESH_AB_MS = 60 * 1000;

function aktivCookieOptions(host: string | null | undefined) {
  const istProdDomain = !!host && (host === 'energetisiert.de' || host.endsWith('.energetisiert.de'));
  return {
    ...(istProdDomain ? { domain: '.energetisiert.de', secure: true } : {}),
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24,
  };
}

/** true, wenn seit der letzten registrierten Aktivitaet mehr als 30 Minuten vergangen sind. */
export function inaktivitaetAbgelaufen(req: NextRequest, jetzt = Date.now()): boolean {
  const roh = req.cookies.get(AKTIV_COOKIE)?.value;
  if (!roh) return false;
  const letzte = Number(roh);
  if (!Number.isFinite(letzte)) return false;
  return jetzt - letzte > INAKTIVITAET_MAX_MS;
}

/** Schreibt den Aktivitaets-Zeitstempel, wenn der vorhandene aelter als eine Minute ist. */
export function aktivitaetMarkieren(req: NextRequest, res: NextResponse, host: string | null | undefined, jetzt = Date.now()): void {
  const letzte = Number(req.cookies.get(AKTIV_COOKIE)?.value);
  if (Number.isFinite(letzte) && jetzt - letzte < AKTIV_REFRESH_AB_MS) return;
  res.cookies.set(AKTIV_COOKIE, String(jetzt), aktivCookieOptions(host));
}

/**
 * Loescht alle Supabase-Session-Cookies und den Aktivitaets-Cookie auf der
 * gegebenen Response -- mit denselben Domain-Optionen, mit denen sie gesetzt
 * wurden (ein abweichendes Domain-Attribut wuerde den Cookie nicht loeschen,
 * siehe cookie-options.ts).
 */
export function sessionCookiesLoeschen(req: NextRequest, res: NextResponse, host: string | null | undefined): void {
  // maxAge UND expires: im Node-Route-Handler kam Max-Age=0 allein nicht
  // zuverlaessig in den Set-Cookie-Header (Cookie blieb als leerer Session-Cookie).
  const optionen = { ...aktivCookieOptions(host), maxAge: 0, expires: new Date(0) };
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith('sb-') && c.name.includes('-auth-token')) res.cookies.set(c.name, '', optionen);
  }
  res.cookies.set(AKTIV_COOKIE, '', optionen);
}
