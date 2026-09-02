import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { createClient } from '@/lib/supabase/server';
import { PARAMS, preis, berechneBedarf, berechneVerbrauch, vergleiche, leadBewertung } from '@/lib/tools/heizlast/engine';
import { bedarfFiltern, verbrauchFiltern } from '@/lib/tools/heizlast/response-filter';
import { TOKEN_COOKIE, ipHash, originGueltig, tokenGueltig } from '@/lib/security/guards';
import { rateLimitUeberschritten } from '@/lib/security/rate-limit';

interface AnfrageBody {
  name: string;
  email: string;
  telefon?: string;
  objektAdresse: string;
  anlass?: string;
  zeitraum?: string;
  nachricht?: string;
  dsgvoZugestimmt: boolean;
  /** Rohe Eingaben, dieselbe Form wie fuer /api/heizlast/berechnen -- der
   *  Server rechnet Ergebnis und Lead-Punktzahl hier selbst neu, damit beides
   *  nicht ueber den Client manipulierbar ist (z.B. kuenstlich hohe
   *  Lead-Punkte fuer bevorzugte Bearbeitung). */
  eingabenBedarf?: Record<string, unknown>;
  eingabenVerbrauch?: Record<string, unknown>;
  kontext?: { foerderung?: boolean; hydraulischerAbgleich?: boolean };
  website?: string;
  formGeladenUm?: number;
}

const MINDESTZEIT_FORMULAR_MS = 2500;
const LIMIT_PRO_MINUTE = 5;
const MAX_TEXTLAENGE = 200;
const MAX_NACHRICHT_LAENGE = 4000;

const EMAIL_MUSTER = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/**
 * POST /api/heizlast/anfrage
 *
 * Nimmt das Formular aus dem Vor-Ort-Tab entgegen. Serverseitige Validierung
 * ist Pflicht, auch wenn das Frontend schon prüft — der Client ist nie
 * vertrauenswürdig. Preis wird hier, nicht im Frontend, eingefroren.
 *
 * Schutzschichten: Origin-Enforcement, Vercel BotID, signiertes Request-
 * Token, Rate-Limit 5/min pro IP-Hash, Honeypot + Mindestausfüllzeit.
 * Bots (BotID/Honeypot/Timing) erhalten eine Fake-Erfolgsantwort statt
 * eines Fehlers, damit sie nicht nachjustieren können.
 */
export async function POST(req: NextRequest) {
  if (!originGueltig(req)) {
    return NextResponse.json({ fehler: 'Zugriff verweigert.' }, { status: 403 });
  }

  if (!(await tokenGueltig(req.cookies.get(TOKEN_COOKIE)?.value, Date.now()))) {
    return NextResponse.json({ fehler: 'Sitzung abgelaufen. Bitte Seite neu laden.' }, { status: 403 });
  }

  if (await rateLimitUeberschritten(req, 'anfrage', LIMIT_PRO_MINUTE)) {
    return NextResponse.json({ fehler: 'Zu viele Anfragen. Bitte kurz warten.' }, { status: 429 });
  }

  let body: AnfrageBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiges JSON im Request-Body.' }, { status: 400 });
  }

  // AnfrageBody ist nur ein Compile-Time-Typ -- ungueltige Werte im JSON
  // (z.B. name als Zahl statt String) wuerden .trim()/.length sonst mit
  // einer unbehandelten TypeError statt einer sauberen 400 quittieren.
  const istOptionalerString = (v: unknown): v is string | undefined => v === undefined || typeof v === 'string';
  if (
    typeof body.name !== 'string' ||
    typeof body.email !== 'string' ||
    typeof body.objektAdresse !== 'string' ||
    !istOptionalerString(body.telefon) ||
    !istOptionalerString(body.anlass) ||
    !istOptionalerString(body.zeitraum) ||
    !istOptionalerString(body.nachricht)
  ) {
    return NextResponse.json({ fehler: 'Ungültiges Format im Request-Body.' }, { status: 400 });
  }

  const fehler: string[] = [];
  if (!body.name.trim()) fehler.push('Name');
  if (!body.email || !EMAIL_MUSTER.test(body.email.trim())) fehler.push('gültige E-Mail-Adresse');
  if (!body.objektAdresse.trim()) fehler.push('Objektadresse');
  if (!body.dsgvoZugestimmt) fehler.push('Einwilligung zum Datenschutz');

  if (fehler.length) {
    return NextResponse.json({ fehler: `Bitte noch ergänzen: ${fehler.join(', ')}.` }, { status: 400 });
  }

  const zuLang =
    body.name.length > MAX_TEXTLAENGE ||
    body.email.length > MAX_TEXTLAENGE ||
    (body.telefon?.length ?? 0) > MAX_TEXTLAENGE ||
    body.objektAdresse.length > MAX_TEXTLAENGE ||
    (body.anlass?.length ?? 0) > MAX_TEXTLAENGE ||
    (body.zeitraum?.length ?? 0) > MAX_TEXTLAENGE ||
    (body.nachricht?.length ?? 0) > MAX_NACHRICHT_LAENGE;
  if (zuLang) {
    return NextResponse.json({ fehler: 'Eine Eingabe ist zu lang.' }, { status: 400 });
  }

  const angebotspreis = preis('raumweise').netto;

  // Anti-Spam: BotID-Verdikt, Honeypot-Feld ausgefuellt oder Formular schneller
  // als menschenmoeglich abgeschickt. Tut so, als waere es angekommen, damit
  // Bots nicht nachjustieren.
  let botIdVerdikt = false;
  try {
    botIdVerdikt = (await checkBotId()).isBot;
  } catch (e) {
    console.warn('BotID-Check nicht verfügbar, übersprungen:', (e as Error).message);
  }
  const istBot = botIdVerdikt ||
    Boolean(body.website?.trim()) ||
    (typeof body.formGeladenUm === 'number' && Date.now() - body.formGeladenUm < MINDESTZEIT_FORMULAR_MS);
  if (istBot) {
    return NextResponse.json({ id: 'ok', angebotspreisNetto: angebotspreis });
  }

  // Ergebnis und Lead-Punktzahl serverseitig aus den Roheingaben neu
  // berechnen statt dem Client zu vertrauen -- exakt wie in
  // /api/heizlast/berechnen, siehe Kommentar an AnfrageBody oben.
  let bedarfRoh = null;
  let verbrauchRoh = null;
  try {
    if (body.eingabenBedarf) bedarfRoh = berechneBedarf(body.eingabenBedarf);
  } catch (e) {
    console.warn('anfrage: berechneBedarf fehlgeschlagen, ohne Bedarfsergebnis gespeichert:', (e as Error).message);
  }
  try {
    if (body.eingabenVerbrauch) verbrauchRoh = berechneVerbrauch(body.eingabenVerbrauch);
  } catch (e) {
    console.warn('anfrage: berechneVerbrauch fehlgeschlagen, ohne Verbrauchsergebnis gespeichert:', (e as Error).message);
  }
  const vergleichRoh = bedarfRoh && verbrauchRoh ? vergleiche(bedarfRoh, verbrauchRoh) : null;
  const aktuellesErgebnis = bedarfRoh?.gebaeudeheizlastKW ? bedarfRoh : verbrauchRoh;
  const leadPunkte = aktuellesErgebnis
    ? (leadBewertung(aktuellesErgebnis, vergleichRoh, body.kontext || {})?.punkte ?? null)
    : null;

  // Speicherung laeuft ausschliesslich ueber heizlast_submit_anfrage() --
  // ein direkter REST-Insert waere trotz aller obigen Pruefungen moeglich
  // gewesen, da die RLS-Policy frueher mit `with check (true)` jeden
  // anon-Insert erlaubte. Die Funktion prueft ihr eigenes, DB-seitiges
  // Rate-Limit (5/Stunde je IP-Hash) und ist der einzige verbliebene
  // Schreibweg (siehe Migration heizlast_anfragen_db_hardening).
  const hash = await ipHash(req);
  if (!hash) {
    console.warn('heizlast anfrage: IP_SALT nicht gesetzt, Anfrage kann nicht gespeichert werden.');
    return NextResponse.json({ fehler: 'Anfrage konnte nicht gespeichert werden. Bitte später erneut versuchen.' }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: neueId, error } = await supabase.rpc('heizlast_submit_anfrage', {
    p_ip_hash: hash,
    p_name: body.name.trim(),
    p_email: body.email.trim(),
    p_telefon: body.telefon?.trim() || null,
    p_objekt_adresse: body.objektAdresse.trim(),
    p_anlass: body.anlass || null,
    p_zeitraum: body.zeitraum || null,
    p_nachricht: body.nachricht?.trim() || null,
    p_eingaben_bedarf: body.eingabenBedarf ?? null,
    p_eingaben_verbrauch: body.eingabenVerbrauch ?? null,
    p_ergebnis_bedarf: bedarfRoh ? bedarfFiltern(bedarfRoh) : null,
    p_ergebnis_verbrauch: verbrauchRoh ? verbrauchFiltern(verbrauchRoh) : null,
    p_parameter_version: PARAMS.version,
    p_lead_punkte: leadPunkte,
    p_angebotspreis_netto: angebotspreis,
  });

  if (error) {
    console.error('heizlast_submit_anfrage fehlgeschlagen:', error.message);
    return NextResponse.json({ fehler: 'Anfrage konnte nicht gespeichert werden. Bitte später erneut versuchen.' }, { status: 500 });
  }
  if (!neueId) {
    return NextResponse.json({ fehler: 'Zu viele Anfragen. Bitte versuche es später erneut.' }, { status: 429 });
  }

  // TODO Fabio: hier den n8n-Webhook anstoßen, sobald die Workflow-URL steht.
  // await fetch(process.env.N8N_WEBHOOK_HEIZLAST_ANFRAGE!, { method: 'POST', body: JSON.stringify({ id: neueId, ...body }) });

  return NextResponse.json({ id: neueId, angebotspreisNetto: angebotspreis });
}
