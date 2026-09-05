import { BAUALTERSKLASSEN } from '@/lib/tools/heizlast/shared';
import { STAMMDATEN_SCHEMA_VERSION, type GebaeudeStammdaten, type Gebaeudetyp } from './stammdaten';

/**
 * Heizlast-Adapter: Formularzustand -> kanonische Stammdaten (Rückschreiben
 * beim Speichern). Das Gegenstück ausStammdaten() (Prefill aus dem Gebäude)
 * folgt in Phase 2. Enum-Mapping lebt nur hier: Heizlast kennt
 * efh/dhh/reihenmitte/reihenend/mfhKlein/mfhGross, das Gebäude
 * efh/dhh/rmh/reh/mfh.
 */
const GEBAEUDETYP: Record<string, Gebaeudetyp> = {
  efh: 'efh', dhh: 'dhh', reihenmitte: 'rmh', reihenend: 'reh', mfhKlein: 'mfh', mfhGross: 'mfh',
};

const ENERGIETRAEGER: Record<string, { energietraeger: string; einheit: string }> = {
  erdgas_m3: { energietraeger: 'erdgas', einheit: 'm3' },
  erdgas_kwh: { energietraeger: 'erdgas', einheit: 'kWh' },
  heizoel_l: { energietraeger: 'heizoel', einheit: 'l' },
  fluessiggas_l: { energietraeger: 'fluessiggas', einheit: 'l' },
  pellets_kg: { energietraeger: 'pellets', einheit: 'kg' },
  scheitholz_rm: { energietraeger: 'scheitholz', einheit: 'rm' },
  fernwaerme: { energietraeger: 'fernwaerme', einheit: 'kWh' },
  strom: { energietraeger: 'strom', einheit: 'kWh' },
};

export interface HeizlastFormFuerStammdaten {
  bTyp: string; bJahrIdx: number; bPlz: string; bWfl: string; bGesch: string; bHoehe: string; bPers: string; bNE: string;
  bDach: string; bKeller: string; bLueftung: string; bBaujahrZahl: string;
  stufen: { aussenwand: string; dach: string; fenster: string; boden: string };
  vJahr: string; vTraeger: string; vMenge: string; vErzeuger: string; vTwwArt: string; vVerhalten: string;
  vZirkulation: boolean; vSolar: boolean;
}

function zahl(v: string): number | undefined {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export function inStammdaten(f: HeizlastFormFuerStammdaten): Partial<GebaeudeStammdaten> {
  const traeger = ENERGIETRAEGER[f.vTraeger];
  const baujahr = zahl(f.bBaujahrZahl);
  return {
    schema_version: STAMMDATEN_SCHEMA_VERSION,
    plz: f.bPlz || undefined,
    gebaeudeart: 'wg',
    gebaeudetyp: GEBAEUDETYP[f.bTyp],
    baujahr: baujahr && baujahr > 1000 ? Math.round(baujahr) : undefined,
    baujahr_klasse: BAUALTERSKLASSEN[f.bJahrIdx],
    wohnflaeche_m2: zahl(f.bWfl),
    wohneinheiten: zahl(f.bNE),
    personen: zahl(f.bPers),
    geschosse: zahl(f.bGesch),
    geschosshoehe_m: zahl(f.bHoehe),
    dach: f.bDach,
    keller: f.bKeller,
    lueftung: f.bLueftung,
    daemmstufen: { ...f.stufen },
    heizung: { energietraeger: traeger?.energietraeger, erzeuger: f.vErzeuger },
    verbrauch: { jahr: zahl(f.vJahr), menge: zahl(f.vMenge), einheit: traeger?.einheit },
    warmwasser: { art: f.vTwwArt, zirkulation: f.vZirkulation, solarthermie: f.vSolar, verhalten: f.vVerhalten },
  };
}

/* -------------------------------------------------------------------------- */
/* Prefill aus dem Gebäude (Phase 2): nur vorhandene Felder, Rest bleibt Tool-Default. */
const TYP_ZURUECK: Record<string, string> = { efh: 'efh', dhh: 'dhh', rmh: 'reihenmitte', reh: 'reihenend' };
const ERZEUGER = ['brennwert', 'niedertemperatur', 'konstanttemperatur', 'pelletkessel', 'scheitholzkessel', 'fernwaerme', 'elektro'];
const TRAEGER_ZURUECK: Record<string, string> = {
  'erdgas|m3': 'erdgas_m3', 'erdgas|kWh': 'erdgas_kwh', 'erdgas|': 'erdgas_kwh', 'heizoel|': 'heizoel_l', 'fluessiggas|': 'fluessiggas_l',
  'pellets|': 'pellets_kg', 'biomasse|': 'pellets_kg', 'scheitholz|': 'scheitholz_rm', 'fernwaerme|': 'fernwaerme', 'strom|': 'strom',
};

/** Index der IWU-Baualtersklasse ("-1918", "1919-1948", ..., "2016-") für ein Baujahr. */
export function klasseFuerBaujahr(jahr: number): number {
  return BAUALTERSKLASSEN.findIndex((k) => {
    const m = String(k).match(/^(\d{4})?-(\d{4})?$/);
    if (!m) return false;
    const von = m[1] ? Number(m[1]) : -Infinity;
    const bis = m[2] ? Number(m[2]) : Infinity;
    return jahr >= von && jahr <= bis;
  });
}

export function ausStammdaten(s: Partial<GebaeudeStammdaten>): Partial<HeizlastFormFuerStammdaten> {
  const p: Partial<HeizlastFormFuerStammdaten> = {};
  const str = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : undefined);
  if (s.plz) p.bPlz = s.plz;
  if (s.gebaeudetyp === 'mfh') p.bTyp = (s.wohneinheiten ?? 0) > 6 ? 'mfhGross' : 'mfhKlein';
  else if (s.gebaeudetyp && TYP_ZURUECK[s.gebaeudetyp]) p.bTyp = TYP_ZURUECK[s.gebaeudetyp];
  if (s.baujahr_klasse) {
    const idx = (BAUALTERSKLASSEN as readonly string[]).indexOf(s.baujahr_klasse);
    if (idx >= 0) p.bJahrIdx = idx;
  }
  if (typeof s.baujahr === 'number' && s.baujahr > 1000) {
    p.bBaujahrZahl = String(s.baujahr);
    const idx = klasseFuerBaujahr(s.baujahr);
    if (idx >= 0) p.bJahrIdx = idx;
  }
  const wfl = str(s.wohnflaeche_m2); if (wfl) p.bWfl = wfl;
  const ne = str(s.wohneinheiten); if (ne) p.bNE = ne;
  const pers = str(s.personen); if (pers) p.bPers = pers;
  const gesch = str(s.geschosse); if (gesch) p.bGesch = gesch;
  const hoehe = str(s.geschosshoehe_m); if (hoehe) p.bHoehe = hoehe;
  if (s.dach) p.bDach = s.dach;
  if (s.keller) p.bKeller = s.keller;
  if (s.lueftung) p.bLueftung = s.lueftung;
  if (s.daemmstufen && s.daemmstufen.aussenwand && s.daemmstufen.dach && s.daemmstufen.fenster && s.daemmstufen.boden) {
    p.stufen = { aussenwand: s.daemmstufen.aussenwand, dach: s.daemmstufen.dach, fenster: s.daemmstufen.fenster, boden: s.daemmstufen.boden };
  }
  if (s.heizung?.erzeuger && ERZEUGER.includes(s.heizung.erzeuger)) p.vErzeuger = s.heizung.erzeuger;
  if (s.heizung?.energietraeger) {
    const einheit = s.verbrauch?.einheit ?? '';
    const traeger = TRAEGER_ZURUECK[`${s.heizung.energietraeger}|${einheit}`] ?? TRAEGER_ZURUECK[`${s.heizung.energietraeger}|`];
    if (traeger) {
      p.vTraeger = traeger;
      const menge = str(s.verbrauch?.menge);
      if (menge) p.vMenge = menge;
    }
  }
  if (typeof s.verbrauch?.jahr === 'number' && s.verbrauch.jahr >= 2019 && s.verbrauch.jahr <= 2030) p.vJahr = String(s.verbrauch.jahr);
  if (s.warmwasser?.art) p.vTwwArt = s.warmwasser.art;
  if (s.warmwasser?.verhalten) p.vVerhalten = s.warmwasser.verhalten;
  if (typeof s.warmwasser?.zirkulation === 'boolean') p.vZirkulation = s.warmwasser.zirkulation;
  if (typeof s.warmwasser?.solarthermie === 'boolean') p.vSolar = s.warmwasser.solarthermie;
  return p;
}
