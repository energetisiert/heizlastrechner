/**
 * Client-seitiger Wrapper für "Gespeicherte Gebäude" -- ruft bewusst die
 * eigenen /api/saved-results-Routen auf statt Supabase direkt: die geteilte
 * SSO-Session-Cookie ist httpOnly (siehe ssoCookieOptions), ein
 * Browser-Supabase-Client hat also keinen Zugriff darauf und würde jede RPC
 * anonym absenden. Die Route läuft serverseitig mit dem Cookie-fähigen
 * Supabase-Client (lib/supabase/server.ts).
 */
export interface GespeichertesErgebnis<TPayload> {
  id: string;
  kundenname: string;
  objektadresse: string;
  payload: TPayload;
  created_at: string;
}

async function fehlerAusAntwort(res: Response, standard: string): Promise<string> {
  try {
    const daten = await res.json();
    return daten?.fehler || standard;
  } catch {
    return standard;
  }
}

export async function gespeicherteErgebnisseLaden<TPayload>(): Promise<GespeichertesErgebnis<TPayload>[]> {
  const res = await fetch('/api/saved-results');
  if (!res.ok) throw new Error(await fehlerAusAntwort(res, 'Laden fehlgeschlagen.'));
  const daten = await res.json();
  return (daten.ergebnisse ?? []) as GespeichertesErgebnis<TPayload>[];
}

export async function ergebnisSpeichern(kundenname: string, objektadresse: string, payload: unknown): Promise<string> {
  const res = await fetch('/api/saved-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kundenname, objektadresse, payload }),
  });
  if (!res.ok) throw new Error(await fehlerAusAntwort(res, 'Speichern fehlgeschlagen.'));
  const daten = await res.json();
  return daten.id as string;
}

export async function ergebnisLoeschen(id: string): Promise<void> {
  const res = await fetch(`/api/saved-results/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await fehlerAusAntwort(res, 'Löschen fehlgeschlagen.'));
}
