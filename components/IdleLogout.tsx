'use client';

import { useEffect } from 'react';

/**
 * Automatische Abmeldung nach 30 Minuten ohne Aktivitaet (Produktentscheidung,
 * Datenschutz: geteilte Rechner in Bueros, offene Tabs).
 *
 * Zwei Schichten arbeiten zusammen:
 * - Server: jede Middleware setzt den Cookie `ea_aktiv` (Zeitstempel der
 *   letzten Anfrage, Domain .energetisiert.de) und beendet die Session, wenn
 *   er aelter als 30 Minuten ist -- greift beim naechsten Klick auch dann,
 *   wenn dieser Timer nie gelaufen ist.
 * - Client (diese Komponente): ein offener, unbenutzter Tab meldet sich
 *   sichtbar ab, statt erst beim naechsten Klick auf eine Fehlerseite zu
 *   laufen. Vor dem Abmelden wird der Hub gefragt, ob in einem anderen Tab
 *   inzwischen gearbeitet wurde -- dann laeuft der Timer einfach weiter.
 *
 * Diese Datei wird unveraendert in alle Apps kopiert (kein Mono-Repo).
 */
const INAKTIVITAET_MAX_MS = 30 * 60 * 1000;
const HUB_URL = 'https://tools.energetisiert.de';

export function IdleLogout() {
  useEffect(() => {
    let letzteAktivitaet = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const aktivitaet = () => {
      letzteAktivitaet = Date.now();
    };

    const pruefen = async () => {
      const inaktivSeit = Date.now() - letzteAktivitaet;
      if (inaktivSeit < INAKTIVITAET_MAX_MS) {
        timer = setTimeout(pruefen, INAKTIVITAET_MAX_MS - inaktivSeit + 1000);
        return;
      }

      // Aktivitaet in anderen Tabs/Tools zaehlt mit: den Hub fragen.
      try {
        const res = await fetch(`${HUB_URL}/auth/inaktiv-status`, { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const status = (await res.json()) as { keineSession?: boolean; restMs?: number };
          if (status.keineSession) return; // gar nicht angemeldet (z.B. Login-Seite)
          if (typeof status.restMs === 'number' && status.restMs > 0) {
            letzteAktivitaet = Date.now() - (INAKTIVITAET_MAX_MS - status.restMs);
            timer = setTimeout(pruefen, status.restMs + 1000);
            return;
          }
        }
      } catch {
        // Netzfehler: lokaler Timer entscheidet.
      }

      window.location.assign(`${HUB_URL}/auth/logout?hinweis=inaktiv`);
    };

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'wheel'];
    for (const e of events) window.addEventListener(e, aktivitaet, { passive: true });
    timer = setTimeout(pruefen, INAKTIVITAET_MAX_MS + 1000);

    return () => {
      if (timer) clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, aktivitaet);
    };
  }, []);

  return null;
}
