import type { NextRequest } from 'next/server';

/**
 * Security-Bausteine für die Heizlast-API: Origin-Enforcement, kurzlebige
 * HMAC-Request-Tokens und IP-Hashing fürs Rate-Limiting. Alles auf Web
 * Crypto aufgebaut, damit derselbe Code in der Edge-Middleware und in den
 * Node-Route-Handlern läuft.
 *
 * Fail-open-Prinzip: Fehlt IP_SALT (z. B. direkt nach dem ersten Deploy,
 * bevor die Env-Variable gesetzt ist), werden Token- und Rate-Limit-Prüfung
 * mit einer Warnung übersprungen statt die Seite lahmzulegen. Origin-Check
 * und BotID greifen unabhängig davon immer.
 */

export const TOKEN_COOKIE = 'hl_token';
export const TOKEN_TTL_MS = 30 * 60 * 1000;
// Unterhalb dieser Restlaufzeit stellt die Middleware ein frisches Token aus.
export const TOKEN_REFRESH_BELOW_MS = 15 * 60 * 1000;

const ERLAUBTE_HOSTS = new Set([
  'heizlastrechner.energetisiert.de',
  'tools.energetisiert.de',
  'energetisiert.de',
  'www.energetisiert.de',
]);

function secret(): string | null {
  return process.env.IP_SALT ?? null;
}

async function hmacHex(payload: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Origin-Enforcement für mutierende Requests. Erlaubt sind die offiziellen
 * Domains sowie Same-Origin (deckt Preview-Deployments und localhost ab).
 * POST ohne Origin-Header wird abgelehnt — jeder Browser sendet ihn.
 */
export function originGueltig(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const requestHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  return originHost === requestHost || ERLAUBTE_HOSTS.has(originHost);
}

/** Erstellt ein signiertes Token: `<ablauf-ms>.<hmac>`. */
export async function tokenAusstellen(jetztMs: number): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const expiry = String(jetztMs + TOKEN_TTL_MS);
  return `${expiry}.${await hmacHex(`hl:${expiry}`, key)}`;
}

/**
 * Prüft Signatur und Ablauf. Ohne IP_SALT wird bewusst durchgewunken
 * (fail-open), damit ein frisches Deployment ohne Env-Variable nicht bricht.
 */
export async function tokenGueltig(token: string | undefined, jetztMs: number): Promise<boolean> {
  const key = secret();
  if (!key) {
    console.warn('IP_SALT nicht gesetzt — Request-Token-Prüfung übersprungen.');
    return true;
  }
  if (!token) return false;
  const [expiry, sig] = token.split('.');
  if (!expiry || !sig) return false;
  if (Number(expiry) < jetztMs) return false;
  return sig === (await hmacHex(`hl:${expiry}`, key));
}

/** Restlaufzeit eines (syntaktisch validen) Tokens in ms, sonst 0. */
export function tokenRestlaufzeit(token: string | undefined, jetztMs: number): number {
  const expiry = Number(token?.split('.')[0]);
  return Number.isFinite(expiry) ? Math.max(0, expiry - jetztMs) : 0;
}

/** SHA-256(IP + Salt) — es landen nie Klartext-IPs in der Datenbank. */
export async function ipHash(req: NextRequest): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip') ?? 'unbekannt';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + key));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
