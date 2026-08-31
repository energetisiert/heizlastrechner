# Heizlastrechner — Next.js-Grundgerüst (Phase 1)

Beweist die Kette Next.js → Vercel → Supabase → serverseitige Rechenlogik.
Die volle Oberfläche (Kacheln, Baujahr-Regler, vier Tabs, Vor-Ort-Formular)
aus dem geprüften HTML-Prototyp folgt in Phase 2, sobald diese Kette live steht.

Lokal gebaut und getestet: `npm run build` läuft fehlerfrei durch, die
API-Route liefert für den bekannten Referenzfall (EFH 150 m², Baujahr
1958-68, unsaniert, PLZ 90762) exakt 17,32 kW / 115,5 W/m² — deckungsgleich
mit den 111 Regressionstests des Prototyps.

## Was hier drin ist

- `lib/heizlast/logik.ts` — die komplette Rechenlogik, TypeScript-Port von
  `heizlastlogik.js` aus dem Prototyp. Läuft ausschließlich serverseitig.
- `app/api/heizlast/berechnen/route.ts` — nimmt Bedarf/Verbrauch entgegen,
  rechnet, liefert Ergebnis, Abgleich, Wärmepumpen-Eignung und Lead-Bewertung.
- `app/api/heizlast/anfrage/route.ts` — nimmt das Vor-Ort-Kontaktformular
  entgegen, validiert serverseitig, schreibt nach Supabase.
- `lib/supabase/{client,server}.ts` — Supabase-Clients nach dem offiziellen
  `@supabase/ssr`-Muster.
- `supabase/migrations/0001_heizlast_anfragen.sql` — die einzige Tabelle, die
  es für Phase 1 braucht. Bewusst ohne Mandantenmodell, das kommt erst mit
  einem Auth-System (siehe unten).
- `app/page.tsx` — minimale Testseite mit drei Feldern, ruft die API auf.

## Security-Architektur (Stand August 2026)

Die Berechnungslogik (U-Werte, Vollbenutzungsstunden, Gebäudetypologie,
Klimafaktoren, Lead-Scoring) liegt ausschließlich serverseitig in
`lib/tools/heizlast/engine.ts` (mit `server-only`-Guard: ein versehentlicher
Client-Import bricht den Build). Die API-Responses enthalten nur gerundete
Endwerte und UI-Strings — keine Koeffizienten, U-Werte oder Geometrie.

Schutzschichten der API (`/api/heizlast/*`):

1. **Origin-Enforcement** — nur heizlastrechner.energetisiert.de,
   tools.energetisiert.de, energetisiert.de oder Same-Origin (Previews).
2. **Vercel BotID** — `checkBotId()` in beiden Routes; Client-Pfade in
   `instrumentation-client.ts` registriert, `withBotId` in next.config.ts.
3. **Signierte Request-Tokens** — Middleware stellt ein httpOnly-Cookie mit
   HMAC-Token aus (30 min TTL, signiert mit `REQUEST_TOKEN_SECRET`); die API
   lehnt Requests ohne gültiges Token ab.
4. **Rate-Limiting** — Supabase-Funktion `bump_rate_limit` (Migration 0002),
   pro IP-Hash: 60/min Berechnung, 5/min Anfrage. IPs werden als
   SHA-256(IP + IP_SALT) gespeichert, nie im Klartext (DSGVO).
5. **Honeypot + Mindestausfüllzeit** im Lead-Formular; Bots erhalten eine
   Fake-Erfolgsantwort.
6. **robots.txt** — `Disallow: /api/`, Landingpage bleibt indexierbar.

Benötigte Env-Variablen: siehe `.env.example` (`IP_SALT` und
`REQUEST_TOKEN_SECRET` für Produktion zwingend, sonst Fail-open mit
Log-Warnung).

**Cookies/DSGVO:** Es werden ausschließlich technisch notwendige Cookies
gesetzt (signiertes Request-Token, httpOnly). Kein Tracking, kein
Cookie-Banner erforderlich. Impressum/Datenschutz verlinken im Footer auf
energetisiert.de.

## Lokal starten

```bash
npm install
cp .env.local.example .env.local   # danach mit echten Werten befüllen
npm run dev
```

## Auf Vercel bringen

1. Repo auf GitHub pushen, in Vercel importieren.
2. Im Vercel-Projekt: Integrations → Supabase installieren (oder per CLI:
   `vc i supabase`). Das setzt die Env-Variablen automatisch.
3. `vercel link` und `vercel env pull .env.local`, um sie auch lokal zu haben.
4. Migration in Supabase ausführen: SQL-Editor im Supabase-Dashboard öffnen,
   Inhalt von `supabase/migrations/0001_heizlast_anfragen.sql` einfügen, Run.
5. Push auf `main` → Vercel deployt automatisch.

## Was als Nächstes kommt (Phase 2)

- Die vollständige Oberfläche aus dem Prototyp (`heizlastrechner.html`) als
  React-Komponenten nachbauen: Kacheln, Baujahr-Regler, vier Tabs, Wärme-
  pumpen-Ampel, Vor-Ort-Formular mit Datenübernahme.
- n8n-Webhook in `app/api/heizlast/anfrage/route.ts` scharfschalten, sobald
  Fabio die Workflow-URL hat (Stelle ist mit TODO markiert).
- Custom Domain `tools.energetisiert.de/heizlast` einrichten.
- Fachliche Freigabe der U-Werte und Vollbenutzungsstunden durch Wladi.
