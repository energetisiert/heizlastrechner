import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { originGueltig } from '@/lib/security/guards';

/**
 * GET/POST /api/gebaeude -- Studio-Gebäudemodell (gebaeude + gebaeude_knoten).
 *
 * Serverseitiger Supabase-Client (liest die httpOnly-SSO-Cookie); auth.uid()
 * in den gebaeude_*-RPCs ist der eigentliche Auth-Schutz. Origin-Check nur
 * beim mutierenden POST (Browser schicken den Header bei same-origin GET
 * häufig nicht). POST legt bei fehlender gebaeudeId ein neues Gebäude an
 * (gebaeude_upsert) und schreibt danach den Knoten dieses Tools
 * (gebaeude_knoten_upsert) -- ein Knoten je Tool und Gebäude, wird ersetzt.
 */
const TOOL_SLUG = 'heizlastrechner';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('gebaeude_list');
  if (error) return NextResponse.json({ fehler: error.message }, { status: 400 });
  return NextResponse.json({ gebaeude: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!originGueltig(req)) {
    return NextResponse.json({ fehler: 'Zugriff verweigert.' }, { status: 403 });
  }
  let body: {
    gebaeudeId?: unknown; kundenname?: unknown; objektadresse?: unknown;
    stammdaten?: unknown; eingaben?: unknown; ergebnis?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiges JSON im Request-Body.' }, { status: 400 });
  }
  const istObjekt = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (!istObjekt(body.eingaben) || !istObjekt(body.stammdaten ?? {}) || !istObjekt(body.ergebnis ?? {})) {
    return NextResponse.json({ fehler: 'Ungültiges Format im Request-Body.' }, { status: 400 });
  }
  const hatId = typeof body.gebaeudeId === 'string' && body.gebaeudeId.length > 0;
  if (!hatId && (typeof body.kundenname !== 'string' || typeof body.objektadresse !== 'string')) {
    return NextResponse.json({ fehler: 'Kundenname und Objektadresse fehlen.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: gebaeudeId, error: fehlerGebaeude } = await supabase.rpc('gebaeude_upsert', {
    p_id: hatId ? (body.gebaeudeId as string) : null,
    p_kundenname: hatId ? null : (body.kundenname as string),
    p_objektadresse: hatId ? null : (body.objektadresse as string),
    p_stammdaten: body.stammdaten ?? {},
  });
  if (fehlerGebaeude) return NextResponse.json({ fehler: fehlerGebaeude.message }, { status: 400 });

  const { data: knotenId, error: fehlerKnoten } = await supabase.rpc('gebaeude_knoten_upsert', {
    p_gebaeude_id: gebaeudeId,
    p_tool_slug: TOOL_SLUG,
    p_eingaben: body.eingaben,
    p_ergebnis: body.ergebnis ?? {},
  });
  if (fehlerKnoten) return NextResponse.json({ fehler: fehlerKnoten.message }, { status: 400 });
  return NextResponse.json({ gebaeudeId, knotenId });
}
