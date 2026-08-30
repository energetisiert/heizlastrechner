# Übergabe an Claude Code — Heizlastrechner (energetisiert.)

Dieses Projekt kam aus einem Chat mit Claude (claude.ai) und ist lokal vollständig fertig
und getestet. Es fehlt nur noch der Deploy, weil das Chat-Interface beim Übertragen
großer Dateien in den Deploy-Aufruf wiederholt gescheitert ist. Claude Code arbeitet
direkt mit den Dateien auf der Festplatte — dieses Problem entfällt dort komplett.

## Was zu tun ist (in dieser Reihenfolge)

1. `npm install`
2. `npm run build` — muss fehlerfrei durchlaufen (lokal bereits mehrfach bestätigt)
3. Git-Repo initialisieren, falls noch keins existiert: `git init && git add -A && git commit -m "Heizlastrechner: vollständige Oberfläche"`
4. Repo zu GitHub pushen und in Vercel unter dem bestehenden Projekt `heizlastrechner`
   (Team `energetisiert`) verknüpfen — dann übernimmt Vercel den Deploy bei jedem Push.
   Das ist der empfohlene Weg für alle künftigen Änderungen, nicht die manuelle CLI-Deploy.
5. Alternativ direkt: `vercel link` (Projekt `heizlastrechner`, Team `energetisiert`),
   dann `vercel --prod`.
6. **Vercel Authentication deaktivieren**, falls noch nicht geschehen: Vercel-Dashboard →
   Projekt `heizlastrechner` → Settings → Deployment Protection → Vercel Authentication
   auf "Only Preview Deployments" oder "Disabled" stellen. Sonst ist der Live-Link nur mit
   Vercel-Login erreichbar.
7. Supabase-Integration in Vercel verknüpfen, falls noch nicht geschehen: Vercel-Projekt →
   Settings → Integrations → Supabase → Projekt `heizlastrechner` (ID `shrqfveefrlcyqsrqkhi`,
   Region eu-central-1) auswählen. Setzt automatisch `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
8. Für lokale Entwicklung: `vercel env pull .env.local` statt Werte von Hand einzutragen
   (siehe `.env.local.example`).

## Infrastruktur, die schon existiert

- **Vercel:** Team `energetisiert` (ID `team_MTqGHemdGYmtzQ4LQrWEf9El`), Projekt `heizlastrechner`
- **Supabase:** Projekt `heizlastrechner` (ID `shrqfveefrlcyqsrqkhi`), Organisation `energetisiert.`
  (ID `lmrmwnvofrwvensisvxb`), Region eu-central-1 (Frankfurt), Free-Tier
- Tabelle `heizlast_anfragen` ist bereits angelegt (Migration liegt unter
  `supabase/migrations/0001_heizlast_anfragen.sql`), RLS aktiv, anon darf nur INSERT

## Was fertig und lokal verifiziert ist

- `npm run build` läuft fehlerfrei durch (Next.js 16.3.3, Turbopack)
- Lokaler Server liefert die Seite reproduzierbar mit identischer Byte-Größe
- API-Referenzfall bestätigt: EFH 150 m², Baujahr 1958–1968, unsaniert, PLZ 90762 →
  **17,32 kW / 115,5 W/m²** (deckt sich exakt mit dem ursprünglichen, 112-fach
  regressionsgetesteten Prototyp)
- Alle vier Brand-Farben stecken korrekt im ausgelieferten CSS (`#1F7A4D`, `#14281E`,
  `#7FC9A2`, `#FBFBFA`)
- Mobile-Korrekturen eingebaut: 16px Schriftgröße auf allen Inputs (verhindert
  iOS-Safari-Auto-Zoom), Mindesthöhe 40–50px auf allen Tap-Zielen
- Fachmodus-Umschalter komplett entfernt (User-Wunsch), Logo (`public/energetisiert-logo.png`)
  im Header eingebunden statt Text-Wortmarke

## Bekannte, bewusst offene fachliche Lücke

Die Norm-Außentemperatur im Bedarfsverfahren kommt nur aus einer groben 10-stufigen
PLZ-Tabelle (`lib/heizlast/logik.js`, `normAussentemp`), nicht aus der postleitzahlgenauen
DIN/TS-12831-1-Referenztabelle (8.199 Orte). Diese Tabelle ist eine kostenpflichtige
Beuth-Verlag-Datei und wurde bewusst nicht nachgebildet. Für den kostenlosen Rechner
akzeptabel, im Tool bereits als "überschlägig" gekennzeichnet — nur falls das Thema
nochmal aufkommt, damit die Einschränkung nicht neu hergeleitet werden muss.

## Projektstruktur

```
app/page.tsx                          Hauptkomponente, State, alle vier Tabs
app/globals.css                       Vollständiges Brand-Guide-CSS
app/layout.tsx                        Root-Layout, Google-Fonts-Links
app/api/heizlast/berechnen/route.ts   Serverseitige Berechnung (ruft lib/heizlast/logik.js)
app/api/heizlast/anfrage/route.ts     Lead-Formular → Supabase
components/HeizlastBausteine.tsx      Statische Kacheln/Labels, kleine UI-Hilfskomponenten
components/IconSprite.tsx             SVG-Icon-Sprite
lib/heizlast/logik.js                 Rechenlogik (minifiziert; Quelle mit Tests im
                                       ursprünglichen Prototyp-Repo, nicht Teil dieses Exports)
lib/supabase/{client,server}.ts       Supabase-Clients (Browser/Server + Admin)
public/energetisiert-logo.png         Logo, freigestellt
supabase/migrations/                  SQL-Migration für heizlast_anfragen
```

## Offene Punkte für Phase 2 (nicht blockierend für den Deploy)

- n8n-Webhook in `app/api/heizlast/anfrage/route.ts` ist als TODO-Kommentar vorbereitet,
  noch nicht scharfgeschaltet (wartet auf Fabios Workflow-URL)
- Custom Domain `tools.energetisiert.de/heizlast` noch nicht eingerichtet
- PLZ-genaue Norm-Außentemperatur (siehe oben) als möglicher Phase-2-Kauf
