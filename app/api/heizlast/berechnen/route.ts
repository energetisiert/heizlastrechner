import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import {
  berechneBedarf, berechneVerbrauch, vergleiche, wpEignung, leadBewertung
} from '@/lib/tools/heizlast/engine';
import { TOKEN_COOKIE, originGueltig, tokenGueltig } from '@/lib/security/guards';
import { rateLimitUeberschritten } from '@/lib/security/rate-limit';

/**
 * POST /api/heizlast/berechnen
 *
 * Nimmt die Rohangaben aus dem Formular entgegen und rechnet serverseitig.
 * Die Parameter (U-Werte, Vollbenutzungsstunden, Typologie) leben nur in
 * lib/tools/heizlast/engine.ts (server-only) und verlassen den Server nie:
 * die Response wird auf gerundete Endwerte und UI-Strings gefiltert —
 * keine U-Werte, fT-Faktoren, Flächen, Geometrie oder Koeffizienten.
 *
 * Schutzschichten (in Prüfreihenfolge):
 *  1. Origin-Enforcement (403)
 *  2. Vercel BotID (403)
 *  3. Signiertes Request-Token aus der Middleware (403)
 *  4. Rate-Limit 60/min pro IP-Hash (429) — großzügig, weil der Rechner
 *     live bei jeder Eingabe rechnet; Scraper-Sweeps bleiben trotzdem hängen.
 */

// Das Live-Tippen löst debounced viele legitime Requests aus.
const LIMIT_PRO_MINUTE = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */
function bedarfFiltern(e: any) {
  return {
    gebaeudeheizlastKW: e.gebaeudeheizlastKW,
    spezifischWproM2: e.spezifischWproM2,
    normAussentemperatur: e.normAussentemperatur,
    warmwasserKW: e.warmwasserKW,
    gesamtKW: e.gesamtKW,
    wpEmpfehlung: e.wpEmpfehlung,
    positionen: (e.positionen as any[]).map((p) => ({
      key: p.key, label: p.label, verlustW: p.verlustW, anteil: p.anteil,
    })),
    hinweise: e.hinweise,
  };
}

function verbrauchFiltern(e: any) {
  return {
    gebaeudeheizlastKW: e.gebaeudeheizlastKW,
    spezifischWproM2: e.spezifischWproM2,
    normAussentemperatur: e.normAussentemperatur,
    warmwasserKW: e.warmwasserKW,
    gesamtKW: e.gesamtKW,
    wpEmpfehlung: e.wpEmpfehlung,
    endenergieKWh: e.endenergieKWh,
    nutzwaermeKWh: e.nutzwaermeKWh,
    trinkwarmwasserKWh: e.trinkwarmwasserKWh,
    raumwaermeKWh: e.raumwaermeKWh,
    vollbenutzungsstunden: e.vollbenutzungsstunden,
    hinweise: e.hinweise,
  };
}

function vergleichFiltern(v: any) {
  if (!v) return v;
  return {
    bedarfKW: v.bedarfKW, verbrauchKW: v.verbrauchKW,
    abweichungProzent: v.abweichungProzent, ampel: v.ampel,
    text: v.text, empfehlung: v.empfehlung,
    empfehlungAuslegungKW: v.empfehlungAuslegungKW,
  };
}

function wpEignungFiltern(w: any) {
  if (!w) return w;
  return { stufe: w.stufe, ampel: w.ampel, titel: w.titel, text: w.text, heizflaechen: w.heizflaechen };
}

function leadFiltern(l: any) {
  if (!l) return l;
  return { punkte: l.punkte, dringlichkeit: l.dringlichkeit, gruende: l.gruende, ueberschrift: l.ueberschrift };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  if (!originGueltig(req)) {
    return NextResponse.json({ fehler: 'Zugriff verweigert.' }, { status: 403 });
  }

  // Fail-open bei BotID-Infrastrukturfehlern (z. B. lokales `next start`
  // außerhalb Vercels): der Rechner darf daran nie sterben.
  let istBotId = false;
  try {
    istBotId = (await checkBotId()).isBot;
  } catch (e) {
    console.warn('BotID-Check nicht verfügbar, übersprungen:', (e as Error).message);
  }
  if (istBotId) {
    return NextResponse.json({ fehler: 'Zugriff verweigert.' }, { status: 403 });
  }

  if (!(await tokenGueltig(req.cookies.get(TOKEN_COOKIE)?.value, Date.now()))) {
    return NextResponse.json({ fehler: 'Sitzung abgelaufen. Bitte Seite neu laden.' }, { status: 403 });
  }

  if (await rateLimitUeberschritten(req, 'berechnen', LIMIT_PRO_MINUTE)) {
    return NextResponse.json({ fehler: 'Zu viele Anfragen. Bitte kurz warten.' }, { status: 429 });
  }

  let body: {
    bedarf?: Record<string, unknown>;
    verbrauch?: Record<string, unknown>;
    kontext?: { foerderung?: boolean; hydraulischerAbgleich?: boolean };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiges JSON im Request-Body.' }, { status: 400 });
  }

  const antwort: Record<string, unknown> = {};
  let bedarfRoh = null;
  let verbrauchRoh = null;

  if (body.bedarf) {
    try {
      bedarfRoh = berechneBedarf(body.bedarf);
      antwort.bedarf = bedarfFiltern(bedarfRoh);
    } catch (e) {
      return NextResponse.json({ fehler: 'Bedarf: ' + (e as Error).message }, { status: 400 });
    }
  }

  if (body.verbrauch) {
    try {
      verbrauchRoh = berechneVerbrauch(body.verbrauch);
      antwort.verbrauch = verbrauchFiltern(verbrauchRoh);
    } catch (e) {
      return NextResponse.json({ fehler: 'Verbrauch: ' + (e as Error).message }, { status: 400 });
    }
  }

  const vergleichRoh = bedarfRoh && verbrauchRoh ? vergleiche(bedarfRoh, verbrauchRoh) : null;
  if (vergleichRoh) antwort.vergleich = vergleichFiltern(vergleichRoh);

  const aktuellesErgebnis = bedarfRoh?.gebaeudeheizlastKW ? bedarfRoh : verbrauchRoh;
  if (aktuellesErgebnis) {
    antwort.wpEignung = wpEignungFiltern(wpEignung(aktuellesErgebnis.spezifischWproM2));
    antwort.lead = leadFiltern(leadBewertung(aktuellesErgebnis, vergleichRoh, body.kontext || {}));
  }

  return NextResponse.json(antwort);
}
