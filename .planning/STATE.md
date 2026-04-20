# Project State

## Current Phase
**Phase:** B — Setlist Archive
**Status:** Complete
**Last Activity:** 2026-04-20

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
- Route-level code splitting (13 lazy-loaded routes)
- Setlist archive: songs, setlists, setlist_songs tables + RLS
- Setlist viewer/editor UI with song search autocomplete
- Setlist statistics RPC (artist song stats, setlist stats, song stats)
- Song detail page (/songs/:songId)
- Artist detail song statistics section
- 112 unit tests passing, 0 lint errors

## Decisions
- Direct Supabase client queries (no custom API layer)
- TanStack React Query for server state
- Feature-based file structure
- Named exports, function components only
- Zod validation, XSS sanitization, rate limiting
- UUIDs for all primary keys
- RLS policies on all user-owned tables

## Active Concerns
- See .planning/codebase/CONCERNS.md for full list
