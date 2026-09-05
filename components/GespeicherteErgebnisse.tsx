'use client';

import { useState } from 'react';
import {
  gespeicherteErgebnisseLaden, ergebnisSpeichern, ergebnisLoeschen, type GespeichertesErgebnis,
} from '@/lib/supabase/saved-results';

/**
 * Gespeicherte Gebäude -- pro Tool kopierte Komponente (bewusst kein
 * geteiltes Monorepo-Paket, konsistent mit proxy-guard.ts/cookie-options.ts).
 * `TPayload` ist der komplette Eingabezustand des jeweiligen Tools (nicht das
 * Ergebnis -- das wird nach dem Laden ganz normal neu berechnet).
 *
 * Auslöser ist ein einzelner Button ("Gebäude speichern") direkt unter
 * "Ergebnis als PDF sichern"; erst der Klick öffnet das Extrafenster mit der
 * Liste bereits gespeicherter Gebäude (Laden/Löschen) und dem Speichern-
 * Formular (Kundenname, Objektadresse) -- kein dauerhaft sichtbarer Bereich.
 */
export function GespeicherteErgebnisse<TPayload>({
  aktuellesPayload, onLaden,
}: {
  aktuellesPayload: TPayload;
  onLaden: (payload: TPayload) => void;
}) {
  const [offen, setOffen] = useState(false);
  const [liste, setListe] = useState<GespeichertesErgebnis<TPayload>[] | null>(null);
  const [ladeFehler, setLadeFehler] = useState('');

  const [kundenname, setKundenname] = useState('');
  const [objektadresse, setObjektadresse] = useState('');
  const [speichernFehler, setSpeichernFehler] = useState('');
  const [sendet, setSendet] = useState(false);

  async function listeAktualisieren() {
    try {
      setListe(await gespeicherteErgebnisseLaden<TPayload>());
      setLadeFehler('');
    } catch (e) {
      setLadeFehler((e as Error).message);
    }
  }

  function oeffnen() {
    setOffen(true);
    setSpeichernFehler('');
    setKundenname('');
    setObjektadresse('');
    // Immer neu laden, nicht nur beim ersten Öffnen -- sonst zeigt ein
    // erneutes Öffnen nach dem Speichern noch den alten (leeren) Stand.
    listeAktualisieren();
  }

  async function speichern() {
    if (!kundenname.trim() || !objektadresse.trim()) {
      setSpeichernFehler('Bitte Kundenname und Objektadresse angeben.');
      return;
    }
    setSpeichernFehler('');
    setSendet(true);
    try {
      await ergebnisSpeichern(kundenname.trim(), objektadresse.trim(), aktuellesPayload);
      setOffen(false);
    } catch (e) {
      setSpeichernFehler((e as Error).message);
    } finally {
      setSendet(false);
    }
  }

  async function loeschen(id: string) {
    try {
      await ergebnisLoeschen(id);
      setListe((prev) => prev?.filter((e) => e.id !== id) ?? null);
    } catch (e) {
      setLadeFehler((e as Error).message);
    }
  }

  function laden(payload: TPayload) {
    onLaden(payload);
    setOffen(false);
  }

  return (
    <>
      <button type="button" className="btn-ghost" onClick={oeffnen}>Gebäude speichern</button>

      {offen && (
        <div className="modal-backdrop" onClick={() => setOffen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-kopf">
              <h2>Gebäude speichern</h2>
              <button type="button" className="modal-schliessen" onClick={() => setOffen(false)} aria-label="Schließen">×</button>
            </div>

            {ladeFehler && <div className="flag error" style={{ marginBottom: 11 }}>{ladeFehler}</div>}
            {liste === null && !ladeFehler && <p className="f-hilfe">Lädt …</p>}
            {liste !== null && liste.length === 0 && <p className="f-hilfe">Noch keine gespeicherten Gebäude.</p>}
            {liste !== null && liste.length > 0 && (
              <div className="gespeichert-liste">
                {liste.map((e) => (
                  <div className="gespeichert-item" key={e.id}>
                    <div className="gi-info">
                      <strong>{e.kundenname}</strong>
                      <span>{e.objektadresse}</span>
                      <span className="gi-datum">{new Date(e.created_at).toLocaleDateString('de-DE')}</span>
                    </div>
                    <div className="gi-aktionen">
                      <button type="button" className="link-btn" onClick={() => laden(e.payload)}>Laden</button>
                      <button type="button" className="link-btn link-btn-warn" onClick={() => loeschen(e.id)}>Löschen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <hr style={{ border: 0, borderTop: '1px solid var(--b08)', margin: '16px 0' }} />

            <div className="feld" style={{ marginBottom: 10 }}>
              <label className="f-titel" htmlFor="gsKundenname">Kundenname</label>
              <input id="gsKundenname" type="text" value={kundenname} onChange={(e) => setKundenname(e.target.value)} />
            </div>
            <div className="feld" style={{ marginBottom: 10 }}>
              <label className="f-titel" htmlFor="gsObjektadresse">Objektadresse</label>
              <input id="gsObjektadresse" type="text" placeholder="Straße, Hausnummer, PLZ, Ort" value={objektadresse} onChange={(e) => setObjektadresse(e.target.value)} />
            </div>
            <button type="button" className="btn-outline-block" disabled={sendet} onClick={speichern}>
              {sendet ? 'Wird gespeichert …' : 'Speichern'}
            </button>
            {speichernFehler && <div className="flag error" style={{ marginTop: 11 }}>{speichernFehler}</div>}
          </div>
        </div>
      )}
    </>
  );
}
