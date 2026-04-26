# Architecture & Code Review — RateMyGig

**Date**: 2026-04-26
**Graphify (initial)**: 457 nodes, 377 edges, 140 communities (144 source files)
**Graphify (after M1)**: 492 nodes, 377 edges, 175 communities (179 source files)

---

## Milestone 1: Code Health & Refactoring — COMPLETE

### Completed Items
| Step | Task | Status |
|------|------|--------|
| 1.5 | Extract magic numbers to `shared/lib/constants.ts` | Done |
| 1.3 | Split `types/index.ts` (339L) into 13 domain files | Done |
| 1.6 | Replace `unknown` with Zod-validated DB parsing | Done |
| 1.1 + 1.4 | Split `events.ts` (568L) → `resolver.ts` + `hooks.ts` + `attendance.ts` | Done |
| 1.2 + 1.5 | Split `artists.ts` (443L) → `resolver.ts` + `hooks.ts` + `follows.ts` | Done |
| 1.2 + 1.5 | Split `venues.ts` (423L) → `resolver.ts` + `hooks.ts` + `follows.ts` | Done |
| 1.4 | Add barrel `index.ts` at all 12 feature roots | Done |
| 1.7 | Consolidate `getTicketmasterLiveProvider` | N/A (browser vs server runtime) |

### Verification
- **Lint**: 0 errors, 2 pre-existing warnings (react-hook-form)
- **Tests**: 112/112 passing
- **Build**: Success
- **Graphify**: +35 nodes, +35 communities (from barrel exports and split files)
- **Files**: 144 → 179 (+35 new files: 13 types, 9 API splits, 12 barrel exports, 1 constants)

### New File Structure
```
packages/core/src/types/
  common.ts, event.ts, event-artist.ts, venue.ts, artist.ts,
  attendance.ts, profile.ts, review.ts, rating.ts, social.ts,
  setlist.ts, community.ts, discovery.ts, index.ts

apps/web/src/features/events/api/
  resolver.ts, hooks.ts, attendance.ts, events.ts (barrel)

apps/web/src/features/artists/api/
  resolver.ts, hooks.ts, follows.ts, artists.ts (barrel)

apps/web/src/features/venues/api/
  resolver.ts, hooks.ts, follows.ts, venues.ts (barrel)

apps/web/src/shared/lib/
  constants.ts (new)

apps/web/src/features/*/
  index.ts (12 new barrel files)
```

---

## Graphify Graph Report

### God Nodes (Most Connected Abstractions)
| Node | Edges | Package |
|------|-------|---------|
| `TicketmasterClient` | 13 | jobs |
| `TicketmasterProvider` | 9 | jobs |
| `SyncService` | 7 | jobs |
| `createMockTimestamp()` | 5 | web |
| `mapEventRow()` | 4 | web |
| `resolveEventsWithDeps()` | 4 | web |
| `MockEventsProvider` | 4 | web |
| `handleFiles()` | 4 | web |

### Low Cohesion Communities (Need Refactoring)
| Community | Cohesion | Concern |
|-----------|----------|---------|
| 0 (events resolver) | 0.11 | Events API file does too much |
| 1 (artists resolver) | 0.10 | Duplicated resolver pattern |
| 2 (venues resolver) | 0.10 | Duplicated resolver pattern |
| 4 | 0.13 | Weakly interconnected |
| 5 | 0.13 | Weakly interconnected |

### Knowledge Gaps
- 2 isolated nodes: `MockIntersectionObserver`, `MockResizeObserver`
- 95+ communities are 1-2 node "thin" clusters — files lack barrel exports and shared abstractions
- No cross-file connections detected beyond import chains

---

## Critical Issues

### 1. ~~Triplicated Resolver Pattern~~ FIXED (M1)
Split `events.ts` (568L), `artists.ts` (443L), `venues.ts` (423L) into focused modules: resolver, hooks, follows/attendance.

### 2. ~~Monolithic Types File~~ FIXED (M1)
`packages/core/src/types/index.ts` split into 13 domain-specific files.

### 3. ~~No Feature-Level Barrel Exports~~ FIXED (M1)
Added 12 `index.ts` barrel files across all feature modules.

### 4. ~~`unknown` Types on DB Rows~~ FIXED (M1)
Replaced manual type guards with Zod schemas (`ticketUrlsArraySchema`, `lineupArraySchema`).

### 5. No Component Tests (HIGH)
Only 12 unit tests total. All test query key factories and resolver policies. Zero UI component tests for Button, Input, Modal, StarRating, etc.

### 6. E2E Tests Are Smoke-Only (HIGH)
5 Playwright tests only check page rendering. No user flow tests (login→browse→review, attendance toggle, follow/unfollow, photo upload).

### 7. Zero Accessibility (MEDIUM)
No ARIA labels, roles, keyboard navigation, focus management, or skip-to-content links anywhere.

### 8. No Memoization (MEDIUM)
Large pages (DiscoverPage, EventDetailPage, VenueDetailPage, ProfilePage) lack `React.memo`, `useMemo`, `useCallback`.

### 9. Rate Limiting on All Mutations (MEDIUM)
Now partially addressed: rate limiting exists on reviews, comments, follows, photo uploads, and reactions (verified all have `createRateLimiter`). Attendance was already covered.

### 10. Inline Supabase Everywhere (LOW)
UI layer directly coupled to the database. No repository/data-access layer.

---

## Improvement Plan: 5 Milestones

### Milestone 1: Code Health & Refactoring
| # | Task | Effort |
|---|------|--------|
| 1.1 | Split `events.ts` into `resolver.ts` + `hooks.ts` + `attendance.ts` | 2h |
| 1.2 | Split `artists.ts` and `venues.ts` similarly | 2h |
| 1.3 | Split `types/index.ts` into domain-specific files | 1h |
| 1.4 | Add barrel `index.ts` at every feature root | 1h |
| 1.5 | Extract magic numbers to constants | 0.5h |
| 1.6 | Replace `unknown` with Zod-validated types | 1h |
| 1.7 | Consolidate duplicate `getTicketmasterLiveProvider` | 1.5h |

### Milestone 2: Test Coverage
| # | Task | Effort |
|---|------|--------|
| 2.1 | Component tests for UI kit | 2h |
| 2.2 | Component tests for feature components | 3h |
| 2.3 | Deepen E2E tests (user flows) | 3h |
| 2.4 | Integration tests for DB→mock resolver flow | 2h |
| 2.5 | Tests for AuthProvider, ProtectedRoute, Layout | 1h |

### Milestone 3: Performance & Accessibility
| # | Task | Effort |
|---|------|--------|
| 3.1 | `React.memo` on card components | 1h |
| 3.2 | `useMemo`/`useCallback` on large pages | 1.5h |
| 3.3 | ARIA labels, roles, keyboard nav | 2h |
| 3.4 | Focus trap, keyboard handlers, skip-to-content | 1h |
| 3.5 | Client-side image resize for review photos | 1h |

### Milestone 4: Security & Data Hardening
| # | Task | Effort |
|---|------|--------|
| 4.1 | Rate limiting on all mutations | 1h |
| 4.2 | Zod validation for Supabase responses | 2h |
| 4.3 | Consistent `sanitizeText()` everywhere | 1h |
| 4.4 | Per-feature error boundaries | 1.5h |

### Milestone 5: Feature Completion
| # | Task | Effort |
|---|------|--------|
| 5.1 | Export gig history as CSV | 1.5h |
| 5.2 | Image thumbnails generation | 2h |
| 5.3 | Leaderboard time-range filters | 1h |
| 5.4 | Missing loading skeleton states | 1h |

### Dependency Graph
```
M1 (Refactoring) → M2 (Tests) → M3 (Perf/A11y) + M4 (Security) → M5 (Features)
```

---

## Test Coverage Baseline

| Area | Current Tests | Target |
|------|---------------|--------|
| Unit tests | 12 | 50+ |
| Component tests | 0 | 15+ |
| E2E tests | 5 (smoke) | 12+ (user flows) |
| Integration tests | 0 | 5+ |
| Accessibility tests | 0 | axe-core runs |

---

## Features Without Any Tests
comments, discovery, lists, notifications, setlists, songs, auth, feed

---

## Open Roadmap Items (from README)
- [ ] Scheduled event sync (Supabase Edge Functions)
- [ ] Image thumbnails generation
- [ ] Export gig history as CSV
