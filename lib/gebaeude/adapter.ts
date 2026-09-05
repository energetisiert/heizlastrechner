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
