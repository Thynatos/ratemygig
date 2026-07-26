# Project State

## Current Phase
**Phase:** Post-M5 Sprints (see .planning/SPRINTS.md)
**Status:** Sprint 4 complete — next up: Sprint 5 (Performance & CI hardening)
**Last Activity:** 2026-07-26

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
- Public review queries filter by status=published (no draft leak)
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
- 254 unit tests passing, 0 lint errors, 0 lint warnings

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
