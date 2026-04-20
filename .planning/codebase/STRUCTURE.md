# Structure

## Monorepo Layout

```
ratemygig/
├── apps/
│   └── web/                          # React frontend (Vite)
│       ├── src/
│       │   ├── app/
│       │   │   └── App.tsx            # Root component, route definitions
│       │   ├── features/
│       │   │   ├── auth/              # Authentication
│       │   │   │   ├── components/    # ProtectedRoute.tsx
│       │   │   │   ├── hooks/         # useAuth.ts
│       │   │   │   └── pages/        # LoginPage.tsx, AuthCallbackPage.tsx
│       │   │   ├── events/           # Event discovery
│       │   │   │   ├── api/          # events.ts (hooks + resolvers + pagination)
│       │   │   │   ├── components/   # CitySelector, DateRangePicker, EventCard
│       │   │   │   ├── pages/        # DiscoverPage, EventDetailPage
│       │   │   │   └── providers/    # mock-provider, mock-catalog, ticketmaster-browser-provider
│       │   │   ├── reviews/          # Reviews & My Gigs
│       │   │   │   ├── api/          # reviews.ts (mutations with rate limiting)
│       │   │   │   ├── components/   # PhotoUploader.tsx
│       │   │   │   └── pages/        # MyGigsPage, WriteReviewPage, PublicReviewPage
│       │   │   ├── venues/           # Venue pages
│       │   │   │   ├── api/          # venues.ts + venues.resolver.test.ts (paginated)
│       │   │   │   └── pages/        # VenuesPage, VenueDetailPage, TopVenuesPage
│       │   │   ├── artists/          # Artist pages
│       │   │   │   ├── api/          # artists.ts + artists.resolver.test.ts (paginated)
│       │   │   │   └── pages/        # ArtistsPage, ArtistDetailPage, TopArtistsPage
│       │   │   └── profile/          # User profile
│       │   │       └── pages/        # ProfilePage, PublicProfilePage
│       │   ├── shared/
│       │   │   ├── components/       # Layout, ErrorBoundary, NotFoundPage
│       │   │   │   └── ui/          # Avatar, Badge, Button, Card, Input, Loading, Modal, StarRating, Textarea
│       │   │   ├── hooks/           # useInfiniteScroll, usePhotoUrls
│       │   │   ├── lib/            # env, supabase, utils, logger, storage, provider-policy, sanitize, throttle
│       │   │   └── validation/      # schemas.ts (Zod), index.ts
│       │   ├── test/                 # Vitest setup (setup.ts)
│       │   ├── index.css             # Global styles + Tailwind directives
│       │   └── main.tsx              # Entry point: QueryClient, AuthProvider, BrowserRouter
│       ├── e2e/                      # Playwright E2E tests
│       │   ├── discover.spec.ts      # Home page + 404 smoke test
│       │   ├── login.spec.ts         # Login page renders, validation, nav redirect
│       │   ├── venue.spec.ts         # Venues page, detail 404, top venues
│       │   ├── artist.spec.ts        # Artists page, detail 404, top artists
│       │   └── review.spec.ts        # Review 404, auth redirects
│       ├── dist/                     # Production build output
│       ├── public/                   # Static assets
│       ├── index.html                # HTML entry
│       ├── vite.config.ts            # Vite config with path aliases
│       ├── tailwind.config.js        # Tailwind theme (primary/accent/surface colors)
│       ├── vitest.config.ts          # Vitest configuration
│       ├── playwright.config.ts      # Playwright E2E configuration
│       └── package.json              # @ratemygig/web
├── packages/
│   ├── core/                         # Shared domain types
│   │   └── src/
│   │       ├── types/index.ts        # All domain types (Event, Venue, Review, etc.)
│   │       └── interfaces/events-provider.ts  # IEventsProvider
│   ├── db/                           # Database layer
│   │   ├── migrations/               # SQL migrations (001-006)
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_rls_policies.sql
│   │   │   ├── 003_indexes.sql
│   │   │   ├── 004_aggregation_functions.sql
│   │   │   ├── 005_storage.sql
│   │   │   └── 006_seed_mock_catalog.sql
│   │   └── seed/
│   │       └── mock-events.json      # Seed data with UUID-aligned references
│   └── jobs/                         # Background sync service
│       └── src/
│           ├── config.ts             # Environment config
│           ├── scheduler.ts          # Cron scheduler
│           ├── jobs/daily-ingest.ts  # One-shot Ticketmaster sync
│           ├── sync/
│           │   ├── index.ts
│           │   └── sync-service.ts   # DB upsert logic
│           ├── ticketmaster/
│           │   ├── index.ts
│           │   ├── ticketmaster-client.ts   # API client with rate limiting
│           │   ├── ticketmaster-provider.ts # Mapper: TM → ProviderEvent
│           │   └── types.ts          # TM API response types
│           └── test-api.ts           # API connection test
├── .env.example                      # Root env template
├── README.md                         # Setup docs + architecture overview
├── PROMPT.md                         # Original build prompt / spec
└── package.json                      # Monorepo root with workspace scripts
```

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Pages | `{Name}Page.tsx` | `DiscoverPage.tsx`, `VenueDetailPage.tsx`, `TopVenuesPage.tsx` |
| Components | `{Name}.tsx` | `EventCard.tsx`, `PhotoUploader.tsx` |
| Hooks | `use{Name}.ts` | `useAuth.ts`, `usePhotoUrls.ts` |
| API modules | `{entity}.ts` | `events.ts`, `venues.ts` |
| Types | `index.ts` or `types.ts` | `packages/core/src/types/index.ts` |
| Tests | `{name}.test.ts` or `{name}.resolver.test.ts` | `utils.test.ts`, `events.resolver.test.ts` |
| Zod schemas | `schemas.ts` | `shared/validation/schemas.ts` |

## Key File Locations

| Concern | Path |
|---------|------|
| Routes | `apps/web/src/app/App.tsx` |
| Navigation | `apps/web/src/shared/components/Layout.tsx` |
| Supabase client | `apps/web/src/shared/lib/supabase.ts` |
| Environment config | `apps/web/src/shared/lib/env.ts` |
| Provider policy | `apps/web/src/shared/lib/provider-policy.ts` |
| Rate limiter | `apps/web/src/shared/lib/throttle.ts` |
| Photo URL hook | `apps/web/src/shared/hooks/usePhotoUrls.ts` |
| Auth context | `apps/web/src/features/auth/AuthProvider.tsx` |
| Mock provider | `apps/web/src/features/events/providers/mock-provider.ts` |
| Mock seed data | `apps/web/src/features/events/providers/mock-catalog.ts` |
| TM browser provider | `apps/web/src/features/events/providers/ticketmaster-browser-provider.ts` |
| Validation schemas | `apps/web/src/shared/validation/schemas.ts` |
| Tailwind theme | `apps/web/tailwind.config.js` |
| DB migrations | `packages/db/migrations/001-006` |
| TM API client | `packages/jobs/src/ticketmaster/ticketmaster-client.ts` |
| Sync service | `packages/jobs/src/sync/sync-service.ts` |

## Routes

| Path | Component | Access |
|------|-----------|--------|
| `/` | `DiscoverPage` | Public |
| `/events/:eventId` | `EventDetailPage` | Public |
| `/venues` | `VenuesPage` (paginated) | Public |
| `/venues/top` | `TopVenuesPage` | Public |
| `/venues/:venueId` | `VenueDetailPage` | Public |
| `/artists` | `ArtistsPage` (paginated) | Public |
| `/artists/top` | `TopArtistsPage` | Public |
| `/artists/:artistId` | `ArtistDetailPage` | Public |
| `/r/:reviewId` | `PublicReviewPage` | Public |
| `/u/:username` | `PublicProfilePage` | Public |
| `/my-gigs` | `MyGigsPage` | Protected |
| `/review/:eventId` | `WriteReviewPage` | Protected |
| `/review/:eventId/edit` | `WriteReviewPage` | Protected |
| `/profile` | `ProfilePage` | Protected |
| `/login` | `LoginPage` | No layout |
| `/auth/callback` | `AuthCallbackPage` | No layout |
| `*` | `NotFoundPage` | Public |

## Navigation

Primary nav links (desktop + mobile): Discover, Venues, Top Venues, Artists, Top Artists
Authenticated user links: My Gigs, Profile, Sign Out