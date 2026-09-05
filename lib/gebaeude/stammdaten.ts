/**
 * Kanonische Gebäude-Stammdaten des Studios -- pro Repo kopiert (wie
 * GespeicherteErgebnisse.tsx), Referenzkopie im Tools Hub. Jedes Tool liest
 * daraus vor (Phase 2) und schreibt beim Speichern nur die Felder zurück, die
 * es kennt (Partial, serverseitig per jsonb || gemischt). Unbekannte Felder
 * werden ignoriert, fehlende bleiben Tool-Default -- Adapter werfen nie.
 * Enum-Unterschiede der Tools leben ausschließlich in adapter.ts.
 */
export const STAMMDATEN_SCHEMA_VERSION = 1;

export type Gebaeudetyp = 'efh' | 'dhh' | 'rmh' | 'reh' | 'mfh' | 'nwg';

export interface GebaeudeStammdaten {
  schema_version: number;
  adresse?: string;
  plz?: string;
  gebaeudeart?: 'wg' | 'nwg';
  gebaeudetyp?: Gebaeudetyp;
  /** Baujahr als Zahl, wenn bekannt. */
  baujahr?: number;
  /** Baualtersklasse der IWU-Typologie, z. B. "1958-1968" (Heizlast). */
  baujahr_klasse?: string;
  wohnflaeche_m2?: number;
  wohneinheiten?: number;
  personen?: number;
  geschosse?: number;
  geschosshoehe_m?: number;
  dach?: string;
  keller?: string;
  lueftung?: string;
  daemmstufen?: { aussenwand?: string; dach?: string; fenster?: string; boden?: string };
  denkmal?: boolean;
  heizung?: { energietraeger?: string; erzeuger?: string; baujahr?: number };
  verbrauch?: { jahr?: number; menge?: number; einheit?: string };
  warmwasser?: { art?: string; zirkulation?: boolean; solarthermie?: boolean; verhalten?: string };
  eigentuemer?: { zve?: number; kinder?: number; antragstellertyp?: string; nutzung?: string };
  sanierung?: { isfp?: boolean; ehStufe?: string; eeklasse?: boolean; nhklasse?: boolean; wpb?: boolean; sersan?: boolean };
}

/** Kurzform eines Knotens, wie gebaeude_list() ihn liefert. */
export interface GebaeudeKnotenKurz {
  id: string;
  tool_slug: string;
  updated_at: string;
  ergebnis_zusammenfassung: Record<string, unknown>;
}

export interface GebaeudeEintrag {
  id: string;
  kundenname: string;
  objektadresse: string;
  stammdaten: Partial<GebaeudeStammdaten>;
  created_at: string;
  updated_at: string;
  knoten: GebaeudeKnotenKurz[];
}

/** Vollständiger Knoten, wie gebaeude_get() ihn liefert. */
export interface GebaeudeKnoten<TEingaben = unknown> {
  id: string;
  gebaeude_id: string;
  tool_slug: string;
  eingaben: TEingaben;
  ergebnis_zusammenfassung: Record<string, unknown>;
  position: unknown;
  created_at: string;
  updated_at: string;
}

export interface GebaeudeDetail<TEingaben = unknown> {
  gebaeude: Omit<GebaeudeEintrag, 'knoten'> & { user_id: string };
  knoten: GebaeudeKnoten<TEingaben>[];
}
