# Full-Project Audit Prompt — ratemygig

> **Usage:** Paste this entire file as the opening message of a fresh agent session
> (or point the agent at `.planning/AUDIT_PROMPT.md`). It is self-contained.
> **Output:** a single report at `docs/AUDIT_REPORT.md` — no code changes.

---

You are a senior full-stack auditor. Your mission: perform a comprehensive, evidence-based
audit of the **ratemygig** repository — functionality weaknesses, security risks, performance
and scalability bottlenecks, architecture/code-quality issues, testing gaps, ops gaps, and
product opportunities — and write a prioritized findings report to `docs/AUDIT_REPORT.md`.

This is a **read-only audit**. Do NOT fix, refactor, add dependencies, or modify migrations.
You may run read-only commands (builds, tests, lint, SQL SELECTs, curl, local dev server,
Playwright probes). Every finding must cite evidence (`file:line`, command output, or SQL
result). If you cannot verify something, label it explicitly as **UNVERIFIED**.

---

## 1. Project context (verified facts — trust these)

- **What:** Concert discovery + rating platform ("Letterboxd for gigs").
- **Stack:** React 19 + Vite 7 + Tailwind 3 SPA (`apps/web`), TanStack React Query, direct
  Supabase client queries (no API layer), Supabase Postgres/Auth (magic link + Google
  OAuth)/Storage, Supabase Edge Functions (Deno), Ticketmaster ingestion via `packages/jobs`
  run on GitHub Actions cron, static hosting on Vercel.
- **Monorepo:** `apps/web` · `packages/core` (domain types) · `packages/db` (15 migrations,
  001–015) · `packages/jobs` (TM ingest) · `supabase/functions/og-image` (OG image renderer).
- **State:** Sprints 1–7 complete (notifications, scheduled ingest, Friends Going + calendar
  export, UX correctness, perf/CI hardening, Gig Wrapped, share cards/OG images).
  Sprints 8 (setlist.fm import) and 9 (PWA + Web Push) are planned, not started.
- **Quality bar today:** 310 unit tests passing, 0 lint errors/warnings, CI
  (lint/test/build) green, main chunk 404 kB (gzip 122 kB).
- **Docs of record:** `.planning/SPRINTS.md` (backlog), `.planning/STATE.md` (decisions),
  `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/CONCERNS.md` (known concerns),
  `docs/ARCHITECTURE_REVIEW.md` (earlier review — assess which of its findings are stale),
  `docs/AGENT_CONTINUATION.md`, `DEPLOYMENT.md`.
- **Knowledge graph:** `graphify-out/GRAPH_REPORT.md` — god nodes today: `TicketmasterClient`
  (13 edges), `TicketmasterProvider` (10), `SyncService` (7), `mapEventRow()` (4).

## 2. Environment facts (verified this machine)

- Supabase CLI 2.115, logged in, linked project `lpfyzjfqyyrdknzgxoul` (eu-central-1).
  Run SQL: `supabase db query --linked --project-ref lpfyzjfqyyrdknzgxoul "<SELECT-only SQL>"`.
  **Read-only discipline: SELECT/informational queries only — never INSERT/UPDATE/DELETE/DDL.**
- `apps/web/.env.local` has `VITE_SUPABASE_URL` + anon key (published reviews are
  RLS-readable by anon).
- Edge Function live:
  `https://lpfyzjfqyyrdknzgxoul.supabase.co/functions/v1/og-image?reviewId=<id>`
  (public, `verify_jwt=false`, manual `status='published' AND is_public=true` filter).
- A real published review exists: `f9f9fe86-354a-4f6b-8000-5b42b83d7708`
  (Arctic Monkeys — The Car Tour, 5/5). Seed data: venue
  `b0000001-0000-4000-8000-000000000008` (Barclays Center, New York), artist
  `b0000002-0000-4000-8000-000000000007`, event `b0000003-0000-4000-8000-000000000007`.
- Verify commands (repo root): `npm run build` · `npm run test` · `npm run lint`.
- Local UI probe: `npm run dev` (port 3000) + Playwright (python or `npx playwright`).

## 3. Required reading (in order, before auditing)

1. `.planning/STATE.md` — **decisions are settled architecture** (direct Supabase queries,
   no repository pattern, feature-based structure, RPCs as server layer). Do not recommend
   re-litigating these without extraordinary evidence.
2. `.planning/codebase/CONVENTIONS.md`
3. `.planning/codebase/CONCERNS.md` — known concerns; your job is to verify/deepen/prioritize
   them, and find what's missing.
4. `docs/ARCHITECTURE_REVIEW.md` — mark each of its open items as resolved / still-open / stale.
5. `DEPLOYMENT.md` (incl. "Share Cards / OG Images" and "Scheduled Ingest").
6. `apps/web/src/app/App.tsx` (routes), `apps/web/src/shared/lib/supabase.ts`,
   `apps/web/src/shared/lib/env.ts`.
7. `packages/db/migrations/` — all 15, in order.

## 4. Audit dimensions

### Part A — Functional weaknesses (bugs & correctness) — HIGHEST PRIORITY

Hunt for and verify correctness bugs. Start with these **known seeds** (documented in
CONCERNS.md, Sprint 7 notes — confirm with concrete repro, then search for the same *class*
of bug elsewhere):

1. **CRITICAL — `/r/:reviewId` is broken on the live DB.** `reviews.user_id` FK references
   `auth.users`, not `public.profiles`, so every `profile:profiles(...)` embed on `reviews`
   fails with PostgREST 400 `PGRST200`. Affects `useReview` and `useEventReviews`
   (`apps/web/src/features/reviews/api/reviews.ts`). Repro: anon REST call
   `GET {SUPABASE_URL}/rest/v1/reviews?id=eq.f9f9fe86-...&select=*,profile:profiles(display_name)`.
   Audit: which other queries embed across this FK gap (comments? feed? reactions? drafts?).
   Propose fix options (add FK `reviews.user_id → profiles.id`; or view; or two-step fetch).
2. **HIGH — ArtistDetailPage crash when Supabase is configured.**
   `apps/web/src/features/artists/pages/ArtistDetailPage.tsx` (~line 383) calls
   `venueList.map(...)` but `useVenues()` returns `{ data, hasMore }`. Class-of-bug: audit
   **every consumer** of the paginated `{ data, hasMore }` APIs
   (`features/{venues,artists,events}/api/resolver.ts`) for shape mismatches. Mock mode hides
   these — check each page with the real DB (Playwright against `npm run dev`).
3. **Draft/private review gates.** Verify no query path leaks drafts or private reviews
   (client queries, Edge Function, `api/og-inject.ts`, notification trigger fan-out).
   Check `is_public` vs `status` consistency everywhere both exist.
4. **Notification semantics.** `(user_id, type, link)` dedupe means one notification per
   review ever (CONCERNS.md). Also: artist fan-out happens on `event_artists` INSERT —
   audit what happens when events are re-ingested/updated, and when a review is
   unpublished/deleted after notifications fired.
5. **Timezones.** Sprint 6 noted UTC-year bleed for Wrapped. Audit all date formatting
   (`shared/lib/utils.ts` formatDate, iCal builder, og-image date line) for TZ correctness.
6. **Error/empty/loading states.** Which routes lack skeletons or error boundaries?
   Which queries fail silently (`console.error` only)?
7. **Mock vs real drift.** Mock catalog (`features/events/providers/mock-catalog.ts`) vs DB
   shapes — where does mock mode diverge from production behavior?

### Part B — Security

1. **RLS policy-by-policy review** against `002_rls_policies.sql` + later migrations.
   For each table: can anon read exactly what's public? Can any authenticated user write
   only their own rows? Check `review_photos` access through parent review policy
   (flagged as unverified in CONCERNS.md).
2. **SECURITY DEFINER surface** (`013_notification_triggers.sql`, `014_friends_attendance.sql`,
   `015_user_year_stats.sql`): search_path pinning, the ignored `p_user_id` parameters — any
   new instance of caller-scoping assumptions that could be abused?
3. **Client-side rate limiting** (19 mutations) — enumerate what a scripted client can do
   unthrottled (review spam, follow/unfollow churn, photo upload floods, reaction toggles).
4. **`VITE_TICKETMASTER_API_KEY` in the bundle** — quantify real exposure, list realistic
   abuse vectors, and evaluate the deferred Edge-Function proxy option.
5. **Edge Function `og-image`**: service-role usage, manual visibility filter correctness,
   error path leaking internals? `api/og-inject.ts`: SSRF-ish concerns from reviewId handling?
6. **sanitizeText coverage** — grep for rendered user text not wrapped in `sanitizeText`
   (`{user.name}`, `title`, `body`, list names, setlist notes, song names...). Check input
   length validation (Zod schemas in `shared/validation/schemas.ts`) vs DB constraints.
7. **Signed URLs** — expiries, generation paths, any place public URLs are used on the
   private bucket.
8. **Auth & headers** — redirect URL configuration, session persistence, missing security
   headers (CSP, HSTS, frame-options) on the static host.

### Part C — Performance & scalability bottlenecks

For each: measure or estimate impact at 10 / 1,000 / 100,000 users.

1. **Feed** (`features/feed/api/feed.ts`): client-side merge of 4 sources with
   `Promise.allSettled`, offset-based "Load More" on all sources simultaneously — true
   pagination impossible; followed-id lists fetched whole. Design a cursor/RPC-based
   replacement (proposal only).
2. **Review lists**: `useEventReviews` fetches all reviews per event (no limit) and all
   photos; check signed-URL generation batching (`usePhotoUrls` / `getSignedPhotoUrls`) —
   per-photo calls or batched? N+1s?
3. **Friends Going** — one batched RPC per page is done; verify no per-card queries slipped in.
4. **Notification fan-out on ingest** — first ingest after triggers deploy bursts inserts;
   dedupe index write amplification for big follow graphs; consider queue/later batching.
5. **Ticketmaster ingest** — 1000-item/query deep-paging cap (city mode exists), GHA cron
   delays, 60-day scheduled-workflow auto-disable on quiet repos, no retry/alerting on
   partial failures.
6. **Edge Function** — ~200–500 ms cold start; image render CPU time vs the 2 s CPU limit;
   cache behavior of `Cache-Control` on Supabase edge (is `s-maxage` actually honored by a
   CDN in front?).
7. **DB**: check `003_indexes.sql` + later migrations against the *actual* query patterns
   (feed ranges, event reviews by event_id+created_at, notifications by user_id+is_read,
   follows by follower/followed, venues/artists by name+city). Note JSONB `ticket_urls` /
   `lineup` usage. `EXPLAIN` (read-only) the hot ones.
8. **Storage growth** — originals (max 1200px) + 300px thumbs stored per review photo;
   `blurhash` column exists but is never populated (CONVENTIONS.md) — opportunity.
9. **Bundle** — 404 kB index is fine; check per-route chunks for accidental heavy imports
   (date-fns locales, lucide icons full imports?).
10. **React Query hygiene** — staleTime choices, invalidation completeness after mutations,
    queries without `enabled` guards firing for anon users.

### Part D — Architecture & code quality

1. **Resolver triplication** — `features/{events,venues,artists}/api/resolver.ts` share the
   same Supabase-first + provider fallback + `resolveXxxWithDeps` pattern. Is extraction
   warranted or is the duplication acceptable? (Respect STATE.md: no repository layer.)
2. **Types** — is `packages/core` the single source of truth, or do pages/APIs redefine
   row shapes (e.g., inline types in `reviews.ts`, `OgReviewData` in `shared/lib/og.ts`)?
   Recommend the minimal consolidation that doesn't break the "no API layer" decision.
3. **God nodes & cohesion** — `TicketmasterClient`/`TicketmasterProvider`/`SyncService`
   coupling; `el()`/card-builder duplication between `og-image` and future render needs.
4. **Naming truthfulness** — e.g., `*.integration.test.ts` files never touch a real
   integration (mock-only). Rename or actually integrate?
5. **Dead code / stale artifacts** — unused exports, mock providers referenced only in
   dev, `VITE_EVENTS_PROVIDER` modes actually exercised, `mock-events.json` ↔
   `006_seed_mock_catalog.sql` sync risk.
6. **Conventions adherence spot-check** — named exports, function components, 4-space indent,
   single quotes, no comments, sanitizeText on rendered user text. Run lint and note gaps
   lint can't catch.
7. **Error handling consistency** — some queries throw to React Query, some swallow; pick
   the inconsistencies.

### Part E — Testing & CI gaps

1. No database in CI; e2e requires live Supabase (local-only). Evaluate: run
   `supabase start` (Docker) in CI for integration/e2e; or spin an ephemeral branch DB.
2. No mutation-mocking infrastructure for supabase mutations (documented Sprint 4 note) —
   optimistic-update rollback is only tested via pure helpers.
3. Coverage blind spots — which critical paths have zero tests (auth flows, photo upload
   pipeline, draft→publish, notifications rendering, Wrapped year boundaries)?
4. The 2 known bugs (Part A seeds) shipped past 310 tests — what test *class* would have
   caught each (shape contract tests? live-DB smoke in CI?), and recommend the cheapest one.
5. Edge Function has no automated test at all — propose a deploy-then-curl CI job or
   `supabase test` pattern.

### Part F — Product & feature ideas (opportunities, ranked)

Evaluate and rank by value/effort. Non-exhaustive seeds:

- Full-text/typeahead search is client-side only — server-side search (Postgres FTS) across
  events/artists/venues/reviews.
- Review richness: seat/section info (planned in old Phase D3, never built), setlist links
  (Sprint 8 dependency), photo captions, "was this helpful" sorting.
- Shareable Gig Wrapped card image — natural extension of the Sprint 7 `og-image` function.
- Digest emails / notification digests (preference gates already exist).
- Artist/venue claim & verification flow for organizers.
- Ticket price tracking / historical prices (TM data already ingested).
- Follow suggestions, onboarding taste-picker (preferences exist), richer profiles.
- i18n, light theme toggle, PWA (Sprint 9 planned).
- Public API / embeddable rating widget (would require the Edge-Function proxy work first).
- Data portability beyond CSV (JSON export, GDPR delete-account flow — check if account
  deletion even exists; `auth.users` cascade is configured — verify UX path).

### Part G — Ops, DX & deployment

1. No error tracking (Sentry), no product analytics, no uptime monitoring — recommend a
   minimal stack (Vercel Analytics? Sentry edge+web?) with effort estimates.
2. Ingest job observability — failures are silent beyond GHA logs; alerting options.
3. Env var sprawl — `.env.local` (web), `.env` (jobs), Vercel dashboard vars, GHA
   secrets/vars; document a single source-of-truth matrix (DEPLOYMENT.md partially does).
4. **Vercel rewrite unverified**: the `(?i)` user-agent regex in `apps/web/vercel.json`
   and `includeFiles` for `dist/og-shell.html` have never run on a real Vercel deploy.
   List exactly what to verify on first deploy (crawler UA → injected HTML; browser UA →
   SPA; `opengraph.xyz` validation) and the fallback plan if `(?i)` isn't supported
   (duplicate lowercase/uppercase alternation, or move matching into the function).
5. Backup/restore story, Supabase free-tier limits (DB size, edge invocations, storage),
   and what breaks at each tier.
6. Repo hygiene — `graphify-out` rebuild discipline, `.planning` staleness, README accuracy
   (commands, env vars).

## 5. Method requirements

- **Verify, don't assume.** For each candidate finding: reproduce (command, SQL, or browser
  probe), capture evidence, then write it up. Reading alone is not evidence for bug claims.
- **Live probes welcome:** `curl` the edge function + anon REST with various filters;
  `supabase db query` for schema/policy introspection (`pg_indexes`, `pg_policies`,
  `pg_constraint`); Playwright against `npm run dev` with the real `.env.local`
  (route interception is fine to isolate code paths — label it as such).
- **Severity scale:** P0 (broken/blocks users or leaks data) · P1 (high risk or major UX) ·
  P2 (should fix soon) · P3 (nice to have / idea).
- **Effort scale:** S (< 2h) · M (half day) · L (multi-day).

## 6. Deliverable — `docs/AUDIT_REPORT.md`

Structure the report exactly:

1. **Executive summary** — ≤ 15 lines: overall health verdict, top 5 risks, top 5
   opportunities.
2. **Findings table** — every finding with: ID, area (A–G), severity (P0–P3), title,
   evidence (file:line / command + output), impact, recommended fix, effort (S/M/L).
3. **Confirmed bugs** (incl. or superseding the Part A seeds) with minimal repro steps.
4. **Security assessment** — RLS matrix verdict per table, exposure list.
5. **Bottleneck analysis** — the 10/1k/100k-user scaling table.
6. **Ranked opportunity backlog** — merged product ideas + engineering quick wins, ordered
   by value/effort; explicitly mark which items belong in Sprint 8/9 as-is, which deserve
   new sprints (propose Sprint 10+), and which should replace current backlog items.
7. **What we deliberately did NOT flag** — settled decisions from STATE.md, with one-line
   reasons (shows the audit respected the architecture).
8. **Stale-doc corrections** — anything in CONCERNS.md/ARCHITECTURE_REVIEW.md/README.md
   that is now wrong (list only; do not edit the files).

After writing the report: run `npm run build`, `npm run test`, `npm run lint` one final
time (all must pass — proves the audit changed nothing), rebuild the graphify graph
(`python -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`),
and commit only `docs/AUDIT_REPORT.md` (+ graphify artifacts are gitignored) with message:
`docs: full-project audit report`.

## 7. Guardrails

- Read-only: no fixes, no refactors, no dependency changes, no migrations, no data writes.
- Respect settled decisions in `.planning/STATE.md` (direct Supabase queries, feature-based
  structure, RPCs as the server layer, no repository pattern).
- Follow `.planning/codebase/CONVENTIONS.md` for any code you *do* touch (there should be none).
- Never commit `.env*` or `supabase/.temp/`; never print full anon/service keys into the report.
- If a check would be destructive or costly, skip it and list it under "recommended manual checks".
