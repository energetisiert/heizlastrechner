'use client';

import { useState } from 'react';
import {
  gebaeudeHolen, gebaeudeListe, gebaeudeLoeschen, imGebaeudeSpeichern, knotenLoeschen,
} from '@/lib/supabase/gebaeude';
import type { GebaeudeEintrag, GebaeudeStammdaten } from '@/lib/gebaeude/stammdaten';

/**
 * "Im Gebäude speichern" -- Studio-Gebäudemodell (Phase 1). Ein Gebäude wird
 * einmal angelegt (Kundenname, Objektadresse); jedes Tool hängt seinen
 * kompletten Eingabezustand als Knoten daran (ein Knoten je Tool, wird beim
 * erneuten Speichern ersetzt) und schreibt seine Stammdaten-Felder zurück.
 * Pro Tool kopierte Komponente (bewusst kein geteiltes Monorepo-Paket);
 * `TPayload` ist der Eingabezustand des jeweiligen Tools, das Ergebnis wird
 * nach dem Laden neu gerechnet.
 */
const TOOL_KURZ: Record<string, string> = {
  heizlastrechner: 'HL', 'heizlastrechner-gep': 'HG', foerderrechner: 'FH', gebaeudeabgrenzung: 'GA',
  'co2-rechner': 'CO', sanierungsrechner: 'SW', foerderstrategie: 'FS',
};

export function GebaeudeSpeichern<TPayload>({
  toolSlug, aktuellesPayload, onLaden, stammdaten, ergebnis, aktivesGebaeudeId,
}: {
  toolSlug: string;
  aktuellesPayload: TPayload;
  onLaden: (payload: TPayload) => void;
  stammdaten: Partial<GebaeudeStammdaten>;
  ergebnis: Record<string, unknown>;
  /** Über ?gebaeude=<id> geöffnetes Gebäude -- steht oben und ist als "geöffnet" markiert. */
  aktivesGebaeudeId?: string | null;
}) {
  const [offen, setOffen] = useState(false);
  const [liste, setListe] = useState<GebaeudeEintrag[] | null>(null);
  const [ladeFehler, setLadeFehler] = useState('');
  const [kundenname, setKundenname] = useState('');
  const [objektadresse, setObjektadresse] = useState('');
  const [speichernFehler, setSpeichernFehler] = useState('');
  const [sendet, setSendet] = useState(false);

  async function listeAktualisieren() {
    try {
      const liste = await gebaeudeListe();
      setListe([...liste].sort((a, b) => (a.id === aktivesGebaeudeId ? -1 : b.id === aktivesGebaeudeId ? 1 : 0)));
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
    setListe(null);
    void listeAktualisieren();
  }

  async function speichernIn(gebaeudeId?: string) {
    if (!gebaeudeId && (!kundenname.trim() || !objektadresse.trim())) {
      setSpeichernFehler('Bitte Kundenname und Objektadresse angeben.');
      return;
    }
    setSpeichernFehler('');
    setSendet(true);
    try {
      await imGebaeudeSpeichern({
        gebaeudeId,
        kundenname: gebaeudeId ? undefined : kundenname.trim(),
        objektadresse: gebaeudeId ? undefined : objektadresse.trim(),
        stammdaten,
        eingaben: aktuellesPayload,
        ergebnis,
      });
      setOffen(false);
    } catch (e) {
      setSpeichernFehler((e as Error).message);
    } finally {
      setSendet(false);
    }
  }

  async function laden(g: GebaeudeEintrag) {
    setLadeFehler('');
    try {
      const detail = await gebaeudeHolen<TPayload>(g.id);
      const knoten = detail.knoten.find((k) => k.tool_slug === toolSlug);
      if (!knoten) {
        setLadeFehler('An diesem Gebäude ist für dieses Tool noch nichts gespeichert.');
        return;
      }
      onLaden(knoten.eingaben);
      setOffen(false);
    } catch (e) {
      setLadeFehler((e as Error).message);
    }
  }

  async function knotenEntfernen(g: GebaeudeEintrag) {
    const knoten = g.knoten.find((k) => k.tool_slug === toolSlug);
    if (!knoten) return;
    try {
      await knotenLoeschen(knoten.id);
      await listeAktualisieren();
    } catch (e) {
      setLadeFehler((e as Error).message);
    }
  }

  async function gebaeudeEntfernen(g: GebaeudeEintrag) {
    if (!window.confirm(`Gebäude „${g.kundenname}“ mit allen gespeicherten Berechnungen löschen?`)) return;
    try {
      await gebaeudeLoeschen(g.id);
      setListe((prev) => prev?.filter((e) => e.id !== g.id) ?? null);
    } catch (e) {
      setLadeFehler((e as Error).message);
    }
  }

  return (
    <>
      <button type="button" className="btn-ghost" onClick={oeffnen}>Im Gebäude speichern</button>

      {offen && (
        <div className="modal-backdrop" onClick={() => setOffen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-kopf">
              <h2>Im Gebäude speichern</h2>
              <button type="button" className="modal-schliessen" onClick={() => setOffen(false)} aria-label="Schließen">×</button>
            </div>
            <p className="f-hilfe" style={{ marginBottom: 10 }}>
              Ein Gebäude einmal anlegen, alle Tools daran anknüpfen. Gespeichert wird der komplette Eingabezustand dieses Tools;
              das Ergebnis wird beim Laden neu gerechnet.
            </p>

            {ladeFehler && <div className="flag error" style={{ marginBottom: 11 }}>{ladeFehler}</div>}
            {liste === null && !ladeFehler && <p className="f-hilfe">Lädt …</p>}
            {liste !== null && liste.length === 0 && <p className="f-hilfe">Noch keine Gebäude angelegt.</p>}
            {liste !== null && liste.length > 0 && (
              <div className="gespeichert-liste">
                {liste.map((g) => {
                  const eigener = g.knoten.some((k) => k.tool_slug === toolSlug);
                  return (
                    <div className="gespeichert-item" key={g.id}>
                      <div className="gi-info">
                        <strong>
                          {g.kundenname}
                          {g.id === aktivesGebaeudeId && <span className="gi-badge aktiv" style={{ marginLeft: 6 }}>geöffnet</span>}
                        </strong>
                        <span>{g.objektadresse}</span>
                        <span className="gi-badges">
                          {g.knoten.length === 0 && <span className="gi-datum">noch ohne Berechnung</span>}
                          {g.knoten.map((k) => (
                            <span key={k.id} className={`gi-badge${k.tool_slug === toolSlug ? ' aktiv' : ''}`} title={k.tool_slug}>
                              {TOOL_KURZ[k.tool_slug] ?? k.tool_slug}
                            </span>
                          ))}
                        </span>
                      </div>
                      <div className="gi-aktionen">
                        {eigener && <button type="button" className="link-btn" onClick={() => laden(g)}>Laden</button>}
                        <button type="button" className="link-btn" disabled={sendet} onClick={() => speichernIn(g.id)}>
                          {eigener ? 'Aktualisieren' : 'Hier speichern'}
                        </button>
                        {eigener && <button type="button" className="link-btn link-btn-warn" onClick={() => knotenEntfernen(g)}>Entfernen</button>}
                        {!eigener && <button type="button" className="link-btn link-btn-warn" onClick={() => gebaeudeEntfernen(g)}>Löschen</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <hr style={{ border: 0, borderTop: '1px solid var(--b08)', margin: '16px 0' }} />
            <div className="kicker" style={{ marginBottom: 8 }}>Neues Gebäude anlegen</div>
            <div className="feld" style={{ marginBottom: 10 }}>
              <label className="f-titel" htmlFor="gsKundenname">Kundenname</label>
              <input id="gsKundenname" type="text" value={kundenname} onChange={(e) => setKundenname(e.target.value)} />
            </div>
            <div className="feld" style={{ marginBottom: 10 }}>
              <label className="f-titel" htmlFor="gsObjektadresse">Objektadresse</label>
              <input id="gsObjektadresse" type="text" placeholder="Straße, Hausnummer, PLZ, Ort" value={objektadresse} onChange={(e) => setObjektadresse(e.target.value)} />
            </div>
            <button type="button" className="btn-outline-block" disabled={sendet} onClick={() => speichernIn()}>
              {sendet ? 'Wird gespeichert …' : 'Anlegen und speichern'}
            </button>
            {speichernFehler && <div className="flag error" style={{ marginTop: 11 }}>{speichernFehler}</div>}
          </div>
        </div>
      )}
    </>
  );
}
