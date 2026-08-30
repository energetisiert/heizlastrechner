import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PARAMS, preis } from '@/lib/heizlast/logik.js';

interface AnfrageBody {
  name: string;
  email: string;
  telefon?: string;
  objektAdresse: string;
  anlass?: string;
  zeitraum?: string;
  nachricht?: string;
  dsgvoZugestimmt: boolean;
  eingabenBedarf?: unknown;
  eingabenVerbrauch?: unknown;
  ergebnisBedarf?: unknown;
  ergebnisVerbrauch?: unknown;
  leadPunkte?: number;
  website?: string;
  formGeladenUm?: number;
}

const MINDESTZEIT_FORMULAR_MS = 2500;

const EMAIL_MUSTER = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/**
 * POST /api/heizlast/anfrage
 *
 * Nimmt das Formular aus dem Vor-Ort-Tab entgegen. Serverseitige Validierung
 * ist Pflicht, auch wenn das Frontend schon prüft — der Client ist nie
 * vertrauenswürdig. Preis wird hier, nicht im Frontend, eingefroren.
 */
export async function POST(req: NextRequest) {
  let body: AnfrageBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiges JSON im Request-Body.' }, { status: 400 });
  }

  const fehler: string[] = [];
  if (!body.name?.trim()) fehler.push('Name');
  if (!body.email || !EMAIL_MUSTER.test(body.email.trim())) fehler.push('gültige E-Mail-Adresse');
  if (!body.objektAdresse?.trim()) fehler.push('Objektadresse');
  if (!body.dsgvoZugestimmt) fehler.push('Einwilligung zum Datenschutz');

  if (fehler.length) {
    return NextResponse.json({ fehler: `Bitte noch ergänzen: ${fehler.join(', ')}.` }, { status: 400 });
  }

  const angebotspreis = preis('raumweise').netto;

  // Anti-Spam: Honeypot-Feld ausgefuellt oder Formular schneller als menschenmoeglich
  // abgeschickt. Tut so, als waere es angekommen, damit Bots nicht nachjustieren.
  const istBot = Boolean(body.website?.trim()) ||
    (typeof body.formGeladenUm === 'number' && Date.now() - body.formGeladenUm < MINDESTZEIT_FORMULAR_MS);
  if (istBot) {
    return NextResponse.json({ id: 'ok', angebotspreisNetto: angebotspreis });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('heizlast_anfragen')
    .insert({
      name: body.name.trim(),
      email: body.email.trim(),
      telefon: body.telefon?.trim() || null,
      objekt_adresse: body.objektAdresse.trim(),
      anlass: body.anlass || null,
      zeitraum: body.zeitraum || null,
      nachricht: body.nachricht?.trim() || null,
      dsgvo_zugestimmt_am: new Date().toISOString(),
      eingaben_bedarf: body.eingabenBedarf ?? null,
      eingaben_verbrauch: body.eingabenVerbrauch ?? null,
      ergebnis_bedarf: body.ergebnisBedarf ?? null,
      ergebnis_verbrauch: body.ergebnisVerbrauch ?? null,
      parameter_version: PARAMS.version,
      lead_punkte: body.leadPunkte ?? null,
      angebotspreis_netto: angebotspreis,
      status: 'neu'
    })
    .select('id')
    .single();

  if (error) {
    console.error('heizlast_anfragen insert fehlgeschlagen:', error);
    return NextResponse.json({ fehler: 'Anfrage konnte nicht gespeichert werden. Bitte später erneut versuchen.' }, { status: 500 });
  }

  // TODO Fabio: hier den n8n-Webhook anstoßen, sobald die Workflow-URL steht.
  // await fetch(process.env.N8N_WEBHOOK_HEIZLAST_ANFRAGE!, { method: 'POST', body: JSON.stringify({ id: data.id, ...body }) });

  return NextResponse.json({ id: data.id, angebotspreisNetto: angebotspreis });
}
