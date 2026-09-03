-- ACHTUNG (Stand 2026-09-02): Diese Migration ist HISTORISCH und bildet
-- NICHT mehr das aktuell live geschaltete Schema ab. Seit der
-- Supabase-Kostenkonsolidierung laeuft das Heizlastrechner-Rate-Limiting im
-- geteilten Projekt "Tool Hub energetisiert." ueber public.rate_limit_hit()
-- (Migration rate_limit_consolidation dort), aufgerufen mit dem
-- oeffentlichen anon/publishable Key -- nicht mehr ueber bump_rate_limit()
-- und einen Service-Role-Key, wie unten definiert. Bei einem Replay dieser
-- Migration (frisches Projekt, Disaster Recovery) existiert
-- heizlast_bump_rate_limit() NICHT, lib/security/rate-limit.ts faellt dann
-- fail-open zurueck (Rate-Limiting stillschweigend deaktiviert, siehe dortige
-- Warnung). Nicht mehr aktualisieren -- als Referenz fuer die urspruengliche
-- Architektur belassen.
--
-- Rate-Limiting für die Heizlast-API (Fixed Window, 60s).
-- IPs werden nie im Klartext gespeichert: ip_hash = SHA-256(IP + IP_SALT),
-- der Hash wird serverseitig in Next.js gebildet (lib/security/guards.ts).

create table if not exists public.rate_limits (
  id            bigint generated always as identity primary key,
  ip_hash       text        not null,
  route         text        not null,
  window_start  timestamptz not null,
  request_count integer     not null default 1,
  unique (ip_hash, route, window_start)
);

comment on table public.rate_limits is
  'Fixed-Window-Rate-Limits pro IP-Hash und Route. Zugriff ausschließlich über den Service-Role-Key (RLS: keine Policies, default deny).';

-- RLS aktiv, bewusst OHNE Policies: anon und authenticated können weder
-- lesen noch schreiben. Der Service-Role-Client umgeht RLS.
alter table public.rate_limits enable row level security;

-- Atomarer Zähler: legt das aktuelle Zeitfenster an bzw. erhöht es und
-- gibt den neuen Zählerstand zurück. SECURITY DEFINER, damit die Funktion
-- unabhängig von RLS arbeitet; Ausführungsrecht nur für service_role.
create or replace function public.bump_rate_limit(
  p_ip_hash text,
  p_route text,
  p_window_seconds integer default 60
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (ip_hash, route, window_start, request_count)
  values (p_ip_hash, p_route, v_window, 1)
  on conflict (ip_hash, route, window_start)
  do update set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count;
end;
$$;

revoke all on function public.bump_rate_limit(text, text, integer) from public;
revoke all on function public.bump_rate_limit(text, text, integer) from anon;
revoke all on function public.bump_rate_limit(text, text, integer) from authenticated;
grant execute on function public.bump_rate_limit(text, text, integer) to service_role;

-- Aufräumfunktion für alte Fenster (per Cron oder gelegentlich manuell).
create or replace function public.prune_rate_limits() returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where window_start < now() - interval '1 hour';
$$;

revoke all on function public.prune_rate_limits() from public;
revoke all on function public.prune_rate_limits() from anon;
revoke all on function public.prune_rate_limits() from authenticated;
grant execute on function public.prune_rate_limits() to service_role;
