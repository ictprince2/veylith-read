-- 002_sources_projects_audits.sql
-- Run this in Supabase SQL Editor after 001_profiles.sql.

-- Helper: check if the current user is an admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- ======================
-- sources
-- ======================
create table public.sources (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  source_type   text not null default 'api',
  base_url      text not null,
  enabled       boolean not null default true,
  last_sync_at  timestamptz,
  last_error    text
);

alter table public.sources enable row level security;

create unique index sources_name_unique on public.sources (name);

create policy "Sources: admin only"
  on public.sources
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ======================
-- projects
-- ======================
create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null,
  chain          text not null default '',
  repository_url text
);

alter table public.projects enable row level security;

create unique index projects_slug_unique on public.projects (slug);

create policy "Projects: admin write, public read"
  on public.projects
  for all
  using (public.is_admin() or true)
  with check (public.is_admin());

-- ======================
-- audits
-- ======================
create table public.audits (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references public.sources(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  title        text not null,
  auditor      text not null default '',
  audit_date   date,
  report_url   text,
  source_url   text not null,
  content_hash text,
  version      integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.audits enable row level security;

-- Audit identity constraint: each source+URL pair is unique.
create unique index audits_source_url_unique
  on public.audits (source_id, source_url);

-- Supports join from sources, lookups by project.
create index audits_source_id_idx on public.audits (source_id);
create index audits_project_id_idx on public.audits (project_id);

create policy "Audits: admin write, public read"
  on public.audits
  for all
  using (public.is_admin() or true)
  with check (public.is_admin());

-- ======================
-- findings
-- ======================
create table public.findings (
  id          uuid primary key default gen_random_uuid(),
  audit_id    uuid not null references public.audits(id) on delete cascade,
  external_id text,
  title       text not null,
  severity    text not null default 'informational',
  category    text not null default '',
  description text not null default '',
  source_url  text
);

alter table public.findings enable row level security;

create index findings_audit_id_idx on public.findings (audit_id);

-- Prevent duplicate findings per audit on re-sync.
create unique index findings_audit_external_id_unique
  on public.findings (audit_id, external_id)
  where external_id is not null;

create policy "Findings: admin write, public read"
  on public.findings
  for all
  using (public.is_admin() or true)
  with check (public.is_admin());

-- ======================
-- audit_versions
-- ======================
create table public.audit_versions (
  id                 uuid primary key default gen_random_uuid(),
  audit_id           uuid not null references public.audits(id) on delete cascade,
  version            integer not null,
  content_hash       text,
  retrieved_at       timestamptz not null default now(),
  change_summary     text,
  normalized_content text
);

alter table public.audit_versions enable row level security;

-- Unique: each audit+version pair.
create unique index audit_versions_audit_version_unique
  on public.audit_versions (audit_id, version);

create index audit_versions_audit_id_idx on public.audit_versions (audit_id);

create policy "Audit versions: admin write, public read"
  on public.audit_versions
  for all
  using (public.is_admin() or true)
  with check (public.is_admin());

-- ======================
-- sync_runs
-- ======================
create table public.sync_runs (
  id                 uuid primary key default gen_random_uuid(),
  source_id          uuid not null references public.sources(id) on delete cascade,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  status             text not null default 'running',
  records_created    integer not null default 0,
  records_updated    integer not null default 0,
  records_unchanged  integer not null default 0,
  error              text
);

alter table public.sync_runs enable row level security;

create index sync_runs_source_id_idx on public.sync_runs (source_id);

create policy "Sync runs: admin only"
  on public.sync_runs
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ======================
-- updated_at trigger for audits
-- ======================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger audits_updated_at
  before update on public.audits
  for each row
  execute function public.set_updated_at();
