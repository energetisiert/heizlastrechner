'use client';

import { Icon } from '@/components/IconSprite';


/* ============================================================================
   Statische Beschriftungen
   ========================================================================= */

export const BAUJAHR_LABEL: Record<string, string> = {
  '-1918': 'vor 1918', '1919-1948': '1919 bis 1948', '1949-1957': '1949 bis 1957',
  '1958-1968': '1958 bis 1968', '1969-1978': '1969 bis 1978', '1979-1983': '1979 bis 1983',
  '1984-1994': '1984 bis 1994', '1995-2001': '1995 bis 2001', '2002-2015': '2002 bis 2015', '2016-': 'ab 2016'
};
export const BAUJAHR_NOTE: Record<string, string> = {
  '-1918': 'Fachwerk oder massive Vollziegelwände, meist ungedämmt',
  '1919-1948': 'Vollziegel, Einfachverglasung, kein Wärmeschutz',
  '1949-1957': 'Wiederaufbau, sparsame Bauweise, dünne Wände',
  '1958-1968': 'erste Hohlblocksteine, noch ohne Dämmvorschrift',
  '1969-1978': 'vor der ersten Wärmeschutzverordnung von 1977',
  '1979-1983': 'erste Wärmeschutzverordnung greift',
  '1984-1994': 'zweite Wärmeschutzverordnung, Isolierverglasung üblich',
  '1995-2001': 'dritte Wärmeschutzverordnung, deutlich besser gedämmt',
  '2002-2015': 'Energieeinsparverordnung, guter Standard',
  '2016-': 'GEG-Niveau, sehr gut gedämmt'
};

export const ENERGIETRAEGER = [
  { v: 'erdgas_m3', l: 'Erdgas (m³)' }, { v: 'erdgas_kwh', l: 'Erdgas (kWh)' },
  { v: 'heizoel_l', l: 'Heizöl EL (l)' }, { v: 'fluessiggas_l', l: 'Flüssiggas (l)' },
  { v: 'pellets_kg', l: 'Holzpellets (kg)' }, { v: 'scheitholz_rm', l: 'Scheitholz (rm)' },
  { v: 'fernwaerme', l: 'Fernwärme (kWh)' }, { v: 'strom', l: 'Strom direkt (kWh)' }
];
export const ENERGIETRAEGER_EINHEIT: Record<string, string> = {
  erdgas_m3: 'm³', erdgas_kwh: 'kWh', heizoel_l: 'l', fluessiggas_l: 'l',
  pellets_kg: 'kg', scheitholz_rm: 'rm', fernwaerme: 'kWh', strom: 'kWh'
};
export const ENERGIETRAEGER_HINWEIS: Record<string, string> = {
  erdgas_m3: 'Brennwert × Zustandszahl, Standardwert 10,0 kWh/m³. Exakten Wert aus der Jahresabrechnung übernehmen.',
  erdgas_kwh: 'Wert direkt aus der Gasabrechnung.',
  heizoel_l: 'Heizwert Heizöl EL rund 10,0 kWh je Liter.',
  fluessiggas_l: 'Flüssiggas rund 6,57 kWh je Liter.',
  pellets_kg: 'Pellets rund 4,8 kWh je Kilogramm.',
  scheitholz_rm: 'Mittelwert gemischtes Hartholz, lufttrocken. Buche liegt höher, Fichte deutlich darunter.',
  fernwaerme: 'Wert direkt aus der Fernwärmeabrechnung.',
  strom: 'Nur für Direktheizungen. Wärmepumpen bitte über die JAZ erfassen.'
};
export const NUTZUNGSGRAD = [
  { v: 'brennwert', l: 'Brennwertkessel', wert: 0.95 }, { v: 'niedertemperatur', l: 'Niedertemperaturkessel', wert: 0.87 },
  { v: 'konstanttemperatur', l: 'Alter Konstanttemperaturkessel', wert: 0.75 }, { v: 'pelletkessel', l: 'Pelletkessel', wert: 0.85 },
  { v: 'scheitholzkessel', l: 'Scheitholzkessel', wert: 0.75 }, { v: 'fernwaerme', l: 'Fernwärme-Übergabestation', wert: 0.97 },
  { v: 'elektro', l: 'Elektro-Direktheizung', wert: 1.00 }
];
export const KLIMAJAHRE = ['2025', '2024', '2023', '2022', '2021', '2020', '2019'];

export type BauteilBasis = { name: string; icon: string; logik: string; texte: Record<string, [string, string]> };
export const BAUTEIL_BASIS: Record<'aussenwand' | 'fenster', BauteilBasis> = {
  aussenwand: { name: 'Außenwände', icon: 'ic-wand', logik: 'aussenwand',
    texte: { unsaniert: ['Original', 'wie gebaut'], ueblich: ['Gedämmt', 'rund 6 cm'], tiefgreifend: ['Stark gedämmt', 'ab 18 cm'] } },
  fenster: { name: 'Fenster und Haustür', icon: 'ic-fenster', logik: 'fenster',
    texte: { unsaniert: ['Original', 'wie gebaut'], ueblich: ['Zweifachglas', 'ab etwa 1995'], tiefgreifend: ['Dreifachglas', 'heutiger Standard'] } }
};
export const DACH_VARIANTEN = {
  dach: { name: 'Dach', icon: 'ic-dach', logik: 'dach',
    texte: { unsaniert: ['Original', 'wie gebaut'], ueblich: ['Gedämmt', 'rund 16 cm'], tiefgreifend: ['Stark gedämmt', 'ab 24 cm'] } },
  obersteGeschossdecke: { name: 'Oberste Geschossdecke', icon: 'ic-boden', logik: 'obersteGeschossdecke',
    texte: { unsaniert: ['Original', 'wie gebaut'], ueblich: ['Dünne Matte', 'rund 4 cm'], tiefgreifend: ['Stark gedämmt', 'ab 14 cm'] } }
} as const;
export const BODEN_VARIANTEN = {
  kellerdecke: { name: 'Kellerdecke', icon: 'ic-boden', logik: 'kellerdecke',
    texte: { unsaniert: ['Original', 'wie gebaut'], ueblich: ['Gedämmt', 'rund 8 cm'], tiefgreifend: ['Stark gedämmt', 'ab 14 cm'] } },
  bodenErdreich: { name: 'Bodenplatte', icon: 'ic-boden', logik: 'bodenErdreich',
    texte: { unsaniert: ['Original', 'wie gebaut'], ueblich: ['Gedämmt', 'rund 8 cm'], tiefgreifend: ['Stark gedämmt', 'ab 14 cm'] } }
} as const;

export const GEBAEUDETYP_KACHELN = [
  { v: 'efh', icon: 'ic-efh', l: 'Freistehend', s: 'Einfamilienhaus' },
  { v: 'dhh', icon: 'ic-dhh', l: 'Doppelhaus', s: 'eine Hälfte' },
  { v: 'reihenend', icon: 'ic-rhend', l: 'Reihenhaus', s: 'Endhaus' },
  { v: 'reihenmitte', icon: 'ic-rhmitte', l: 'Reihenhaus', s: 'Mitte' },
  { v: 'mfhKlein', icon: 'ic-mfhk', l: 'Mehrfamilien', s: 'bis 6 Wohnungen' },
  { v: 'mfhGross', icon: 'ic-mfhg', l: 'Mehrfamilien', s: 'ab 7 Wohnungen' }
];
export const DACH_KACHELN = [
  { v: 'steilUnbeheizt', icon: 'ic-dachkalt', l: 'Dachboden', s: 'nicht beheizt' },
  { v: 'steilBeheizt', icon: 'ic-dachwarm', l: 'Dachgeschoss', s: 'ausgebaut' },
  { v: 'flach', icon: 'ic-flach', l: 'Flachdach', s: 'ohne Dachraum' }
];
export const KELLER_KACHELN = [
  { v: 'keller', icon: 'ic-keller', l: 'Keller', s: 'nicht beheizt' },
  { v: 'kellerBeheizt', icon: 'ic-keller', l: 'Keller', s: 'beheizt' },
  { v: 'erdreich', icon: 'ic-platte', l: 'Bodenplatte', s: 'auf Erdreich' }
];
export const LUEFTUNG_KACHELN = [
  { v: 'nein', icon: 'ic-fenster', l: 'Fensterlüftung', s: 'ganz normal' },
  { v: 'ja', icon: 'ic-flach', l: 'Lüftungsanlage', s: 'mit Wärmerückgewinnung' }
];
export const TWW_KACHELN = [
  { v: 'zentral', icon: 'ic-warmwasser', l: 'Über die Heizung', s: 'Speicher oder Kombigerät' },
  { v: 'separat', icon: 'ic-thermo', l: 'Separat', s: 'z. B. Durchlauferhitzer' }
];
export const VERHALTEN_KACHELN = [
  { v: 'sparsam', l: 'Sparsam', s: 'kurz duschen' },
  { v: 'normal', l: 'Normal', s: 'Durchschnitt' },
  { v: 'komfortabel', l: 'Komfortabel', s: 'oft und lange' }
];
export const EXTRAS_KACHELN = [
  { v: 'zirkulation', icon: 'ic-warmwasser', l: 'Zirkulation', s: 'sofort warmes Wasser' },
  { v: 'solar', icon: 'ic-sonne', l: 'Solarthermie', s: 'Kollektor auf dem Dach' }
];
export const HG_KACHELN = [
  { v: '15', l: '15 °C', s: 'Altbau' }, { v: '12', l: '12 °C', s: 'Neubau' }, { v: '10', l: '10 °C', s: 'Niedrigenergie' }
];
export const ANLASS_KACHELN = [
  { v: 'waermepumpe', icon: 'ic-thermo', l: 'Wärmepumpe geplant', s: 'Auslegung und Förderung' },
  { v: 'foerderung', icon: 'ic-euro', l: 'Förderantrag', s: 'BAFA oder KfW' },
  { v: 'abgleich', icon: 'ic-boden', l: 'Hydraulischer Abgleich', s: 'Verfahren B' },
  { v: 'zweitmeinung', icon: 'ic-lupe', l: 'Zweitmeinung', s: 'Angebot prüfen lassen' }
];
export const ZEITRAUM_KACHELN = [
  { v: 'bald', l: 'So bald wie möglich', s: '' }, { v: 'monat', l: 'In vier Wochen', s: '' }, { v: 'flexibel', l: 'Bin flexibel', s: '' }
];

/* ============================================================================
   Kleine wiederverwendbare Bausteine
   ========================================================================= */

export function Kachel({ icon, l, s, aktiv, onClick }: {
  icon?: string; l: string; s?: string; aktiv: boolean; onClick: () => void;
}) {
  return (
    <button type="button" className="kachel" aria-pressed={aktiv} onClick={onClick}>
      {icon && <Icon id={icon} w={38} h={30} />}
      <span className="kl">{l}</span>
      {s && <span className="ks">{s}</span>}
    </button>
  );
}

export function Kacheln({ children, w = 'k3' }: { children: React.ReactNode; w?: 'k3' | 'k2' }) {
  return <div className={`kacheln ${w}`}>{children}</div>;
}

export function daemmGrafik(stufe: string) {
  const h = stufe === 'unsaniert' ? 0 : stufe === 'ueblich' ? 3.2 : 6;
  return (
    <svg className="daemm" viewBox="0 0 32 11" fill="none" stroke="currentColor" strokeWidth={1.2}>
      <rect x="1" y="1" width="30" height="9" rx="1.5" opacity=".35" />
      {h > 0 && <rect x="1" y={10 - h} width="30" height={h} rx="1" fill="currentColor" opacity=".5" stroke="none" />}
    </svg>
  );
}

export function fmt(v: number | null | undefined, n = 1) {
  if (v === null || v === undefined || !isFinite(v)) return '–';
  return v.toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
}
