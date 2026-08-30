-- 0001_heizlast_anfragen.sql
-- energetisiert. Heizlastrechner — erste Migration
--
-- Bewusst nur EINE Tabelle für den Start. Das volle Datenmodell aus der SPEC
-- (heizlast_faelle + heizlast_anfragen mit organisation_id, RLS je Mandant)
-- setzt ein Auth-/Organisationssystem voraus, das es in diesem ersten Schritt
-- noch nicht gibt. Diese Tabelle speichert Lead plus kompletten Rechnerstand
-- in einer Zeile. Wenn später ein Mandantensystem dazukommt (z. B. über
-- supastarter), lässt sich das hier sauber aufteilen, ohne Daten zu verlieren.

create table if not exists public.heizlast_anfragen (
  id                  uuid primary key default gen_random_uuid(),
  erstellt_am         timestamptz not null default now(),

  -- Kontaktdaten aus dem Formular
  name                text not null,
  email               text not null,
  telefon             text,
  objekt_adresse      text not null,
  anlass              text,        -- waermepumpe | foerderung | abgleich | zweitmeinung
  zeitraum            text,        -- bald | monat | flexibel
  nachricht           text,

  -- Einwilligung: Pflichtfeld, Zeitpunkt muss nachweisbar sein
  dsgvo_zugestimmt_am timestamptz not null,

  -- Rechnerstand zum Zeitpunkt der Anfrage, vollständig, fürs Vorqualifizieren
  eingaben_bedarf     jsonb,
  eingaben_verbrauch  jsonb,
  ergebnis_bedarf     jsonb,
  ergebnis_verbrauch  jsonb,
  parameter_version   text,        -- PARAMS.version zum Zeitpunkt der Anfrage

  -- Vertrieb
  lead_punkte         int,         -- aus leadBewertung(), fürs Priorisieren
  angebotspreis_netto numeric,     -- beim Absenden eingefroren, nicht nachträglich neu berechnen
  status              text not null default 'neu'  -- neu | kontaktiert | terminiert | beauftragt | verloren
);

comment on table public.heizlast_anfragen is
  'Leads aus dem Heizlastrechner für die raumweise Vor-Ort-Berechnung (799 € netto). Enthält den vollständigen Rechnerstand zur Vorqualifizierung.';

-- Row Level Security: der anonyme Schlüssel darf nur anlegen, nie lesen.
-- Lesen/Bearbeiten läuft vorerst über das Supabase-Dashboard oder den
-- Service-Role-Key in einer künftigen internen Ansicht.
alter table public.heizlast_anfragen enable row level security;

create policy "anon darf anfragen anlegen"
  on public.heizlast_anfragen
  for insert
  to anon
  with check (true);

create policy "authentifiziert darf eigene anfragen lesen"
  on public.heizlast_anfragen
  for select
  to authenticated
  using (false); -- bewusst gesperrt, bis es ein Mandanten-/Rollenmodell gibt

-- Index für die Vertriebspriorisierung (Abschnitt 6, Monetarisierung: Leads
-- mit 5+ Punkten zuerst zurückrufen)
create index if not exists heizlast_anfragen_lead_punkte_idx
  on public.heizlast_anfragen (lead_punkte desc, erstellt_am desc);
