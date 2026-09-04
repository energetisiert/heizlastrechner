/**
 * Start-Pruefung der Konfiguration.
 *
 * Next.js ruft register() genau einmal beim BOOT des Servers auf -- nicht
 * waehrend `next build`. Das ist der einzige Ort, an dem eine fehlende
 * Env-Variable auffallen kann, ohne den Build zu brechen.
 *
 * Warum: die Security-Schichten sind bewusst fail-open gebaut (ein fehlendes
 * Secret schaltet die betroffene Schicht ab, statt den Rechner lahmzulegen).
 * Der Preis dafuer ist, dass eine unvollstaendige Konfiguration sonst voellig
 * lautlos bleibt -- der Rechner laeuft, aber ohne Rate-Limit bzw. mit einem
 * pro Instanz neu erzeugten Token-Secret. Genau das hat beim Foerderrechner
 * einen halben Tag Suche gekostet. Deshalb hier einmal laut beim Start.
 *
 * Bewusst nur Meldungen, kein Abbruch: anders als bei einem Bezahl-Flow ist
 * hier kein Wert faelschbar, wenn ein Secret fehlt -- die uebrigen Schichten
 * (Origin, Honeypot, BotID) greifen unabhaengig davon weiter.
 */

export async function register(): Promise<void> {
  // Nur die Node-Laufzeit; im Edge-Runtime liefe das ein zweites Mal gegen
  // eine andere Modul-Instanz.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production') return;

  const meldungen: string[] = [];

  if (!process.env.IP_SALT) {
    meldungen.push(
      'IP_SALT ist nicht gesetzt -- das Rate-Limiting wird uebersprungen (die IP ' +
        'wird bewusst nicht mit einem im Quellcode sichtbaren Ersatz-Salt gehasht). ' +
        'Erzeugen mit: openssl rand -hex 32',
    );
  }
  if (!process.env.REQUEST_TOKEN_SECRET) {
    meldungen.push(
      'REQUEST_TOKEN_SECRET ist nicht gesetzt -- jede Serverinstanz erzeugt sich ein ' +
        'eigenes Zufalls-Secret. Die Request-Tokens sind dann instanzgebunden, und ' +
        'der Client muss bei jedem Instanzwechsel ein frisches Token nachholen. ' +
        'Erzeugen mit: openssl rand -hex 32',
    );
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    meldungen.push(
      'NEXT_PUBLIC_SUPABASE_URL bzw. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY fehlt -- ' +
        'Zugriffskontrolle und persistentes Rate-Limiting sind ohne diese Werte nicht moeglich.',
    );
  }

  for (const meldung of meldungen) {
    console.error(`[start] ${meldung}`);
  }
}
