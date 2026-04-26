# Project State

## Current Phase
**Phase:** D — Profile & Lists
**Status:** Complete
**Last Activity:** 2026-04-26

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
- 112 unit tests passing, 0 lint errors

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
