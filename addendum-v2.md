# Addendum v2 — Reader Auth + Security Intelligence (v1, scoped)

Extends AGENTS.md. Build in the order listed below. Commit and push after
each numbered phase — do not batch multiple phases into one push, since
this environment has a history of memory crashes mid-build and a phase
boundary is where you want to be able to recover from.

## Environment constraints (read this before running anything)
This project is developed inside a proot Debian environment on Android
(Termux), which cannot run native binaries — this has already caused
build/test failures here before (SWC, oxide, lightningcss, esbuild-based
tools all crash with "Bus error" in this environment). This is a hard
environment limitation, not something to work around with flags or
retries. Given that:
- **Never run `npm run build` or `npm run test` locally.** They will not
  work here regardless of the code's correctness. Verification happens
  on Vercel's deploy log after push, not on-device.
- **Never install or run the Supabase CLI locally.** It's a native
  binary and will hit the same wall. For any schema change, output the
  SQL as a plain `.sql` file in the repo and tell the user to run it
  manually in Supabase's web-based SQL Editor — do not attempt to apply
  migrations yourself.
- **`npm install` and `npm run lint` are fine locally** — these have
  worked reliably in this environment so far.
- **Keep each step's diff small.** A step that touches many files at
  once is harder to recover from if the session crashes partway through.
  If a step naturally splits into two commits, split it.
- If a long-running or memory-heavy operation is genuinely required,
  say so explicitly and wait for confirmation before starting it, rather
  than running it unattended.

## Already done (manual, outside code)
- Supabase project created, connected to Vercel (env vars auto-synced)
- Google OAuth provider enabled in Supabase, credentials set
- GitHub OAuth provider enabled in Supabase, credentials set

Do not re-do or touch this setup. Env vars are already present in Vercel:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (exact names
may carry the `STORAGE_` prefix set during integration — check Vercel's
env var list before assuming a name; do not hardcode a guessed name).

## Auth model
- Readers sign in via Google or GitHub through Supabase Auth. No
  email/password form needed for v1 — both OAuth providers are already
  live, that's enough.
- One `profiles` table, one row per authenticated user, created
  automatically on first sign-in (Supabase trigger or first-request
  upsert — pick whichever is less code).
- `profiles.is_admin boolean default false`.
- Admin access = same login as everyone else, gated by that one flag.
  No separate admin password, no separate login page.
- Promoting yourself to admin is a one-time manual SQL step in Supabase's
  SQL editor after your account exists:
  ```sql
  update profiles set is_admin = true where email = 'your-email@example.com';
  ```
  Do not build a UI for this — it's a one-person, one-time action.
- **Profile creation security:** the trigger/function that creates a
  `profiles` row on first sign-in must hardcode `is_admin = false` — it
  must never read this value from signup metadata, OAuth provider data,
  or any client-supplied input. Additionally, RLS policies on `profiles`
  must prevent a user from updating their own `is_admin` column via a
  client-side update call (e.g. a policy that allows users to update
  their own row but excludes `is_admin` from what they're permitted to
  change, or a trigger that rejects/reverts any change to `is_admin`
  not made by a service-role/admin context). The only path to
  `is_admin = true` is the manual SQL statement above, run by the owner
  directly in Supabase's SQL Editor.

## Data model (Supabase Postgres, via Supabase client — no separate ORM needed
## since Supabase already provides a typed client and RLS)
```
profiles      { id (uuid, = auth.users.id), email, is_admin, created_at }
sources       { id, name, source_type, base_url, enabled, last_sync_at, last_error }
projects      { id, name, slug, chain, repository_url }
audits        { id, source_id, project_id, title, auditor, audit_date,
                report_url, source_url, content_hash, version, created_at, updated_at }
findings      { id, audit_id, external_id, title, severity, category,
                description, source_url }
audit_versions{ id, audit_id, version, content_hash, retrieved_at, change_summary,
                normalized_content }
sync_runs     { id, source_id, started_at, completed_at, status,
                records_created, records_updated, records_unchanged, error }
```
Row Level Security: `sources`, `sync_runs`, and write access to `audits`/
`findings`/`audit_versions`/`projects` are admin-only (check `is_admin` via
a Postgres function or policy). Read access to audits/findings/projects is
public — no login required to browse.

`audit_versions.normalized_content` holds the actual normalized text of
that version — not just its hash. Reasoning: a hash alone tells you
*that* something changed, not *what*. Without stored content, "previous
version" in the UI has nothing to display and nothing to diff against,
and there is no way to backfill it later — once a source's report changes
again, whatever the prior version looked like is gone if it was never
captured. Populate this column from v1 (store the normalized text
`normalize()` produces, before it's written to `audits`), even if the UI
for viewing/diffing old versions comes later. Store as `text`, not
`jsonb`, unless the normalized shape is genuinely structured data.

## Data integrity clarifications
- **Audit identity:** each imported audit must have a stable identity
  derived from its source and canonical source URL — e.g. a unique
  constraint or generated key on `(source_id, source_url)`. A later
  sync of the same source record must UPDATE the existing `audits` row,
  never INSERT a new one. Without this, every sync run silently
  duplicates every audit it has already imported.
- **Version semantics:** `audit_versions.version` is an internal,
  monotonically increasing integer scoped to that audit (1, 2, 3, ...),
  assigned by this system — it is NOT the external source's own version
  label, commit hash, or revision string (sources won't agree on
  versioning conventions, so the internal model must not depend on
  them). `audits.version` always mirrors the latest internal version
  number for that audit.
- **Uniqueness constraints (enforced at the database level, not just in
  application code):**
  - `projects.slug` — unique
  - `sources.name` — unique
  - `(audit_id, version)` in `audit_versions` — unique
  - `(source_id, source_url)` in `audits` — unique (this is the audit
    identity constraint above)
  These must be real database constraints (`UNIQUE`, or a unique index),
  not just checks in application code — app-level checks can be
  bypassed by a race condition or a future code path that forgets to
  check. The constraint should fail loudly if violated.

## Sources — v1 is Hacken + Immunefi only
Cyfrin, Pashov, and the AI/RAG layer are explicitly deferred. Do not start
them until all 8 build steps below are live and stable in production.

## Versioning rule (unchanged — this part was already right)
1. Fetch new content.
2. Hash it (sha256 of normalized content).
3. Compare against latest stored hash for that audit.
4. Unchanged → update `last_sync_at` only.
5. Changed → insert new `audit_versions` row, update `audits`, never
   delete or overwrite a prior version.

## Source adapter interface — uniform pipeline, no source-specific branching
Every source runs through the exact same six stages, in the exact same
order, called from one shared orchestrator — never from per-source
conditional logic in the application layer:

```
discover() → fetch() → parse() → normalize() → validate() → store()
```

```typescript
interface AuditSourceAdapter {
  discover(): Promise<RawRecord[]>;
  fetch(record: RawRecord): Promise<RawContent>;
  parse(content: RawContent): ParsedAudit;
  normalize(parsed: ParsedAudit): NormalizedAudit;
  validate(normalized: NormalizedAudit): ValidationResult; // reject malformed data here, before store()
  sourceUrl(record: RawRecord): string;
}
```
`store()` is NOT part of the adapter — it's one shared function in the
orchestrator that every adapter's output passes through identically
(hash comparison, version insert, `audits` upsert). An adapter's job ends
at producing validated, normalized data; it never touches the database
directly.

Two files: `/lib/sources/hacken.ts`, `/lib/sources/immunefi.ts` — each
implementing the interface above, nothing more. A third source later
(`/lib/sources/cyfrin.ts`) is a new file implementing the same interface,
never an `if (source === 'hacken')` branch added somewhere in the app.
The orchestrator that runs `discover → fetch → parse → normalize →
validate → store` is written once and takes any `AuditSourceAdapter` —
it should not know or care which specific source it's running.

## Routes
```
/security                 — overview
/security/audits          — list, filterable by severity/chain/source, public
/security/audits/[id]     — single audit, findings, version history, public
/security/projects/[slug] — public
/login                    — Google + GitHub sign-in buttons only
/admin/sources            — admin-only, enable/disable, last sync status, "Sync now"
```
API:
```
POST /api/admin/sync/:sourceId   — admin-only, rate-limited, triggers one sync run
GET  /api/admin/sync-runs        — admin-only, recent sync history
```
Admin-only routes check `profiles.is_admin` server-side on every request —
never trust a client-side flag alone.

## Source transparency (unchanged — non-negotiable)
Every imported audit/finding visibly shows:
```
Source: Hacken
Original report: [link]
Retrieved: [timestamp]
```
Never presented as original Veylith Read content. Never strip attribution.

## Safety rules (unchanged — non-negotiable)
- Never execute code from ingested repos or reports.
- Sanitize all ingested Markdown/HTML before render.
- Allowlist source domains in each adapter.
- Rate-limit the manual sync endpoint.
- Mocked fixtures for tests — no live external calls in the test suite.
- Server-side admin checks on every admin route/API, not just UI hiding.

## Build order (commit + push after each)
1. Supabase schema: `profiles` table + trigger to create a row on first
   sign-in (hardcoding `is_admin = false` per the profile creation
   security rule above), `is_admin` column, RLS policies that prevent
   users from changing their own `is_admin`. Verify the trigger works
   by signing in once yourself and checking the row appears with
   `is_admin = false`.
2. `/login` page with Google + GitHub buttons wired to Supabase Auth.
   Confirm a real sign-in works end-to-end on the deployed Vercel URL.
3. Manually promote your account to admin via the SQL step above.
4. Remaining tables (`sources`, `projects`, `audits`, `findings`,
   `audit_versions`, `sync_runs`) + RLS + the uniqueness constraints
   listed in "Data integrity clarifications" above.
5. `HackenAdapter` + `POST /api/admin/sync/:sourceId` + `sync_runs`
   logging. Get this one source fully working before adding Immunefi.
6. `/security/audits` public list page reading from the DB.
7. `ImmunefiAdapter` (parses Markdown from the public GitHub repo).
8. `/admin/sources` panel — admin-only, shows sync status, manual
   "Sync now" button.

Do not start Cyfrin, Pashov, Vercel Cron scheduling, or the AI/RAG layer
until all 8 steps above are live and verified in production.
