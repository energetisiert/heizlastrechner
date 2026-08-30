import { NextRequest, NextResponse } from 'next/server';
import {
  berechneBedarf, berechneVerbrauch, vergleiche, wpEignung, leadBewertung
} from '@/lib/heizlast/logik.js';

/**
 * POST /api/heizlast/berechnen
 *
 * Nimmt die Rohangaben aus dem Formular entgegen und rechnet serverseitig.
 * Das ist bewusst so gebaut, dass die Parameter (U-Werte, Vollbenutzungs-
 * stunden) nie im Browser-Bundle landen — das ist der proprietäre Teil.
 *
 * lib/heizlast/logik.js ist eine minifizierte Auslieferung der geprüften
 * lib/heizlast/logik.ts (siehe Prototyp-Repo für die kommentierte,
 * lesbare Quelle mit 111 Regressionstests). Deshalb hier bewusst lockere
 * Typisierung der Eingaben statt importierter Interfaces.
 *
 * Body:
 *  { bedarf?: {...}, verbrauch?: {...},
 *    kontext?: { foerderung?: boolean; hydraulischerAbgleich?: boolean } }
 */
export async function POST(req: NextRequest) {
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

  if (body.bedarf) {
    try {
      antwort.bedarf = berechneBedarf(body.bedarf);
    } catch (e) {
      return NextResponse.json({ fehler: 'Bedarf: ' + (e as Error).message }, { status: 400 });
    }
  }

  if (body.verbrauch) {
    try {
      antwort.verbrauch = berechneVerbrauch(body.verbrauch);
    } catch (e) {
      return NextResponse.json({ fehler: 'Verbrauch: ' + (e as Error).message }, { status: 400 });
    }
  }

  const bedarfErg = antwort.bedarf as { gebaeudeheizlastKW: number; spezifischWproM2: number | null } | undefined;
  const verbrauchErg = antwort.verbrauch as { gebaeudeheizlastKW: number; spezifischWproM2: number | null } | undefined;

  if (bedarfErg && verbrauchErg) {
    antwort.vergleich = vergleiche(bedarfErg, verbrauchErg);
  }

  const aktuellesErgebnis = bedarfErg?.gebaeudeheizlastKW ? bedarfErg : verbrauchErg;
  if (aktuellesErgebnis) {
    antwort.wpEignung = wpEignung(aktuellesErgebnis.spezifischWproM2);
    antwort.lead = leadBewertung(
      aktuellesErgebnis,
      (antwort.vergleich as ReturnType<typeof vergleiche>) || null,
      body.kontext || {}
    );
  }

  return NextResponse.json(antwort);
}
