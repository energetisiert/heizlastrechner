/**
 * Konstanten, die bewusst im Client liegen dürfen: die Baualtersklassen-
 * Slugs (reine UI-Labels) und die grobe PLZ-Leitziffer-Tabelle für die
 * Anzeige der Norm-Außentemperatur. Beides ist öffentlich dokumentiertes
 * Allgemeinwissen ohne Geschäftswert — die eigentlichen U-Werte, Stunden-
 * und Typologie-Tabellen bleiben ausschließlich in engine.ts (server-only).
 */
export const BAUALTERSKLASSEN = [
  '-1918', '1919-1948', '1949-1957', '1958-1968', '1969-1978',
  '1979-1983', '1984-1994', '1995-2001', '2002-2015', '2016-'
] as const;

export const NORM_AUSSENTEMP_LEITZIFFER: Record<string, number> = {
  '0': -14, '1': -12, '2': -10, '3': -12, '4': -10,
  '5': -10, '6': -12, '7': -12, '8': -16, '9': -14
};
