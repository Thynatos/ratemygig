# Sprint Plan — ratemygig (Post-M5 Backlog)

> **For AI agents:** This is the authoritative implementation plan for all work after M5
> (see `.planning/ROADMAP.md` and `docs/AGENT_CONTINUATION.md` for completed history).
> Implement **one sprint per session**, in order, top to bottom. Do not start a sprint
> until the previous one is checked off. Each sprint is independently shippable.

**Created:** 2026-07-21 · **Base:** main @ `dd02495` (M5 complete, 196 tests passing, build clean)

---

## How to work a sprint (agent loop)

1. Read this file + `docs/AGENT_CONTINUATION.md` + `.planning/codebase/CONCERNS.md`.
2. Pick the **first sprint with `[ ]`** status. Implement it fully — nothing more.
3. Follow existing conventions (`.planning/codebase/CONVENTIONS.md`): named exports,
   function components, feature-based structure, direct Supabase queries, React Query
   for server state, rate-limit mutations via `createRateLimiter()`.
4. Verify from repo root: `npm run build` · `npm run test` · `npm run lint`
   (plus `npm run test:e2e` when UI flows change).
5. Mark the sprint `[x]` here, add new issues to `CONCERNS.md`, update
   `.planning/STATE.md` and the "Last updated" block in `docs/AGENT_CONTINUATION.md`.

## Sprint status

| # | Sprint | Size | Status |
|---|--------|------|--------|
| 1 | Live notifications (DB triggers) | M | [x] |
| 2 | Scheduled event ingest (CI cron) | S | [x] |
| 3 | Friends Going + calendar export | M | [ ] |
| 4 | UX correctness pack (known issues) | S | [ ] |
| 5 | Performance & CI hardening | M | [ ] |
| 6 | Gig Wrapped (year-in-review stats) | M | [ ] |
| 7 | Share cards / OG images | L | [ ] |
| 8 | setlist.fm import | M | [ ] |
| 9 | PWA + Web Push | L | [ ] |

---

## Sprint 1 — Live notifications (DB triggers)

**Goal:** Make the notification center actually receive notifications. The bell,
`/notifications` page, table, and mark-read mutations all exist, but nothing ever
INSERTs into `notifications` (verified: only `select` / `update is_read` calls in
`apps/web/src/features/notifications/api/notifications.ts`).

**Why first:** Highest ROI in the backlog — the full UI is already built and waiting.

### DB work — new migration `packages/db/migrations/013_notification_triggers.sql`

**Critical RLS detail:** the INSERT policy on `notifications` is
`WITH CHECK (auth.uid() = user_id)` (see `010_discovery_intelligence.sql`). Triggers
that notify *other* users MUST be `SECURITY DEFINER` functions, otherwise RLS rejects
the insert.

1. **Extend the type constraint** — current CHECK only allows
   `('event_reminder','new_review','artist_event','venue_event')`:
   ```sql
   ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
   ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
     CHECK (type IN ('event_reminder','new_review','artist_event','venue_event',
                     'new_comment','review_reaction','friend_attendance'));
   ```
2. **Dedupe:** `CREATE UNIQUE INDEX idx_notifications_dedupe ON public.notifications(user_id, type, link);`
   and use `ON CONFLICT DO NOTHING` semantics (insert via exception handling or
   `WHERE NOT EXISTS` in the trigger).
3. **Preference gates:** add opt-out columns to `user_preferences`:
   `notify_artist_events`, `notify_venue_events`, `notify_new_reviews`,
   `notify_comments`, `notify_reactions` — all `BOOLEAN NOT NULL DEFAULT true`.
   Check the gate inside each trigger function.
4. **Trigger functions (all `SECURITY DEFINER SET search_path = public`):**
   - `trg_notify_on_event` — AFTER INSERT on `events`: for each artist in
     `event_artists` for that event, insert `artist_event` for every row in
     `artist_follows`; insert `venue_event` for every row in `venue_follows`
     matching `venue_id`. `link` = `/events/<id>`. Skip events with `start_at < NOW()`.
   - `trg_notify_on_review` — AFTER INSERT OR UPDATE OF status ON `reviews`:
     only fire when `status = 'published'` (and `OLD.status IS DISTINCT FROM 'published'`
     on update) and `is_public = true`. Insert `new_review` for every row in
     `user_follows` where `followed_id = NEW.user_id`. `link` = `/r/<review id>`.
   - `trg_notify_on_comment` — AFTER INSERT on `comments`: notify the review owner
     (`new_comment`) unless commenter = owner.
   - `trg_notify_on_reaction` — AFTER INSERT on `review_reactions`: notify the review
     owner (`review_reaction`) unless reactor = owner.

### Web work

- `apps/web/src/features/notifications/components/NotificationItem.tsx` — render the 3
  new types (icon + copy + existing `link` navigation).
- `apps/web/src/features/profile/components/PreferencesForm.tsx` — add 5 toggle
  switches bound to the new `user_preferences` columns (mutation pattern already
  exists there for city/location).

### Tests

- Unit: NotificationItem renders each new type; PreferencesForm toggles call mutation.
- Manual SQL verification script (paste into Supabase SQL editor) included as a comment
  block at the bottom of the migration: follow an artist → insert a future event →
  assert one notification row.

### Acceptance

- Following an artist, then ingesting/inserting an event with that artist, produces an
  unread notification in the bell within one React Query invalidation.
- Opting out in PreferencesForm suppresses that notification type.
- No duplicate notifications on re-ingest (upsert path in `packages/jobs`).

---

## Sprint 2 — Scheduled event ingest (CI cron)

**Goal:** Close the last unchecked README roadmap item ("Scheduled event sync").

**Decision (record it in DEPLOYMENT.md):** run `packages/jobs` via **GitHub Actions
cron**, NOT Supabase Edge Functions. Rationale: the jobs package is Node
(`tsx` + `node-cron` + `@supabase/supabase-js`); porting to Deno Edge Functions is a
rewrite for zero functional gain, and GHA gives logs, retries, and secrets for free.

### Tasks

1. Parameterize `packages/jobs/src/jobs/daily-ingest.ts`: read city list and
   days-ahead window from env (`INGEST_CITIES`, `INGEST_DAYS_AHEAD`) with current
   behavior as defaults. Keep `scheduler.ts` untouched for self-hosters.
2. `.github/workflows/ingest.yml` — `schedule: cron '0 6 * * *'` + `workflow_dispatch`;
   Node 22, `npm ci`, `npm run jobs:ingest`; secrets: `TICKETMASTER_API_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Docs: DEPLOYMENT.md section "Scheduled ingest" (secrets to add, how to trigger
   manually, where logs live); tick the roadmap checkbox in README.md.

### Acceptance

- Manual `workflow_dispatch` run succeeds and upserts rows (verify in Supabase table
  editor); duplicate run does not duplicate rows (existing
  `(provider, provider_event_id)` upsert in `SyncService`).

---

## Sprint 3 — Friends Going badge + calendar export

**Goal:** Two planned-but-skipped Phase C items (C1 social badge, C4 calendar).

### Friends Going

1. RPC in `013` follow-up or new `014_friends_attendance.sql`:
   `get_friends_attendance(p_user_id UUID, p_event_ids UUID[])` → returns
   `event_id, user_id, display_name, avatar_url` joining `user_follows` → `attendance`
   (status IN ('planned','attended')). Batch-oriented: one call for all visible cards.
2. Hook `apps/web/src/features/events/api/useFriendsGoing.ts` — takes `eventIds`,
   returns `Map<eventId, profile[]>`; `enabled: isAuthenticated && eventIds.length > 0`.
3. UI: `EventCard` (`apps/web/src/features/events/components/EventCard.tsx`) — compact
   "N friends going" badge (avatar stack ≤3 + count); same data reused on
   `EventDetailPage`. Must not break the existing `React.memo` on EventCard
   (pass the pre-fetched map down from the page, don't query per card).

### Calendar export

4. `apps/web/src/shared/lib/ical.ts` — dependency-free `.ics` builder:
   `BEGIN:VCALENDAR`/`VEVENT` with `UID` (event id + domain), `DTSTAMP`,
   `DTSTART`/`DTEND` (from `start_at`, +3h default), `SUMMARY` (event name),
   `LOCATION` (venue + city), `URL`/`DESCRIPTION` (first ticket link). Handle CRLF +
   text escaping (`,` `;` `\n`) + 75-octet line folding.
5. `AddToCalendarButton` on `EventDetailPage` — two actions: download `.ics`
   (Blob + anchor) and open Google Calendar template URL
   (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`).
6. My Gigs (`MyGigsPage`) — "Export calendar" button next to the existing CSV export:
   one `.ics` containing all planned + attended events.

### Tests

- `ical.test.ts`: escaping, line folding, multi-event output, UTC formatting.
- `useFriendsGoing` test following the mocking pattern in `follows.test.ts`.

### Acceptance

- Badge renders when a followed user has attendance on a visible event; hidden
  otherwise; zero extra queries per card.
- Exported `.ics` imports cleanly into Google Calendar and Apple Calendar.

---

## Sprint 4 — UX correctness pack

**Goal:** Empty the "Known Issues" section of `.planning/codebase/CONCERNS.md`.

### Tasks (all in `apps/web/src/features`)

1. **Optimistic updates with rollback** (`onMutate`/`onError`/`onSettled`, pattern
   already proven in `follows.ts` / reactions): `useCreateComment`,
   `useDeleteComment` (comments/api), `useAddEventToList`, `useRemoveEventFromList`
   (lists/api).
2. **Rate limiter on `useAddEventToList`** — 2s via `createRateLimiter()`.
3. **Auto-add after list creation** — wire `CreateListModal`'s `onCreated` callback in
   `AddToListButton.tsx` so the event is added to the just-created list.
4. **Fix the 2 `react-hooks` lint warnings** in the review form (the ones currently
   reported by `npm run lint`).

### Tests

- Optimistic rollback tests for the 4 mutations, mirroring the existing
  `follows.test.ts` style (12 tests there — match that coverage).

### Acceptance

- `npm run lint` → 0 errors 0 warnings.
- CONCERNS.md "Known Issues (Medium — Not Blocking)" section removed/emptied.
- Comments and list changes appear instantly and roll back on failure.

---

## Sprint 5 — Performance & CI hardening

**Goal:** Fix the 638 kB main chunk, add automated a11y checks, get CI running.

### Tasks

1. **Bundle splitting** — `apps/web/vite.config.ts` →
   `build.rollupOptions.output.manualChunks`: `react-vendor` (react, react-dom,
   react-router-dom), `supabase-vendor` (@supabase/*), `query-vendor`
   (@tanstack/react-query). Target: initial `index-*.js` < 500 kB. Verify gzip sizes
   in build output; update the Bundle Size note in CONCERNS.md.
2. **a11y automation** — add `vitest-axe` (dev dep): axe assertions in the existing
   `ui.test.tsx` / `components.test.tsx` for Button, Modal, Input, EventCard,
   Layout. Fix any *critical/serious* violations found; document the rest in
   CONCERNS.md.
3. **CI** — `.github/workflows/ci.yml`: on push/PR → Node 22, `npm ci`,
   `npm run lint`, `npm run test`, `npm run build`. (E2E stays local — no mock-server
   strategy exists; note this in the workflow comment.)

### Acceptance

- CI green on the PR that introduces it.
- Build prints vendor chunks; main chunk under the warning threshold.
- axe: zero critical violations in tested components.

---

## Sprint 6 — Gig Wrapped (year-in-review)

**Goal:** Personal, shareable yearly stats — the "Letterboxd Wrapped" moment.

### Tasks

1. `packages/db/migrations/015_user_year_stats.sql` — RPC
   `get_user_year_stats(p_user_id UUID, p_year INT)` returning one row:
   `gigs_attended`, `reviews_written`, `avg_rating_given`, `photos_uploaded`,
   `distinct_cities`, `first_gig_date`, `last_gig_date` +
   `top_artists JSONB` / `top_venues JSONB` (top 5 by attendance with names).
   Source tables: `attendance` (status='attended', join events for year),
   `reviews` (status='published'), `review_photos`.
2. Route `/wrapped` (lazy, authenticated; optional `?year=` param, default current
   year-1 in January, else current year): `WrappedPage` with stat cards + top-5 lists.
   Reuse `GigStatsCard` visual language; add entry point from ProfilePage.
3. Empty state for users with no attendance that year (CTA to Discover).

### Tests

- RPC shape validation via existing integration-test pattern
  (`features/*/api/*.integration.test.ts`); page render test with mocked hook.

### Acceptance

- `/wrapped` renders correct numbers for a seeded user; year param works; link from
  ProfilePage; empty state for new users.

---

## Sprint 7 — Share cards / OG images

**Goal:** Pasting a `/r/:reviewId` link into social/chat shows a rich card.

**Constraint to design around (document it):** this is a statically-hosted SPA, so
crawlers get `index.html`. Per-route OG tags require either (a) an edge middleware
that injects meta for crawler user-agents, or (b) prerendering. Implement path (a)
for Vercel (DEPLOYMENT.md already targets Vercel/Netlify); keep it provider-portable.

### Tasks

1. Client meta hook `usePageMeta` (title + description + canonical) applied to
   `PublicReviewPage`, `EventDetailPage`, artist/venue detail pages — improves SEO
   baseline regardless of crawler handling.
2. OG image generator: Supabase Edge Function `og-image` (Deno; `satori` + `resvg-wasm`
   or `@vercel/og` equivalent) — input `?reviewId=`, output 1200×630 PNG with event
   name, artist, rating stars, author, photo strip if available. Cache header
   `s-maxage=86400`. If Edge Function proves painful, fall back to a build-time
   script that renders a static branded fallback image — decide in-sprint, record in
   DEPLOYMENT.md.
3. Edge middleware (`vercel.json` / `api/og-inject.ts`): for crawler UAs on `/r/*`,
   serve HTML with injected `og:title`, `og:description`, `og:image` pointing at the
   function; normal users get the SPA untouched.

### Acceptance

- A social-card validator (e.g. opengraph.xyz) on a public review URL shows the
  generated card; browsers see no behavior change.

---

## Sprint 8 — setlist.fm import

**Goal:** Bootstrap setlist content instead of 100% manual entry.

### Tasks

1. Supabase Edge Function `setlist-import`: holds the setlist.fm API key server-side
   (this also establishes the server-side-key pattern for later Sprint-9/TM-proxy
   work). Input: setlist.fm URL or id → fetch `rest/1.0/setlist/<id>` → normalized
   JSON `{ artistName, eventDate, venueName, songs: [{ name, encore }] }`.
2. Web: "Import from setlist.fm" button in `SetlistEditor` — paste URL → call
   function → map to existing model: get-or-create rows in `songs` respecting
   `UNIQUE(name, artist_id)` (see `008_setlists.sql`), prefill the editor's song list
   with positions + encore flags; user reviews then saves via existing
   `useCreateSetlist`/`useUpdateSetlist` (rate limits unchanged).
3. Handle failure modes: setlist not found, artist mismatch with event's artists,
   API quota → user-visible error toasts.

### Tests

- Mapping/normalization unit tests (pure function, no network); editor prefill test.

### Acceptance

- Pasting a valid setlist.fm link yields a fully prefilled editor; save persists with
  correct positions/encores; no setlist.fm key in the client bundle.

---

## Sprint 9 — PWA + Web Push

**Goal:** Installable app, offline shell, push for the Sprint-1 notifications.

### Tasks

1. `vite-plugin-pwa` (dev dep): web manifest (name, theme colors from
   `tailwind.config.js`, icons 192/512/maskable), service worker with app-shell
   precache + runtime cache for Supabase Storage images (stale-while-revalidate).
   Do NOT cache Supabase REST/RPC calls beyond React Query.
2. Push: `packages/db/migrations/016_push_subscriptions.sql` — table
   `push_subscriptions(user_id, endpoint, keys JSONB, created_at, UNIQUE(user_id, endpoint))`
   with owner-only RLS; opt-in toggle in PreferencesForm (next to Sprint-1 toggles)
   using the Push API; store VAPID keys as Edge Function secrets.
3. Send path: Supabase Database Webhook on `notifications` INSERT → Edge Function
   `send-push` (web-push) → fan out to that user's subscriptions; prune dead
   endpoints (404/410) inside the function.

### Acceptance

- App installs on Android/desktop; offline reload shows the shell with cached data.
- With opt-in, inserting a notification row delivers a push; opting out stops them.

---

## Deferred / rejected (do not implement without new discussion)

- **Ticketmaster key proxy via Edge Function** — real risk but requires moving all
  browser TM calls through a proxy incl. caching; revisit after Sprint 8 establishes
  the function pattern. Tracked in CONCERNS.md ("API Key Exposure").
- **Server-side rate limiting** — same prerequisite; client limiters stay for now.
- **E2E mock-server for CI** — high effort; CI runs unit tests only (Sprint 5).
- **Repository pattern / custom backend layer** — explicitly rejected in STATE.md
  decisions; direct Supabase + RPCs remains the architecture.
