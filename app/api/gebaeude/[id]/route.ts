import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { originGueltig } from '@/lib/security/guards';

/** GET: ein Gebäude komplett (gebaeude_get); DELETE: Gebäude samt aller Knoten (gebaeude_delete). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('gebaeude_get', { p_id: id });
  if (error) return NextResponse.json({ fehler: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!originGueltig(req)) {
    return NextResponse.json({ fehler: 'Zugriff verweigert.' }, { status: 403 });
  }
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.rpc('gebaeude_delete', { p_id: id });
  if (error) return NextResponse.json({ fehler: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
