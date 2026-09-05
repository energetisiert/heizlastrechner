import type { GebaeudeDetail, GebaeudeEintrag, GebaeudeStammdaten } from '@/lib/gebaeude/stammdaten';

/**
 * Client-seitiger Wrapper für das Studio-Gebäudemodell -- ruft die eigenen
 * /api/gebaeude-Routen auf statt Supabase direkt: die geteilte SSO-Cookie ist
 * httpOnly, ein Browser-Client hätte keine Session. Die Routen laufen
 * serverseitig mit dem Cookie-fähigen Client (lib/supabase/server.ts).
 */
async function fehlerAusAntwort(res: Response, standard: string): Promise<string> {
  try {
    const daten = await res.json();
    return daten?.fehler || standard;
  } catch {
    return standard;
  }
}

export async function gebaeudeListe(): Promise<GebaeudeEintrag[]> {
  const res = await fetch('/api/gebaeude');
  if (!res.ok) throw new Error(await fehlerAusAntwort(res, 'Laden fehlgeschlagen.'));
  return ((await res.json()).gebaeude ?? []) as GebaeudeEintrag[];
}

export async function gebaeudeHolen<TEingaben>(id: string): Promise<GebaeudeDetail<TEingaben>> {
  const res = await fetch(`/api/gebaeude/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await fehlerAusAntwort(res, 'Laden fehlgeschlagen.'));
  return (await res.json()) as GebaeudeDetail<TEingaben>;
}

export interface ImGebaeudeSpeichern {
  /** Vorhandenes Gebäude -- sonst wird mit Kundenname/Objektadresse ein neues angelegt. */
  gebaeudeId?: string;
  kundenname?: string;
  objektadresse?: string;
  stammdaten: Partial<GebaeudeStammdaten>;
  eingaben: unknown;
  ergebnis: Record<string, unknown>;
}

export async function imGebaeudeSpeichern(daten: ImGebaeudeSpeichern): Promise<{ gebaeudeId: string; knotenId: string }> {
  const res = await fetch('/api/gebaeude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(daten),
  });
  if (!res.ok) throw new Error(await fehlerAusAntwort(res, 'Speichern fehlgeschlagen.'));
  return (await res.json()) as { gebaeudeId: string; knotenId: string };
}

export async function gebaeudeLoeschen(id: string): Promise<void> {
  const res = await fetch(`/api/gebaeude/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await fehlerAusAntwort(res, 'Löschen fehlgeschlagen.'));
}

export async function knotenLoeschen(knotenId: string): Promise<void> {
  const res = await fetch(`/api/gebaeude/knoten/${encodeURIComponent(knotenId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await fehlerAusAntwort(res, 'Entfernen fehlgeschlagen.'));
}
