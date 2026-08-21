# Project State

## Current Phase
**Phase:** Post-M5 Sprints (see .planning/SPRINTS.md)
**Status:** Sprint 10 (audit Tier 0) **complete and verified against the live project** — `016_schema_fixes.sql` applied to `lpfyzjfqyyrdknzgxoul` on 2026-08-21, `npm run test:live` 22/22, all five Task 9.5 routes walked with zero 400s and zero validation failures. Next: Sprint 11 (audit Tier 1, "Eyes on production") ahead of Sprint 8 per `docs/AUDIT_REPORT.md` §6.
**Last Activity:** 2026-08-21

**Audit findings closed by Sprint 10** (ids from `docs/AUDIT_REPORT.md`; the report itself is a dated artefact and was not edited): A1, A2, A3, A4, A5, A8, A9, A10, C2, D1/E1 (type-check enforced), D5/E2/E3 (live-schema + RPC contract CI job), B7. B1 closed at the reviews-policy/RPC/storage layer (photo/tag/comment metadata mirrors tracked under B9, Tier 1).

**Live verification evidence (2026-08-21, post-016):** six FKs to `public.profiles` present; reviews SELECT policy = `((is_public AND status='published') OR auth.uid()=user_id)`; storage policy matches `thumbnail_path` and `status`; `handle_new_user` `search_path=public, pg_temp`. Draft leak (B1) probed with a real draft row inside a rolled-back transaction: **anon saw 0 drafts, owner saw 1** — no residue. `/r/f9f9fe86…` renders with its author, `/events/…07` shows "5.0 avg • 1 review", `/venues/…05` and `/artists/…07` show 5.0 (1 review) with distributions, `/artists/…07` has no error boundary, `/venues/top` unchanged.

**Still required before the `live-schema` CI job can run:** add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repo secrets (the job is `if`-gated to skip on fork PRs).

## Completed
- Auth (magic link + Google OAuth)
- Event discovery with pluggable provider
- Attendance tracking (planned/attended)
- Reviews with photo uploads, tags, sanitization
- Venue/Artist rating pages with RPC aggregation
- Leaderboard pages (Top Venues / Top Artists)
- Pagination for venues/artists
- Client-side rate limiting on mutations
- Artist/Venue/User follow systems with optimistic updates
- Review reactions (like/helpful/love) with optimistic updates
- Activity feed (/feed) with error isolation
- MyGigsPage tracked artists/venues tabs
- Public profile with follower/following counts
- Route-level code splitting (16 lazy-loaded routes)
- Setlist archive: songs, setlists, setlist_songs tables + RLS
- Setlist viewer/editor UI with song search autocomplete
- Setlist statistics RPC (artist song stats, setlist stats, song stats)
- Song detail page (/songs/:songId)
- Artist detail song statistics section
- Discovery: user_preferences + notifications tables with RLS
- Discovery: get_recommended_events, get_nearby_venues, get_trending_events RPCs
- Discovery: RecommendedEventsSection, TrendingEventsSection on DiscoverPage
- Discovery: EnhancedSearch typeahead across events/artists/venues
- Discovery: NearbyVenuesSection with geolocation
- Discovery: PreferencesForm on ProfilePage
- Notifications: NotificationBell in nav, NotificationsPage at /notifications
- Profile: avatar upload (public bucket, 5MB, client-side resize to 256x256)
- Profile: social links (website, Twitter, Instagram) via useUpdateProfile mutation
- Profile: GigStatsCard (reviews, events, followers, following counts)
- Profile: PublicProfilePage tabs (Reviews / Lists), social links display
- Lists: lists + list_items tables with RLS, position-based ordering
- Lists: ListPage at /lists/:listId, ListCard, CreateListModal
- Lists: AddToListButton dropdown on EventDetailPage
- Comments: comments table with RLS, useComments/useCreateComment/useDeleteComment hooks
- Comments: CommentSection + CommentItem on PublicReviewPage
- Drafts: reviews.status column (draft/published), useDrafts/useSaveDraft/usePublishDraft
- Drafts: DraftReviewsSection on MyGigsPage
- Public review visibility enforced in the DB: reviews SELECT policy requires status='published' on the anon branch (016); client queries filter the same way
- useUpdateProfile React Query mutation with cache invalidation
- Sprint 1: notification triggers migration 013 (artist/venue event fan-out, new review, comment, reaction) with SECURITY DEFINER functions, preference gates, (user_id,type,link) dedupe
- Sprint 1: 5 notification opt-out toggles in PreferencesForm; NotificationItem renders new_comment/review_reaction/friend_attendance
- Sprint 2: .github/workflows/ingest.yml — GHA cron (06:00 UTC daily) + workflow_dispatch, concurrency group, 30min timeout, secrets/vars config
- Sprint 2: INGEST_CITIES env (comma-separated) — city-scoped ingest in fetchAllEvents/runDailyIngest to stay under TM's 1000-item/query paging cap; country mode unchanged when unset
- Sprint 2: DEPLOYMENT.md "Scheduled Ingest" section (GHA-vs-Edge-Functions decision, secrets/vars, paging cap); README roadmap item ticked
- Sprint 3: migration 014 get_friends_attendance RPC (SECURITY DEFINER, caller-scoped social graph, batched by event ids)
- Sprint 3: Friends Going badge (FriendsGoingBadge + optional friendsGoing prop on EventCard, one batched RPC per page) on Discover, Artist/Venue detail, Trending/Recommended sections, EventDetailPage
- Sprint 3: shared/lib/ical.ts (.ics builder: CRLF, TEXT escaping, 75-octet folding, UTC basic dates, +3h default duration); AddToCalendarButton (.ics download + Google Calendar URL) on EventDetailPage; Export calendar button on MyGigsPage (all planned+attended)
- Sprint 4: optimistic updates with rollback for comments (create/delete) and list items (add/remove) via pure exported cache-transform helpers
- Sprint 4: dedicated 2s rate limiter (RATE_LIMITS.LIST_ITEM) for list item add/remove; CreateListModal onCreated wired in AddToListButton (event auto-added to new list)
- Sprint 4: react-hooks lint warnings fixed via useWatch; CONCERNS.md "Known Issues" section emptied
- Sprint 5: bundle splitting via manualChunks (react-vendor / query-vendor / supabase-vendor) — index chunk 404 kB (gzip 122 kB), under 500 kB threshold
- Sprint 5: vitest-axe wired into test setup; checkA11y helper (test/axe.ts, color-contrast disabled for jsdom); axe assertions on Button, Input, Modal, EventCard, Layout
- Sprint 5: .github/workflows/ci.yml (push/PR: Node 22, npm ci, lint, test, build; E2E intentionally local-only)
- Sprint 6: migration 015 get_user_year_stats RPC (SECURITY DEFINER, caller-scoped, one-row year stats: gigs/reviews/avg rating/photos/cities/first+last dates + top_artists/top_venues JSONB)
- Sprint 6: /wrapped page (lazy, ProtectedRoute) with ?year= param + prev/next year nav (min 2000, max current), January→previous-year default via pure resolveWrappedYear, stat cards reusing GigStatsCard visual language, top artist/venue lists, empty state CTA to Discover
- Sprint 6: ProfilePage "Your Year in Review" entry card linking to /wrapped; UserYearStats/YearStatEntry core types; yearStatsSchema Zod validation on the RPC row
- Sprint 7: shared/lib/crawler.ts (CRAWLER_UA_PATTERN + isCrawlerUserAgent) and shared/lib/og.ts (buildOgTags with HTML-attribute escaping + ≤200-char description, buildOgImageUrl) with 22 unit tests
- Sprint 7: usePageMeta hook (title/description/canonical/og upsert; null-restore + unmount-restore of index.html baseline) applied to PublicReviewPage, EventDetailPage, ArtistDetailPage, VenueDetailPage; 7 hook tests + Playwright e2e meta verification
- Sprint 7: Supabase Edge Function og-image (deployed, verify_jwt=false, manual published/public filter, service-role + two-step profile fetch, signed photo URLs, branded fallback card, 400 on missing param, cache headers) rendering 1200×630 PNGs via npm:@vercel/og with base64-embedded Inter subsets
- Sprint 7: Vercel crawler OG injection — api/og-inject.ts (PostgREST + dist/og-shell.html + buildOgTags injection, non-crawler UA 302 redirect), scripts/copy-og-shell.mjs postbuild step, vercel.json UA-gated rewrite + includeFiles
- Sprint 7: apps/web/public/og-fallback.png (1200×630 branded, <100 kB); DEPLOYMENT.md "Share cards / OG images" section with in-sprint decision record
- Sprint 10: migration 016 — FKs to public.profiles from reviews/comments/lists/setlists/user_follows (orphan guard + pg_constraint idempotency), get_recommended_events fixed (42702 + LIMIT p_limit), get_artist_setlist_stats fixed (42703 + empty-row semantics), status='published' gates on the reviews SELECT policy + 5 aggregation RPCs + get_trending_events + storage policy (which now also matches thumbnail_path), handle_new_user search_path pinned
- Sprint 10: rating summary Zod schemas + core RatingSummary types aligned to the flat rating_1..rating_5 RPC shape (casts dropped); setlist-stats schemas accept timestamptz offsets; recommendation reason enum matches the RPC; ArtistDetailPage useVenues destructuring fixed
- Sprint 10: TypeScript enforced — `tsc -b --noEmit` in `npm run build` and CI, `types`/`@jobs/*` alias in tsconfig.app.json, vitest-axe matchers typed via src/test/vitest-axe.d.ts, all 46 pre-existing tsc errors fixed (zero `any` added)
- Sprint 10: live-schema CI job (`test:live`, vitest.live.config.ts, src/test/live/) — anon REST smoke for all 9 profile-embed sites + Zod contract parse for every app RPC; skipped on fork PRs; `*.integration.test.ts` renamed `*.resolver-contract.test.ts`
- Sprint 10: query cache cleared on sign-out and on auth identity change (pure `shouldClearQueryCache` helper + tests; TOKEN_REFRESHED never clears); user id added to my-gigs/user-review/drafts/feed-timeline/recommended/followed-artists/followed-venues/user-follow keys
- 317 unit tests passing, 0 lint errors, 0 lint warnings

## Decisions
- Direct Supabase client queries (no custom API layer)
- TanStack React Query for server state
- Feature-based file structure
- Named exports, function components only
- Zod validation, XSS sanitization, rate limiting
- UUIDs for all primary keys
- RLS policies on all user-owned tables
- Avatar bucket is public (no signed URLs needed)
- Draft reviews use status column, not separate is_public flag
- Profile updates go through useUpdateProfile mutation for cache coherence

## Active Concerns
- See .planning/codebase/CONCERNS.md for full list
