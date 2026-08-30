import 'server-only';

/**
 * Server-only-Fassade um die minifizierte Rechenlogik. Der 'server-only'-
 * Import lässt jeden Build hart fehlschlagen, der diese Datei versehentlich
 * aus einer Client-Komponente importiert — U-Werte, Vollbenutzungsstunden
 * und Gebäudetyp-Parameter können so nie im Browser-Bundle landen.
 * Client-taugliche Konstanten liegen separat in ./shared.ts.
 */
export {
  PARAMS, berechneBedarf, berechneVerbrauch, euro, huellflaechen,
  leadBewertung, normAussentemperatur, preis, sanierungsgrad, uWert,
  vergleiche, wpEignung
} from './logik-core.js';
