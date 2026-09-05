import { describe, expect, it } from 'vitest';
import { BAUALTERSKLASSEN, PARAMS, berechneBedarf, berechneVerbrauch, vergleiche, wpEignung } from './logik-core.js';

/**
 * Golden-Tests für den minifizierten Heizlast-Kern (byte-identisch im
 * Heizlastrechner und im Heizlastrechner GEP). Referenzfall = Standard-
 * eingaben der Oberfläche (EFH, Baualtersklasse 1958–1968, PLZ 90762,
 * 150 m², 2 Geschosse, 4 Personen, unsaniert; Verbrauch 2.800 m³ Erdgas 2025,
 * Niedertemperaturkessel). Die Zahlen wurden am 05.09.2026 aus dem Kern
 * gezogen und eingefroren -- jede Änderung an logik-core.js muss sie
 * weiterhin exakt liefern oder den Test bewusst anpassen.
 *
 * Klimafaktoren: DWD Open Data, "Klimafaktoren für Energieverbrauchsausweise"
 * (opendata.dwd.de/.../climate_correction_factor/recent/KF_<Jahr>0101_<Jahr>1231.csv),
 * je PLZ-Zweisteller gemittelt (95 Regionen) für 2020–2025; bundesweites
 * Mittel als Rückfall; 2019 ohne DWD-Jahresdatei (Altwert).
 */
const bedarf = {
  plz: '90762', normAussentempManuell: null, gebaeudetyp: 'efh', baualter: BAUALTERSKLASSEN[3],
  wohnflaeche: 150, geschosse: 2, raumhoehe: 2.5, nutzungseinheiten: 1, personen: 4,
  dachform: 'steilUnbeheizt', unterkellert: 'keller', lueftungWRG: false,
  stufen: { aussenwand: 'unsaniert', dach: 'unsaniert', fenster: 'unsaniert', boden: 'unsaniert' },
};
const verbrauch = {
  plz: '90762', energietraeger: 'erdgas_m3', verbrauch: 2800, verbrauchsjahr: 2025, erzeuger: 'niedertemperatur',
  nutzungsgradManuell: null, twwSeparat: false, personen: 4, nutzungseinheiten: 1, nutzerverhalten: 'normal',
  zirkulation: false, solarthermie: false, heizgrenztemperatur: 15, vollbenutzungsstundenManuell: null, wohnflaeche: 150,
};

describe('Bedarfsverfahren (Hüllflächen, IWU-Typologie)', () => {
  const b = berechneBedarf(bedarf);
  it('Baualtersklasse 3 = 1958-1968', () => expect(BAUALTERSKLASSEN[3]).toBe('1958-1968'));
  it('Gebäudeheizlast 17,32 kW, 115,5 W/m², NAT -14 °C (Leitziffer 9)', () => {
    expect(b.gebaeudeheizlastKW).toBe(17.32);
    expect(b.spezifischWproM2).toBe(115.5);
    expect(b.normAussentemperatur).toBe(-14);
  });
  it('Warmwasser 1 kW, gesamt 18,32 kW, WP-Empfehlung 16,5–20,2 kW', () => {
    expect(b.warmwasserKW).toBe(1);
    expect(b.gesamtKW).toBe(18.32);
    expect(b.wpEmpfehlung).toEqual({ min: 16.5, max: 20.2 });
  });
  it('Außenwand dominiert die Verluste (7.710 W, 44,5 %)', () => {
    const aw = b.positionen.find((p: { key: string }) => p.key === 'aussenwand');
    expect(aw).toBeDefined();
    expect(aw!.verlustW).toBe(7710);
    expect(aw!.anteil).toBe(44.5);
  });
  it('übliche Sanierung aller Bauteile: 7,48 kW (49,9 W/m²)', () => {
    const s = berechneBedarf({ ...bedarf, stufen: { aussenwand: 'ueblich', dach: 'ueblich', fenster: 'ueblich', boden: 'ueblich' } });
    expect(s.gebaeudeheizlastKW).toBe(7.48);
    expect(s.spezifischWproM2).toBe(49.9);
  });
  it('PLZ-Leitziffer 8 → NAT -16 °C → 18,34 kW', () => {
    const m = berechneBedarf({ ...bedarf, plz: '80331' });
    expect(m.normAussentemperatur).toBe(-16);
    expect(m.gebaeudeheizlastKW).toBe(18.34);
  });
  it('WP-Eignung bei 115,5 W/m²: bedingt / gelb', () => {
    expect(wpEignung(b.spezifischWproM2)).toMatchObject({ stufe: 'bedingt', ampel: 'gelb' });
  });
});

describe('Verbrauchsverfahren (Vollbenutzungsstunden, DWD-Klimafaktoren je PLZ-Region)', () => {
  const v = berechneVerbrauch(verbrauch);
  it('2.800 m³ Erdgas → 30.240 kWh Endenergie (KF 1,08 für 90xxx/2025), 24.309 kWh Raumwärme', () => {
    expect(v.endenergieKWh).toBe(30240);
    expect(v.raumwaermeKWh).toBe(24309);
    expect(v.trinkwarmwasserKWh).toBe(2000);
    expect(v.vollbenutzungsstunden).toBe(2100);
  });
  it('Gebäudeheizlast 11,58 kW, 77,2 W/m²', () => {
    expect(v.gebaeudeheizlastKW).toBe(11.58);
    expect(v.spezifischWproM2).toBe(77.2);
  });
  it('Klimafaktor-Tabelle: 90xxx 2025 = 1,08; 2024 = 1,18; 10xxx 2024 = 1,31; Bundesmittel 2025 = 1,09', () => {
    expect(PARAMS.klimafaktorPlz[2025]['90']).toBe(1.08);
    expect(PARAMS.klimafaktorPlz[2024]['90']).toBe(1.18);
    expect(PARAMS.klimafaktorPlz[2024]['10']).toBe(1.31);
    expect(PARAMS.klimafaktor[2025]).toBe(1.09);
  });
  it('Regionalfaktor wirkt: Nürnberg 2024 12,74 kW, Berlin 14,24 kW, ohne PLZ Bundesmittel 12,85 kW', () => {
    expect(berechneVerbrauch({ ...verbrauch, verbrauchsjahr: 2024 }).gebaeudeheizlastKW).toBe(12.74);
    expect(berechneVerbrauch({ ...verbrauch, verbrauchsjahr: 2024, plz: '10115' }).gebaeudeheizlastKW).toBe(14.24);
    expect(berechneVerbrauch({ ...verbrauch, verbrauchsjahr: 2024, plz: '' }).gebaeudeheizlastKW).toBe(12.85);
  });
  it('manueller Klimafaktor 1,0 → 10,65 kW; 2019 nur Bundeswert 1,1 → 11,81 kW; 2021 Nürnberg 0,99 → 10,53 kW', () => {
    expect(berechneVerbrauch({ ...verbrauch, klimafaktorManuell: 1 }).gebaeudeheizlastKW).toBe(10.65);
    expect(berechneVerbrauch({ ...verbrauch, verbrauchsjahr: 2019 }).gebaeudeheizlastKW).toBe(11.81);
    expect(berechneVerbrauch({ ...verbrauch, verbrauchsjahr: 2021 }).gebaeudeheizlastKW).toBe(10.53);
  });
  it('Verbrauchsjahr ohne DWD-Faktor (2026): Faktor 1,0 mit sichtbarem Hinweis statt stiller Rückfall', () => {
    const v26 = berechneVerbrauch({ ...verbrauch, verbrauchsjahr: 2026 });
    expect(v26.gebaeudeheizlastKW).toBe(10.65);
    expect(v26.hinweise.some((h: string) => h.includes('2026') && h.includes('Klimafaktor'))).toBe(true);
  });
  it('Vergleich Bedarf/Verbrauch: -33,1 %, Ampel rot', () => {
    const vg = vergleiche(berechneBedarf(bedarf), v);
    expect(vg).not.toBeNull();
    expect(vg!.abweichungProzent).toBe(-33.1);
    expect(vg!.ampel).toBe('rot');
  });
  it('Rechtsstand-Stempel des Kerns', () => expect(PARAMS.rechtsstand).toBe('2026-09-05'));
});
