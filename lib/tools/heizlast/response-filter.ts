import 'server-only';

/**
 * Filtert die rohen Engine-Ergebnisse auf die Felder, die den Server
 * verlassen duerfen -- keine U-Werte, fT-Faktoren, Flaechen, Geometrie oder
 * Koeffizienten. Von /api/heizlast/berechnen (Response an den Client) UND
 * /api/heizlast/anfrage (Speicherung in heizlast_anfragen) genutzt, damit
 * beide Stellen serverseitig neu berechnete, nicht client-manipulierbare
 * Ergebnisse verwenden.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function bedarfFiltern(e: any) {
  return {
    gebaeudeheizlastKW: e.gebaeudeheizlastKW,
    spezifischWproM2: e.spezifischWproM2,
    normAussentemperatur: e.normAussentemperatur,
    warmwasserKW: e.warmwasserKW,
    gesamtKW: e.gesamtKW,
    wpEmpfehlung: e.wpEmpfehlung,
    positionen: (e.positionen as any[]).map((p) => ({
      key: p.key, label: p.label, verlustW: p.verlustW, anteil: p.anteil,
    })),
    hinweise: e.hinweise,
  };
}

export function verbrauchFiltern(e: any) {
  return {
    gebaeudeheizlastKW: e.gebaeudeheizlastKW,
    spezifischWproM2: e.spezifischWproM2,
    normAussentemperatur: e.normAussentemperatur,
    warmwasserKW: e.warmwasserKW,
    gesamtKW: e.gesamtKW,
    wpEmpfehlung: e.wpEmpfehlung,
    endenergieKWh: e.endenergieKWh,
    nutzwaermeKWh: e.nutzwaermeKWh,
    trinkwarmwasserKWh: e.trinkwarmwasserKWh,
    raumwaermeKWh: e.raumwaermeKWh,
    vollbenutzungsstunden: e.vollbenutzungsstunden,
    hinweise: e.hinweise,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
