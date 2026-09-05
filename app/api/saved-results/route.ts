import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { originGueltig } from '@/lib/security/guards';

/**
 * GET/POST /api/saved-results -- "Gespeicherte Gebäude".
 *
 * Läuft über den serverseitigen Supabase-Client (liest die httpOnly-
 * Session-Cookie), NICHT über den Client-Browser-Client: die geteilte
 * SSO-Cookie ist bewusst httpOnly (siehe ssoCookieOptions), ein
 * Browser-Supabase-Client hat also gar keinen Zugriff auf die Session und
 * würde jede RPC anonym absenden. auth.uid() in den saved_results_*-RPCs
 * ist bereits der eigentliche Auth-Schutz -- kein BotID/Request-Token
 * nötig wie bei den anonym erreichbaren Lead-Formularen. Origin-Check nur
 * bei POST (mutierend, Browser schickt den Header zuverlaessig mit) --
 * nicht bei GET, siehe Kommentar dort.
 */
const TOOL_SLUG = 'heizlastrechner';

export async function GET() {
  // originGueltig() prueft den Origin-Header, den Browser nur bei
  // mutierenden Requests zuverlaessig mitschicken (siehe guards.ts) -- bei
  // einem gleichen-Origin GET fehlt er haeufig, der Check waere hier ein
  // Fehlalarm. auth.uid() in saved_results_list ist der eigentliche Schutz.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('saved_results_list', { p_tool_slug: TOOL_SLUG });
  if (error) {
    return NextResponse.json({ fehler: error.message }, { status: 400 });
  }
  return NextResponse.json({ ergebnisse: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!originGueltig(req)) {
    return NextResponse.json({ fehler: 'Zugriff verweigert.' }, { status: 403 });
  }

  let body: { kundenname?: unknown; objektadresse?: unknown; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiges JSON im Request-Body.' }, { status: 400 });
  }

  if (
    typeof body.kundenname !== 'string' ||
    typeof body.objektadresse !== 'string' ||
    typeof body.payload !== 'object' ||
    body.payload === null
  ) {
    return NextResponse.json({ fehler: 'Ungültiges Format im Request-Body.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('saved_results_create', {
    p_tool_slug: TOOL_SLUG,
    p_kundenname: body.kundenname,
    p_objektadresse: body.objektadresse,
    p_payload: body.payload,
  });
  if (error) {
    return NextResponse.json({ fehler: error.message }, { status: 400 });
  }
  return NextResponse.json({ id: data });
}
