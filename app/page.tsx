'use client';

import { useEffect, useRef, useState } from 'react';
import IconSprite, { Icon } from '@/components/IconSprite';
import { BAUALTERSKLASSEN } from '@/lib/heizlast/logik.js';
import {
  BAUJAHR_LABEL, BAUJAHR_NOTE, ENERGIETRAEGER, ENERGIETRAEGER_EINHEIT, ENERGIETRAEGER_HINWEIS, NUTZUNGSGRAD,
  KLIMAJAHRE, BAUTEIL_BASIS, DACH_VARIANTEN, BODEN_VARIANTEN, GEBAEUDETYP_KACHELN, DACH_KACHELN, KELLER_KACHELN,
  LUEFTUNG_KACHELN, TWW_KACHELN, VERHALTEN_KACHELN, EXTRAS_KACHELN, HG_KACHELN, ANLASS_KACHELN, ZEITRAUM_KACHELN,
  Kachel, Kacheln, daemmGrafik, fmt
} from '@/components/HeizlastBausteine';

/* ============================================================================
   Typen fuer die API-Antwort (locker typisiert, siehe lib/heizlast/logik.ts)
   ========================================================================= */
interface BedarfPosition { key: string; label: string; verlustW: number; anteil: number }
interface BedarfErgebnis {
  gebaeudeheizlastKW: number; spezifischWproM2: number; normAussentemperatur: number;
  warmwasserKW: number; gesamtKW: number; wpEmpfehlung: { min: number; max: number };
  positionen: BedarfPosition[]; hinweise: string[];
}
interface VerbrauchErgebnis {
  gebaeudeheizlastKW: number; spezifischWproM2: number | null; normAussentemperatur: number;
  warmwasserKW: number; gesamtKW: number; wpEmpfehlung: { min: number; max: number };
  endenergieKWh: number; nutzwaermeKWh: number; trinkwarmwasserKWh: number; raumwaermeKWh: number;
  vollbenutzungsstunden: number; hinweise: string[];
}
interface Vergleich {
  bedarfKW: number; verbrauchKW: number; abweichungProzent: number; ampel: 'gruen' | 'gelb' | 'rot';
  text: string; empfehlung: string; empfehlungAuslegungKW: { min: number; max: number };
}
interface WpEignung { stufe: string; ampel: string; titel: string; text: string; heizflaechen: string }
interface Lead {
  punkte: number; dringlichkeit: 'hoch' | 'mittel' | 'niedrig';
  gruende: { code: string; text: string }[]; ueberschrift: string;
  preis: { netto: number; brutto: number }; preisText: string;
}
interface ApiAntwort {
  bedarf?: BedarfErgebnis; verbrauch?: VerbrauchErgebnis; vergleich?: Vergleich | null;
  wpEignung?: WpEignung | null; lead?: Lead | null; fehler?: string;
}

/* ============================================================================
   Hauptkomponente
   ========================================================================= */

export default function Home() {
  const [tab, setTab] = useState<'bedarf' | 'verbrauch' | 'abgleich' | 'vorort'>('bedarf');

  const [bTyp, setBTyp] = useState('efh');
  const [bJahrIdx, setBJahrIdx] = useState(3);
  const baualter = BAUALTERSKLASSEN[bJahrIdx];
  const [bPlz, setBPlz] = useState('90762');
  const [bTeManuell, setBTeManuell] = useState('');
  const [bWfl, setBWfl] = useState('150');
  const [bGesch, setBGesch] = useState('2');
  const [bHoehe, setBHoehe] = useState('2.5');
  const [bPers, setBPers] = useState('4');
  const [bNE, setBNE] = useState('1');
  const [bDach, setBDach] = useState('steilUnbeheizt');
  const [bKeller, setBKeller] = useState('keller');
  const [bLueftungWRG, setBLueftungWRG] = useState(false);
  const [stufen, setStufen] = useState({ aussenwand: 'unsaniert', dach: 'unsaniert', fenster: 'unsaniert', boden: 'unsaniert' });
  const [iBaujahrOffen, setIBaujahrOffen] = useState(false);
  const [bBaujahrZahl, setBBaujahrZahl] = useState('');

  const [vJahr, setVJahr] = useState('2025');
  const [vTraeger, setVTraeger] = useState('erdgas_m3');
  const [vMenge, setVMenge] = useState('2800');
  const [vErzeuger, setVErzeuger] = useState('niedertemperatur');
  const [vNutzungsgrad, setVNutzungsgrad] = useState('');
  const [vTwwArt, setVTwwArt] = useState('zentral');
  const [vVerhalten, setVVerhalten] = useState('normal');
  const [vZirkulation, setVZirkulation] = useState(false);
  const [vSolar, setVSolar] = useState(false);
  const [vHg, setVHg] = useState('15');
  const [vVbh, setVVbh] = useState('');

  const [kAnlass, setKAnlass] = useState('waermepumpe');
  const [kZeitraum, setKZeitraum] = useState('bald');
  const [kName, setKName] = useState('');
  const [kTel, setKTel] = useState('');
  const [kMail, setKMail] = useState('');
  const [kAdresse, setKAdresse] = useState('');
  const [kNachricht, setKNachricht] = useState('');
  const [kDsgvo, setKDsgvo] = useState(false);
  const [kFehler, setKFehler] = useState('');
  const [kGesendet, setKGesendet] = useState(false);
  const [kSendet, setKSendet] = useState(false);

  const [erg, setErg] = useState<ApiAntwort>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bTeInfo, setBTeInfo] = useState('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const body = {
        bedarf: {
          plz: bPlz, normAussentempManuell: bTeManuell === '' ? null : parseFloat(bTeManuell),
          gebaeudetyp: bTyp, baualter,
          wohnflaeche: parseFloat(bWfl) || 0, geschosse: parseFloat(bGesch) || 1,
          raumhoehe: parseFloat(bHoehe) || 2.5, nutzungseinheiten: parseFloat(bNE) || 1,
          personen: parseFloat(bPers) || 1, dachform: bDach, unterkellert: bKeller,
          lueftungWRG: bLueftungWRG, stufen
        },
        verbrauch: {
          plz: bPlz, energietraeger: vTraeger, verbrauch: parseFloat(vMenge) || 0,
          verbrauchsjahr: vJahr ? parseInt(vJahr, 10) : null, erzeuger: vErzeuger,
          nutzungsgradManuell: vNutzungsgrad === '' ? null : parseFloat(vNutzungsgrad),
          twwSeparat: vTwwArt === 'separat', personen: parseFloat(bPers) || 1,
          nutzungseinheiten: parseFloat(bNE) || 1, nutzerverhalten: vVerhalten,
          zirkulation: vZirkulation, solarthermie: vSolar, heizgrenztemperatur: parseInt(vHg, 10),
          vollbenutzungsstundenManuell: vVbh === '' ? null : parseFloat(vVbh), wohnflaeche: parseFloat(bWfl) || 0
        },
        kontext: { foerderung: kAnlass === 'foerderung' || kAnlass === 'waermepumpe', hydraulischerAbgleich: kAnlass === 'abgleich' }
      };
      try {
        const res = await fetch('/api/heizlast/berechnen', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const daten = await res.json();
        setErg(daten);
      } catch {
        setErg({});
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [bPlz, bTeManuell, bTyp, baualter, bWfl, bGesch, bHoehe, bNE, bPers, bDach, bKeller, bLueftungWRG, stufen,
    vTraeger, vMenge, vJahr, vErzeuger, vNutzungsgrad, vTwwArt, vVerhalten, vZirkulation, vSolar, vHg, vVbh, kAnlass]);

  useEffect(() => {
    const s = bPlz.trim();
    if (!/^\d{5}$/.test(s)) { setBTeInfo('Fünfstellige Postleitzahl eingeben.'); return; }
    const tabelle: Record<string, number> = { '0': -14, '1': -12, '2': -10, '3': -12, '4': -10, '5': -10, '6': -12, '7': -12, '8': -16, '9': -14 };
    const te = tabelle[s.charAt(0)] ?? -12;
    setBTeInfo(`Am kältesten Tag rechnen wir mit ${te} °C Außentemperatur.`);
  }, [bPlz]);

  const aktivesVerfahren: 'bedarf' | 'verbrauch' | null = erg.bedarf?.gebaeudeheizlastKW ? 'bedarf' : (erg.verbrauch ? 'verbrauch' : null);
  const aktuellesErg = aktivesVerfahren === 'bedarf' ? erg.bedarf : erg.verbrauch;
  const gezeigtesErg = tab === 'bedarf' ? erg.bedarf : tab === 'verbrauch' ? erg.verbrauch : aktuellesErg;

  function bauteilDef(key: 'aussenwand' | 'fenster' | 'dach' | 'boden') {
    if (key === 'dach') return bDach === 'steilUnbeheizt' ? DACH_VARIANTEN.obersteGeschossdecke : DACH_VARIANTEN.dach;
    if (key === 'boden') return bKeller === 'erdreich' ? BODEN_VARIANTEN.bodenErdreich : BODEN_VARIANTEN.kellerdecke;
    return BAUTEIL_BASIS[key];
  }

  function jahrZuBaualtersIndex(jahr: number) {
    if (jahr < 1919) return 0;
    if (jahr <= 1948) return 1;
    if (jahr <= 1957) return 2;
    if (jahr <= 1968) return 3;
    if (jahr <= 1978) return 4;
    if (jahr <= 1983) return 5;
    if (jahr <= 1994) return 6;
    if (jahr <= 2001) return 7;
    if (jahr <= 2015) return 8;
    return 9;
  }

  function markerPct(kw: number | undefined) {
    if (!kw) return 0;
    return Math.max(0, Math.min(100, ((kw - 4) / 26) * 100));
  }

  function renderWpAmpel(e: WpEignung | null | undefined) {
    if (!e) return null;
    const farbe = e.stufe === 'sehr_gut' || e.stufe === 'gut' ? 'mint' : 'warm';
    return (
      <div className={`wpampel ${farbe}`}>
        <div className="wpampel-kopf"><span className="punkt" /><strong>Wärmepumpe: {e.titel}</strong></div>
        <p>{e.text}</p>
        <div className="hf">{e.heizflaechen}</div>
      </div>
    );
  }

  function renderAufschluesselung() {
    if (!gezeigtesErg) return null;
    if (aktivesVerfahren === 'verbrauch' && erg.verbrauch && tab !== 'bedarf') {
      const v = erg.verbrauch; const basis = v.endenergieKWh || 1;
      const zeile = (name: string, wert: string, anteil: number) => (
        <div className="pos" key={name}><span className="nm">{name}</span>
          <span className="bal"><i style={{ width: `${Math.max(0, Math.min(100, anteil))}%` }} /></span>
          <span className="vw">{wert}</span></div>
      );
      return <div className="aufschluesselung">
        {zeile('Endenergie', `${fmt(v.endenergieKWh, 0)} kWh`, 100)}
        {zeile('davon Nutzwärme', `${fmt(v.nutzwaermeKWh, 0)} kWh`, (v.nutzwaermeKWh / basis) * 100)}
        {zeile('abzgl. Warmwasser', `-${fmt(v.trinkwarmwasserKWh, 0)} kWh`, (v.trinkwarmwasserKWh / basis) * 100)}
        {zeile('Raumwärme', `${fmt(v.raumwaermeKWh, 0)} kWh`, (v.raumwaermeKWh / basis) * 100)}
        {zeile('geteilt durch', `${v.vollbenutzungsstunden} h/a`, 0)}
      </div>;
    }
    if (erg.bedarf && tab !== 'verbrauch') {
      const sorted = [...erg.bedarf.positionen].sort((a, b) => b.verlustW - a.verlustW);
      return <div className="aufschluesselung">
        {sorted.map((p) => (
          <div className="pos" key={p.key}><span className="nm">{p.label}</span>
            <span className="bal"><i style={{ width: `${Math.max(0, Math.min(100, p.anteil))}%` }} /></span>
            <span className="vw">{fmt(p.verlustW / 1000, 2)} kW</span></div>
        ))}
      </div>;
    }
    return null;
  }

  function renderHinweise() {
    if (!gezeigtesErg?.hinweise?.length) return null;
    return <div>{gezeigtesErg.hinweise.map((h, i) => {
      const norm = /BEG|DIN/.test(h);
      return <div key={i} className={`flag ${norm ? 'info' : 'warn'}`} style={{ marginTop: 11 }}>{h}</div>;
    })}</div>;
  }

  function uebernommeneDaten() {
    if (!gezeigtesErg) return null;
    const typLabel = GEBAEUDETYP_KACHELN.find((k) => k.v === bTyp)?.l ?? 'Gebäude';
    const zeilen: [string, string][] = [
      ['Gebäude', `${typLabel}, ${BAUJAHR_LABEL[baualter]}`],
      ['Wohnfläche', `${bWfl || '?'} m², ${bGesch || '?'} Geschosse`],
      ['Heizlast überschlägig', `${fmt(gezeigtesErg.gebaeudeheizlastKW)} kW`],
      ['Je Quadratmeter', gezeigtesErg.spezifischWproM2 === null ? '–' : `${fmt(gezeigtesErg.spezifischWproM2)} W/m²`]
    ];
    if (erg.vergleich) zeilen.push(['Abgleich', `${fmt(erg.vergleich.abweichungProzent)} % Abweichung`]);
    return (
      <div className="uebernommen">
        <strong>Diese Angaben schicken wir mit</strong>
        <dl>{zeilen.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </div>
    );
  }

  async function absenden() {
    const fehlerListe: string[] = [];
    if (!kName.trim()) fehlerListe.push('Name');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(kMail.trim())) fehlerListe.push('gültige E-Mail-Adresse');
    if (!kAdresse.trim()) fehlerListe.push('Objektadresse');
    if (!kDsgvo) fehlerListe.push('Einwilligung zum Datenschutz');
    if (fehlerListe.length) { setKFehler(`Bitte noch ergänzen: ${fehlerListe.join(', ')}.`); return; }
    setKFehler(''); setKSendet(true);
    try {
      const res = await fetch('/api/heizlast/anfrage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: kName, email: kMail, telefon: kTel, objektAdresse: kAdresse,
          anlass: kAnlass, zeitraum: kZeitraum, nachricht: kNachricht, dsgvoZugestimmt: kDsgvo,
          eingabenBedarf: { plz: bPlz, gebaeudetyp: bTyp, baualter, wohnflaeche: bWfl },
          ergebnisBedarf: erg.bedarf ?? null, ergebnisVerbrauch: erg.verbrauch ?? null,
          leadPunkte: erg.lead?.punkte ?? null
        })
      });
      const daten = await res.json();
      if (!res.ok) { setKFehler(daten.fehler || 'Unbekannter Fehler.'); setKSendet(false); return; }
      setKGesendet(true);
    } catch {
      setKFehler('Anfrage konnte nicht gesendet werden. Bitte später erneut versuchen.');
    } finally {
      setKSendet(false);
    }
  }

  function AngebotBlock({ kompakt = false }: { kompakt?: boolean }) {
    if (!erg.lead) return null;
    const l = erg.lead;
    return (
      <div className="angebot">
        <span className="eyebrow kicker">{kompakt ? 'Nächster Schritt' : 'Leistung von energetisiert.'}</span>
        <h2>{l.ueberschrift}</h2>
        {!kompakt && <p className="lead">Wir kommen zu dir, nehmen jeden beheizten Raum auf und rechnen die Heizlast raumweise nach DIN EN 12831. Das Ergebnis ist förderfähig, haftungsbewehrt und die Grundlage für Heizflächenauslegung und hydraulischen Abgleich.</p>}
        {l.gruende.slice(0, kompakt ? 1 : 2).map((g) => <div className="anlass" key={g.code}>{g.text}</div>)}
        <div className="ablaufzeile">2 bis 3 Stunden vor Ort · Bericht in 5 Arbeitstagen</div>
        {!kompakt && (
          <ul className="umfang">
            {['Vor-Ort-Termin mit Aufmaß aller beheizten Räume', 'Raumweise Heizlastberechnung nach DIN EN 12831-1',
              'Auslegung der Heizflächen und Prüfung der Vorlauftemperatur', 'Datenblatt für den hydraulischen Abgleich Verfahren B',
              'Vollständige Dokumentation für BAFA- und KfW-Anträge'].map((u) => (
              <li key={u}><Icon id="ic-haken" w={16} h={16} /><span>{u}</span></li>
            ))}
          </ul>
        )}
        <button className="btn-light" onClick={() => setTab('vorort')}>{kompakt ? 'Vor Ort berechnen lassen' : 'Termin anfragen'}</button>
      </div>
    );
  }

  const punktKlasse = erg.vergleich ? (erg.vergleich.ampel === 'gruen' ? 'gut' : erg.vergleich.ampel === 'gelb' ? 'warn' : 'kritisch') : '';
  const flagKlasse = erg.vergleich ? (erg.vergleich.ampel === 'gruen' ? 'quiet' : erg.vergleich.ampel === 'gelb' ? 'warn' : 'error') : '';

  return (
    <div>
      <IconSprite />
      <header className="top">
        <div className="top-bar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/energetisiert-logo.png" alt="energetisiert." className="logo-img" />
        </div>
      </header>

      <div className="hero">
        <h1>Heizlastrechner</h1>
        <p className="lead">Wie viel Heizleistung braucht dein Gebäude wirklich? Rechne über die Gebäudehülle, über deinen Verbrauch, oder beides und vergleiche. Kostenlos, ohne Anmeldung, als PDF zum Mitnehmen.</p>
      </div>

      <nav className="tabnav" role="tablist">
        <button className="tab" role="tab" aria-selected={tab === 'bedarf'} onClick={() => setTab('bedarf')}>Nach Gebäude<span className="n">1</span></button>
        <button className="tab" role="tab" aria-selected={tab === 'verbrauch'} onClick={() => setTab('verbrauch')}>Nach Verbrauch<span className="n">2</span></button>
        <button className="tab" role="tab" aria-selected={tab === 'abgleich'} onClick={() => setTab('abgleich')}>Abgleich</button>
        <button className="tab" role="tab" aria-selected={tab === 'vorort'} onClick={() => setTab('vorort')}>Vor Ort berechnen</button>
      </nav>

      <div className="wrap">
        <div className="spalten">
          <main>
            {tab === 'bedarf' && (
              <section>
                <div className="card">
                  <div className="card-kopf"><span className="num">1</span><h2>Wie wohnst du?</h2></div>
                  <p className="card-unter">Der Gebäudetyp bestimmt, wie viel Außenfläche Wärme verliert.</p>
                  <div className="feld"><Kacheln>
                    {GEBAEUDETYP_KACHELN.map((k) => <Kachel key={k.v} {...k} aktiv={bTyp === k.v} onClick={() => setBTyp(k.v)} />)}
                  </Kacheln></div>

                  <div className="feld">
                    <label className="f-titel">Baujahr
                      <button className="btn-add" style={{ padding: '1px 8px', fontSize: 10.5, marginLeft: 4, borderRadius: 8, minHeight: 'auto' }}
                        type="button" onClick={() => setIBaujahrOffen(!iBaujahrOffen)}>?</button>
                    </label>
                    {iBaujahrOffen && <div className="flag quiet" style={{ margin: '6px 0 10px' }}>Das Baujahr legt fest, welche Bauteile im Ursprungszustand angenommen werden. Sanierungen stellst du gleich einzeln um. Bei einem Anbau zählt das Jahr des größten Gebäudeteils.</div>}
                    <div className="jahr-kopf">
                      <span className="zahl jw">{BAUJAHR_LABEL[baualter]}</span>
                      <span className="jn">{BAUJAHR_NOTE[baualter]}</span>
                    </div>
                    <div className="jahr-regler">
                      <div className="jahr-ticks">{Array.from({ length: 10 }, (_, i) => <span key={i} />)}</div>
                      <input type="range" min={0} max={9} step={1} value={bJahrIdx} list="bBaujahrTicks"
                        style={{ ['--fuell' as string]: `${(bJahrIdx / 9) * 100}%` }}
                        onChange={(e) => { setBJahrIdx(parseInt(e.target.value, 10)); setBBaujahrZahl(''); }} aria-label="Baujahr" />
                      <datalist id="bBaujahrTicks">
                        {Array.from({ length: 10 }, (_, i) => <option key={i} value={i} />)}
                      </datalist>
                    </div>
                    <div className="jahr-skala"><span>vor 1918</span><span>1978</span><span>heute</span></div>
                    <div className="feld" style={{ marginTop: 10 }}>
                      <label className="f-titel" htmlFor="bBaujahrZahl">Oder Baujahr eingeben</label>
                      <input id="bBaujahrZahl" type="number" inputMode="numeric" placeholder="z. B. 1965"
                        min={1800} max={2030} value={bBaujahrZahl}
                        onChange={(e) => {
                          setBBaujahrZahl(e.target.value);
                          const jahr = parseInt(e.target.value, 10);
                          if (!isNaN(jahr) && jahr >= 1800 && jahr <= 2030) setBJahrIdx(jahrZuBaualtersIndex(jahr));
                        }} />
                    </div>
                  </div>

                  <div className="feld">
                    <label className="f-titel" htmlFor="bPlz">Postleitzahl</label>
                    <input id="bPlz" type="text" inputMode="numeric" maxLength={5} value={bPlz} onChange={(e) => setBPlz(e.target.value)} />
                    <p className="f-hilfe">{bTeInfo}</p>
                  </div>
                </div>

                <div className="card">
                  <div className="card-kopf"><span className="num">2</span><h2>Größe und Aufbau</h2></div>
                  <p className="card-unter">Beheizte Fläche, nicht Grundstücksfläche. Keller nur, wenn er beheizt wird.</p>
                  <div className="zeile2">
                    <div className="feld"><label className="f-titel" htmlFor="bWfl">Beheizte Wohnfläche</label>
                      <div className="mit-einheit"><input id="bWfl" type="number" min={20} value={bWfl} onChange={(e) => setBWfl(e.target.value)} /><span className="einheit">m²</span></div></div>
                    <div className="feld"><label className="f-titel" htmlFor="bGesch">Beheizte Geschosse</label>
                      <input id="bGesch" type="number" min={1} max={12} value={bGesch} onChange={(e) => setBGesch(e.target.value)} /></div>
                  </div>
                  <div className="zeile2">
                    <div className="feld"><label className="f-titel" htmlFor="bHoehe">Raumhöhe</label>
                      <div className="mit-einheit"><input id="bHoehe" type="number" min={2} max={6} step={0.05} value={bHoehe} onChange={(e) => setBHoehe(e.target.value)} /><span className="einheit">m</span></div></div>
                    <div className="feld"><label className="f-titel" htmlFor="bPers">Personen im Haushalt</label>
                      <input id="bPers" type="number" min={1} max={200} value={bPers} onChange={(e) => setBPers(e.target.value)} /></div>
                  </div>
                  <div className="feld"><label className="f-titel">Was ist über dir?</label><Kacheln>
                    {DACH_KACHELN.map((k) => <Kachel key={k.v} {...k} aktiv={bDach === k.v} onClick={() => setBDach(k.v)} />)}
                  </Kacheln></div>
                  <div className="feld"><label className="f-titel">Was ist unter dir?</label><Kacheln>
                    {KELLER_KACHELN.map((k) => <Kachel key={k.v} {...k} aktiv={bKeller === k.v} onClick={() => setBKeller(k.v)} />)}
                  </Kacheln></div>
                </div>

                <div className="card">
                  <div className="card-kopf"><span className="num">3</span><h2>Zustand der Bauteile</h2></div>
                  <p className="card-unter">Für jedes Bauteil eine Stufe wählen. Im Zweifel bei „Original“ bleiben.</p>
                  {(['aussenwand', 'fenster', 'dach', 'boden'] as const).map((key) => {
                    const def = bauteilDef(key);
                    const aktuell = stufen[key];
                    return (
                      <div className="bauteil" key={key}>
                        <div className="bauteil-kopf">
                          <span className="bauteil-name"><Icon id={def.icon} w={20} h={20} />{def.name}</span>
                        </div>
                        <div className="stufen">
                          {(['unsaniert', 'ueblich', 'tiefgreifend'] as const).map((s) => (
                            <button key={s} type="button" className="stufe" aria-pressed={aktuell === s}
                              onClick={() => setStufen((prev) => ({ ...prev, [key]: s }))}>
                              {daemmGrafik(s)}<strong>{def.texte[s][0]}</strong><small>{def.texte[s][1]}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <p className="f-hilfe" style={{ marginTop: 12 }}>Die U-Werte sind Richtwerte der Gebäudetypologie und ersetzen kein Aufmaß vor Ort.</p>
                </div>

                <div className="infokacheln">
                  <div className="infokachel"><h3><Icon id="ic-frage" w={17} h={17} />Was ist die Heizlast?</h3>
                    <p>Die Leistung in Kilowatt, die deine Heizung am kältesten Tag des Jahres liefern muss. Nicht zu verwechseln mit dem Jahresverbrauch in Kilowattstunden.</p></div>
                  <div className="infokachel"><h3><Icon id="ic-frage" w={17} h={17} />Warum ist das wichtig?</h3>
                    <p>Eine zu große Wärmepumpe taktet häufig und verliert Jahresarbeitszahl. Eine zu kleine wird an kalten Tagen nicht warm.</p></div>
                  <div className="infokachel"><h3><Icon id="ic-frage" w={17} h={17} />Wie genau ist das hier?</h3>
                    <p>Rund 15 bis 20 Prozent Abweichung. Gut für die Einordnung, nicht ausreichend für Förderanträge. Dafür braucht es die raumweise Berechnung vor Ort.</p></div>
                </div>
              </section>
            )}

            {tab === 'verbrauch' && (
              <section>
                <div className="card">
                  <div className="card-kopf"><span className="num">1</span><h2>Was wurde verbraucht?</h2></div>
                  <p className="card-unter">Nimm einen vollen Abrechnungszeitraum aus der Jahresrechnung. Postleitzahl, Wohnfläche und Personen sind bereits über „Nach Gebäude&rdquo; hinterlegt und werden automatisch übernommen.</p>
                  <div className="feld"><label className="f-titel" htmlFor="vJahr">Verbrauchsjahr</label>
                    <select id="vJahr" value={vJahr} onChange={(e) => setVJahr(e.target.value)}>
                      <option value="">ohne Bereinigung</option>
                      {KLIMAJAHRE.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select></div>
                  <div className="flag quiet" style={{ marginBottom: 16 }}>Ein milder Winter senkt den Verbrauch, ein harter treibt ihn hoch. Über den Klimafaktor des Deutschen Wetterdienstes rechnen wir deinen Verbrauch auf ein durchschnittliches Jahr um.</div>
                  <div className="feld"><label className="f-titel" htmlFor="vTraeger">Energieträger</label>
                    <select id="vTraeger" value={vTraeger} onChange={(e) => setVTraeger(e.target.value)}>
                      {ENERGIETRAEGER.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
                    </select>
                    <p className="f-hilfe">{ENERGIETRAEGER_HINWEIS[vTraeger]}</p></div>
                  <div className="feld"><label className="f-titel" htmlFor="vMenge">Verbrauch im Jahr</label>
                    <div className="mit-einheit"><input id="vMenge" type="number" min={0} value={vMenge} onChange={(e) => setVMenge(e.target.value)} /><span className="einheit">{ENERGIETRAEGER_EINHEIT[vTraeger]}</span></div></div>
                  <div className="feld"><label className="f-titel" htmlFor="vErzeuger">Wärmeerzeuger</label>
                    <select id="vErzeuger" value={vErzeuger} onChange={(e) => setVErzeuger(e.target.value)}>
                      {NUTZUNGSGRAD.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
                    </select>
                    <p className="f-hilfe">Angesetzter Nutzungsgrad: {Math.round((NUTZUNGSGRAD.find((n) => n.v === vErzeuger)?.wert ?? 0.9) * 100)} %. Der Rest geht als Abgas- und Bereitschaftsverlust verloren.</p></div>
                </div>

                <div className="card">
                  <div className="card-kopf"><span className="num">2</span><h2>Warmwasser</h2></div>
                  <p className="card-unter">Warmwasser steckt im Verbrauch mit drin und muss vor der Rechnung heraus.</p>
                  <div className="feld"><label className="f-titel">Wie wird Warmwasser erzeugt?</label><Kacheln w="k2">
                    {TWW_KACHELN.map((k) => <Kachel key={k.v} {...k} aktiv={vTwwArt === k.v} onClick={() => setVTwwArt(k.v)} />)}
                  </Kacheln></div>
                  {vTwwArt !== 'separat' && <>
                    <div className="feld"><label className="f-titel">Verbrauchsverhalten</label><Kacheln>
                      {VERHALTEN_KACHELN.map((k) => <Kachel key={k.v} {...k} aktiv={vVerhalten === k.v} onClick={() => setVVerhalten(k.v)} />)}
                    </Kacheln></div>
                    <div className="feld"><label className="f-titel">Zusätzlich vorhanden</label><Kacheln w="k2">
                      <Kachel {...EXTRAS_KACHELN[0]} aktiv={vZirkulation} onClick={() => setVZirkulation(!vZirkulation)} />
                      <Kachel {...EXTRAS_KACHELN[1]} aktiv={vSolar} onClick={() => setVSolar(!vSolar)} />
                    </Kacheln></div>
                  </>}
                </div>

                <div className="card">
                  <div className="card-kopf"><span className="num">3</span><h2>Betriebsweise</h2></div>
                  <p className="card-unter">Ab welcher Außentemperatur läuft die Heizung nicht mehr?</p>
                  <div className="feld"><label className="f-titel">Heizgrenztemperatur</label>
                    <div className="flag quiet" style={{ marginBottom: 11 }}>Unterhalb dieser Außentemperatur springt die Heizung an. Der Wert steuert, auf wie viele Stunden im Jahr sich dein Verbrauch verteilt.</div>
                    <Kacheln>{HG_KACHELN.map((k) => <Kachel key={k.v} {...k} aktiv={vHg === k.v} onClick={() => setVHg(k.v)} />)}</Kacheln>
                  </div>
                </div>
              </section>
            )}

            {tab === 'abgleich' && (
              <section>
                <div className="card">
                  <div className="card-kopf"><h2 style={{ fontSize: 19 }}>Abgleich der Verfahren</h2></div>
                  <p className="card-unter">Zwei unabhängige Wege zur selben Zahl. Decken sie sich, ist das Ergebnis belastbar.</p>
                  {!erg.vergleich && <p className="f-hilfe">Rechne zuerst beide Verfahren durch (Tab „Nach Gebäude&rdquo; und „Nach Verbrauch&rdquo;). Der Abgleich vergleicht dann, wie gut die berechnete Gebäudehülle zum tatsächlichen Verbrauch passt.</p>}
                  {erg.vergleich && erg.bedarf && erg.verbrauch && (
                    <>
                      <div className="gegen">
                        <div><div className="wert zahl">{fmt(erg.bedarf.gebaeudeheizlastKW)}</div><div className="lbl">kW aus Gebäude</div></div>
                        <div className="vs">gegen</div>
                        <div><div className="wert zahl">{fmt(erg.verbrauch.gebaeudeheizlastKW)}</div><div className="lbl">kW aus Verbrauch</div></div>
                      </div>
                      <div className="ampel-zeile"><span className={`punkt ${punktKlasse}`} /><strong style={{ fontSize: 15 }}>Abweichung {fmt(erg.vergleich.abweichungProzent)} %</strong></div>
                      <p style={{ margin: '0 0 10px', fontSize: 14.5, color: 'var(--gedaempft)' }}>{erg.vergleich.text}</p>
                      <div className={`flag ${flagKlasse}`}>{erg.vergleich.empfehlung}</div>
                      <hr style={{ border: 0, borderTop: '1px solid var(--b08)', margin: '18px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <span style={{ fontSize: 14, color: 'var(--gedaempft)' }}>Empfehlung für die Auslegung</span>
                        <strong className="zahl" style={{ fontSize: 18 }}>{fmt(erg.vergleich.empfehlungAuslegungKW.min)} bis {fmt(erg.vergleich.empfehlungAuslegungKW.max)} kW</strong>
                      </div>
                      <p className="note" style={{ marginTop: 6 }}>Mittelwert beider Verfahren zuzüglich Warmwasser, Bandbreite 90 bis 110 Prozent.</p>
                    </>
                  )}
                </div>
                {erg.vergleich && (erg.vergleich.ampel === 'rot' || erg.vergleich.ampel === 'gelb') && <AngebotBlock kompakt />}
              </section>
            )}

            {tab === 'vorort' && (
              <section>
                <AngebotBlock />
                <div className="infokacheln" style={{ marginTop: 0 }}>
                  <div className="infokachel"><h3><Icon id="ic-lupe" w={18} h={16} />Jeder Raum einzeln</h3>
                    <p>Wir messen jeden beheizten Raum auf und rechnen die Heizlast raumweise. Nur so lässt sich sagen, ob dein Heizkörper im Bad bei 35 Grad Vorlauf noch warm wird.</p></div>
                  <div className="infokachel"><h3><Icon id="ic-akte" w={18} h={16} />Förderfähige Unterlagen</h3>
                    <p>Die Dokumentation erfüllt die Anforderungen von BAFA und KfW: Raumliste, Bauteilannahmen, Volumenströme, Zusammenfassung für den Antrag.</p></div>
                  <div className="infokachel"><h3><Icon id="ic-uhr" w={18} h={16} />Ein Termin genügt</h3>
                    <p>Zwei bis drei Stunden vor Ort, danach machen wir den Rest. Grundrisse sind hilfreich, aber keine Voraussetzung.</p></div>
                </div>

                <div className="card">
                  <div className="card-kopf"><h2 style={{ fontSize: 17.5 }}>Was du bekommst und was nicht</h2></div>
                  <table className="vergleichstabelle">
                    <thead><tr><th></th><th>Dieser Rechner</th><th>Raumweise vor Ort</th></tr></thead>
                    <tbody>
                      <tr><td>Genauigkeit</td><td>±15 bis 20 %</td><td className="ja">±5 %</td></tr>
                      <tr><td>Aufwand</td><td className="ja">2 Minuten</td><td>2 bis 3 Stunden vor Ort</td></tr>
                      <tr><td>Ergebnis je Raum</td><td className="nein">nein</td><td className="ja">ja</td></tr>
                      <tr><td>Heizflächen auslegen</td><td className="nein">nein</td><td className="ja">ja</td></tr>
                      <tr><td>Hydraulischer Abgleich</td><td className="nein">nein</td><td className="ja">Verfahren B</td></tr>
                      <tr><td>BAFA und KfW</td><td className="nein">nicht anerkannt</td><td className="ja">förderkonform</td></tr>
                      <tr><td>Haftung</td><td className="nein">keine</td><td className="ja">Berufshaftpflicht</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="card">
                  <div className="card-kopf"><h2 style={{ fontSize: 17.5 }}>Häufige Fragen</h2></div>
                  <details className="q"><summary>Was, wenn ich keine Grundrisse habe?<span className="chev">+</span></summary>
                    <div className="qbody">Kein Problem. Wir nehmen alle nötigen Maße beim Termin selbst auf, das ist im Preis enthalten.</div></details>
                  <details className="q"><summary>Wird der Online-Bericht angerechnet?<span className="chev">+</span></summary>
                    <div className="qbody">Ja. Ein bereits gespeichertes Ergebnis aus diesem Rechner nehmen wir als Grundlage und rechnen es auf den Festpreis an.</div></details>
                  <details className="q"><summary>Ist die Berechnung förderfähig?<span className="chev">+</span></summary>
                    <div className="qbody">Im Rahmen der Baubegleitung ist die Leistung anteilig förderfähig. Wir prüfen das konkret im Erstgespräch.</div></details>
                </div>

                {!kGesendet ? (
                  <div className="card">
                    <div className="card-kopf"><h2 style={{ fontSize: 17.5 }}>Termin anfragen</h2></div>
                    <p className="card-unter">Wir melden uns innerhalb eines Werktags mit einem Terminvorschlag und dem Festpreisangebot.</p>
                    {uebernommeneDaten()}
                    <div className="zeile2">
                      <div className="feld"><label className="f-titel" htmlFor="kName">Name <span className="pflicht">*</span></label>
                        <input id="kName" type="text" autoComplete="name" value={kName} onChange={(e) => setKName(e.target.value)} /></div>
                      <div className="feld"><label className="f-titel" htmlFor="kTel">Telefon</label>
                        <input id="kTel" type="tel" autoComplete="tel" value={kTel} onChange={(e) => setKTel(e.target.value)} /></div>
                    </div>
                    <div className="feld"><label className="f-titel" htmlFor="kMail">E-Mail <span className="pflicht">*</span></label>
                      <input id="kMail" type="email" autoComplete="email" value={kMail} onChange={(e) => setKMail(e.target.value)} /></div>
                    <div className="feld"><label className="f-titel" htmlFor="kAdresse">Adresse des Objekts <span className="pflicht">*</span></label>
                      <input id="kAdresse" type="text" autoComplete="street-address" placeholder="Straße, Hausnummer, PLZ, Ort" value={kAdresse} onChange={(e) => setKAdresse(e.target.value)} /></div>
                    <div className="feld"><label className="f-titel">Worum geht es?</label><Kacheln w="k2">
                      {ANLASS_KACHELN.map((k) => <Kachel key={k.v} {...k} aktiv={kAnlass === k.v} onClick={() => setKAnlass(k.v)} />)}
                    </Kacheln></div>
                    <div className="feld"><label className="f-titel">Wann passt es dir?</label><Kacheln>
                      {ZEITRAUM_KACHELN.map((k) => <Kachel key={k.v} {...k} aktiv={kZeitraum === k.v} onClick={() => setKZeitraum(k.v)} />)}
                    </Kacheln></div>
                    <div className="feld"><label className="f-titel" htmlFor="kNachricht">Noch etwas, das wir wissen sollten?</label>
                      <textarea id="kNachricht" placeholder="Zum Beispiel: Grundrisse vorhanden, Heizung soll im Frühjahr getauscht werden, ein Wärmepumpenangebot liegt schon vor." value={kNachricht} onChange={(e) => setKNachricht(e.target.value)} /></div>
                    <div className="feld"><label className="dsgvo">
                      <input type="checkbox" checked={kDsgvo} onChange={(e) => setKDsgvo(e.target.checked)} />
                      <span>Ich bin einverstanden, dass energetisiert. meine Angaben zur Bearbeitung der Anfrage speichert und verwendet. Die Einwilligung kann ich jederzeit widerrufen. Es gilt die Datenschutzerklärung. <span className="pflicht">*</span></span>
                    </label></div>
                    <button className="btn-outline-block" disabled={kSendet} onClick={absenden}>{kSendet ? 'Wird gesendet …' : 'Unverbindlich anfragen'}</button>
                    {kFehler && <div className="flag error" style={{ marginTop: 11 }}>{kFehler}</div>}
                  </div>
                ) : (
                  <div className="card"><div className="erfolg"><h3>Anfrage ist raus</h3>
                    <p>Wir melden uns innerhalb eines Werktags bei {kName} mit einem Terminvorschlag. Deine Rechnerdaten liegen uns vor, du musst nichts noch einmal schicken.</p>
                  </div></div>
                )}
              </section>
            )}
          </main>

          {tab !== 'abgleich' && tab !== 'vorort' && (
            <aside className="seitenspalte">
              <div className="panel">
                <div className="kicker">{tab === 'bedarf' ? 'Gebäudeheizlast über die Gebäudehülle' : 'Gebäudeheizlast über den Verbrauch'}</div>
                <div className="gross zahl">{fmt(gezeigtesErg?.gebaeudeheizlastKW)}<span className="einheit">kW</span></div>
                <div className="sub">{tab === 'bedarf'
                  ? 'Leistung, die dein Gebäude am kältesten Tag braucht.'
                  : erg.verbrauch ? `Aus ${fmt(erg.verbrauch.raumwaermeKWh, 0)} kWh Raumwärme und ${erg.verbrauch.vollbenutzungsstunden} Vollbenutzungsstunden.` : 'Bitte Eingaben vervollständigen.'}</div>

                <div style={{ marginTop: 19 }}>
                  <div className="skala-titel">Passende Wärmepumpen-Leistungsklasse</div>
                  <div className="skala-bahn">
                    <div className="skala-zone">4–6</div><div className="skala-zone">6–9</div>
                    <div className="skala-zone">9–13</div><div className="skala-zone">13–18</div><div className="skala-zone">18–30</div>
                    <div className="marker" style={{ left: `${markerPct(gezeigtesErg?.gebaeudeheizlastKW)}%` }}>
                      <span className="marker-fahne">{fmt(gezeigtesErg?.gebaeudeheizlastKW)} kW</span>
                    </div>
                  </div>
                  <div className="skala-legende"><span>4 kW</span><span>30 kW</span></div>
                </div>

                {renderWpAmpel(erg.wpEignung)}

                <div className="rows">
                  <div><span>Je Quadratmeter</span><b>{gezeigtesErg?.spezifischWproM2 == null ? '–' : `${fmt(gezeigtesErg.spezifischWproM2)} W/m²`}</b></div>
                  <div><span>Mit Warmwasser</span><b>{gezeigtesErg ? `${fmt(gezeigtesErg.gesamtKW)} kW` : '–'}</b></div>
                  <div><span>Auslegungstemperatur</span><b>{gezeigtesErg ? `${gezeigtesErg.normAussentemperatur} °C` : '–'}</b></div>
                  <div><span>Empfehlung Gerät</span><b>{gezeigtesErg ? `${fmt(gezeigtesErg.wpEmpfehlung.min)}–${fmt(gezeigtesErg.wpEmpfehlung.max)} kW` : '–'}</b></div>
                </div>

                <hr />
                <div className="kicker" style={{ marginBottom: 9 }}>Woher die Leistung kommt</div>
                {renderAufschluesselung()}

                <hr />
                <button className="btn-light" onClick={() => window.print()}>Ergebnis als PDF sichern</button>
                <button className="btn-ghost" onClick={() => setTab(tab === 'bedarf' ? 'verbrauch' : 'bedarf')}>
                  {tab === 'bedarf' ? 'Gegenrechnung über den Verbrauch' : 'Gegenrechnung über das Gebäude'}
                </button>
                <button className="btn-ghost" onClick={() => setTab('vorort')}>Verbindlich vor Ort berechnen lassen</button>
                {renderHinweise()}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="label" style={{ marginBottom: 9 }}>Rechtsstand und Quellen</div>
                <p className="note">
                  Bedarfsverfahren: vereinfachtes Hüllflächenverfahren in Anlehnung an DIN EN 12831-1, Bauteilkennwerte nach IWU-Gebäudetypologie.<br /><br />
                  Verbrauchsverfahren: Vollbenutzungsstundenverfahren in Anlehnung an DIN/TS 12831-1, Witterungsbereinigung über DWD-Klimafaktoren.<br /><br />
                  <b style={{ color: 'var(--gedaempft)' }}>Beide Verfahren sind überschlägig.</b> Für BEG-, BAFA- und KfW-Nachweise ist eine raumweise Heizlastberechnung nach DIN EN 12831-1 erforderlich.
                </p>
              </div>
            </aside>
          )}

          {tab !== 'abgleich' && tab !== 'vorort' && (
            <div className="druckreport">
              <div className="druck-kopf">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/energetisiert-logo.png" alt="energetisiert." className="druck-logo" />
                <div>
                  <span className="druck-eyebrow">Heizlastrechner — Ergebnis</span>
                  <h2>Überschlägige Heizlastberechnung</h2>
                </div>
              </div>

              {uebernommeneDaten()}

              <div className="druck-panel">
                <div className="kicker">{tab === 'bedarf' ? 'Gebäudeheizlast über die Gebäudehülle' : 'Gebäudeheizlast über den Verbrauch'}</div>
                <div className="gross zahl">{fmt(gezeigtesErg?.gebaeudeheizlastKW)}<span className="einheit">kW</span></div>
                <div className="sub">{tab === 'bedarf'
                  ? 'Leistung, die dein Gebäude am kältesten Tag braucht.'
                  : erg.verbrauch ? `Aus ${fmt(erg.verbrauch.raumwaermeKWh, 0)} kWh Raumwärme und ${erg.verbrauch.vollbenutzungsstunden} Vollbenutzungsstunden.` : ''}</div>

                <div style={{ marginTop: 19 }}>
                  <div className="skala-titel">Passende Wärmepumpen-Leistungsklasse</div>
                  <div className="skala-bahn">
                    <div className="skala-zone">4–6</div><div className="skala-zone">6–9</div>
                    <div className="skala-zone">9–13</div><div className="skala-zone">13–18</div><div className="skala-zone">18–30</div>
                    <div className="marker" style={{ left: `${markerPct(gezeigtesErg?.gebaeudeheizlastKW)}%` }}>
                      <span className="marker-fahne">{fmt(gezeigtesErg?.gebaeudeheizlastKW)} kW</span>
                    </div>
                  </div>
                  <div className="skala-legende"><span>4 kW</span><span>30 kW</span></div>
                </div>

                {renderWpAmpel(erg.wpEignung)}

                <div className="rows">
                  <div><span>Je Quadratmeter</span><b>{gezeigtesErg?.spezifischWproM2 == null ? '–' : `${fmt(gezeigtesErg.spezifischWproM2)} W/m²`}</b></div>
                  <div><span>Mit Warmwasser</span><b>{gezeigtesErg ? `${fmt(gezeigtesErg.gesamtKW)} kW` : '–'}</b></div>
                  <div><span>Auslegungstemperatur</span><b>{gezeigtesErg ? `${gezeigtesErg.normAussentemperatur} °C` : '–'}</b></div>
                  <div><span>Empfehlung Gerät</span><b>{gezeigtesErg ? `${fmt(gezeigtesErg.wpEmpfehlung.min)}–${fmt(gezeigtesErg.wpEmpfehlung.max)} kW` : '–'}</b></div>
                </div>

                <hr />
                <div className="kicker" style={{ marginBottom: 9 }}>Woher die Leistung kommt</div>
                {renderAufschluesselung()}
                {renderHinweise()}
              </div>

              <div className="card">
                <div className="card-kopf"><h2 style={{ fontSize: 16 }}>Abgleich der Verfahren</h2></div>
                <p className="card-unter">Zwei unabhängige Wege zur selben Zahl. Decken sie sich, ist das Ergebnis belastbar.</p>
                {erg.vergleich && erg.bedarf && erg.verbrauch ? (
                  <>
                    <div className="gegen">
                      <div><div className="wert zahl">{fmt(erg.bedarf.gebaeudeheizlastKW)}</div><div className="lbl">kW aus Gebäude</div></div>
                      <div className="vs">gegen</div>
                      <div><div className="wert zahl">{fmt(erg.verbrauch.gebaeudeheizlastKW)}</div><div className="lbl">kW aus Verbrauch</div></div>
                    </div>
                    <div className="ampel-zeile"><span className={`punkt ${punktKlasse}`} /><strong style={{ fontSize: 14 }}>Abweichung {fmt(erg.vergleich.abweichungProzent)} %</strong></div>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--gedaempft)' }}>{erg.vergleich.text}</p>
                    <div className={`flag ${flagKlasse}`}>{erg.vergleich.empfehlung}</div>
                    <hr style={{ border: 0, borderTop: '1px solid var(--b08)', margin: '16px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--gedaempft)' }}>Empfehlung für die Auslegung</span>
                      <strong className="zahl" style={{ fontSize: 16 }}>{fmt(erg.vergleich.empfehlungAuslegungKW.min)} bis {fmt(erg.vergleich.empfehlungAuslegungKW.max)} kW</strong>
                    </div>
                    <p className="note" style={{ marginTop: 6 }}>Mittelwert beider Verfahren zuzüglich Warmwasser, Bandbreite 90 bis 110 Prozent. Verbrauch angenommen aus {vMenge || '–'} {ENERGIETRAEGER_EINHEIT[vTraeger]} {(ENERGIETRAEGER.find((e) => e.v === vTraeger)?.l ?? vTraeger).replace(/\s*\([^)]*\)\s*$/, '')}, sofern nicht selbst eingetragen.</p>
                  </>
                ) : (
                  <p className="f-hilfe">Für den Abgleich fehlt eines der beiden Verfahren. Bitte auf den Tabs „Nach Gebäude&rdquo; und „Nach Verbrauch&rdquo; Werte hinterlegen, damit dieser Vergleich mitgedruckt wird.</p>
                )}
              </div>

              <div className="card">
                <div className="label" style={{ marginBottom: 9 }}>Rechtsstand und Quellen</div>
                <p className="note">
                  Bedarfsverfahren: vereinfachtes Hüllflächenverfahren in Anlehnung an DIN EN 12831-1, Bauteilkennwerte nach IWU-Gebäudetypologie.<br /><br />
                  Verbrauchsverfahren: Vollbenutzungsstundenverfahren in Anlehnung an DIN/TS 12831-1, Witterungsbereinigung über DWD-Klimafaktoren.<br /><br />
                  <b style={{ color: 'var(--gedaempft)' }}>Beide Verfahren sind überschlägig.</b> Für BEG-, BAFA- und KfW-Nachweise ist eine raumweise Heizlastberechnung nach DIN EN 12831-1 erforderlich.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="fuss">Prototyp, Version 1.0, Stand August 2026. Parameter sind nach raumweiser Heizlastberechnung zu evaluieren. Verantwortlich: <strong>energetisiert. energieberatung GmbH</strong></p>

      {tab !== 'abgleich' && tab !== 'vorort' && (
        <div className="leiste">
          <div><div className="lz zahl">{fmt(gezeigtesErg?.gebaeudeheizlastKW)} kW</div><div className="ll">{tab === 'bedarf' ? 'über die Gebäudehülle' : 'über den Verbrauch'}</div></div>
          <button onClick={() => { document.querySelector('.panel')?.scrollIntoView({ behavior: 'smooth' }); }}>Ergebnis</button>
        </div>
      )}
    </div>
  );
}
