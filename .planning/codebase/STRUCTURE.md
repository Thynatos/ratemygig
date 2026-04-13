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
│       │   │   │   ├── api/           # (none — direct Supabase Auth)
│       │   │   │   ├── components/    # ProtectedRoute.tsx
│       │   │   │   ├── hooks/        # useAuth.ts
│       │   │   │   └── pages/        # LoginPage.tsx, AuthCallbackPage.tsx
│       │   │   ├── events/           # Event discovery
│       │   │   │   ├── api/          # events.ts (hooks + resolver)
│       │   │   │   ├── components/   # CitySelector, DateRangePicker, EventCard
│       │   │   │   ├── pages/        # DiscoverPage, EventDetailPage
│       │   │   │   └── providers/    # mock-provider.ts, mock-catalog.ts, ticketmaster-browser-provider.ts
│       │   │   ├── reviews/          # Reviews & My Gigs
│       │   │   │   ├── api/          # reviews.ts
│       │   │   │   ├── components/   # PhotoUploader.tsx
│       │   │   │   └── pages/        # MyGigsPage, WriteReviewPage, PublicReviewPage
│       │   │   ├── venues/          # Venue pages
│       │   │   │   ├── api/          # venues.ts + venues.resolver.test.ts
│       │   │   │   └── pages/        # VenuesPage, VenueDetailPage
│       │   │   ├── artists/         # Artist pages
│       │   │   │   ├── api/          # artists.ts + artists.resolver.test.ts
│       │   │   │   └── pages/        # ArtistsPage, ArtistDetailPage
│       │   │   └── profile/          # User profile
│       │   │       └── pages/        # ProfilePage, PublicProfilePage
│       │   ├── shared/
│       │   │   ├── components/       # Layout, ErrorBoundary, NotFoundPage
│       │   │   │   └── ui/           # Avatar, Badge, Button, Card, Input, Loading, Modal, StarRating, Textarea
│       │   │   ├── hooks/            # useInfiniteScroll, usePhotoUrls
│       │   │   ├── lib/              # env.ts, supabase.ts, utils.ts, logger.ts, storage.ts, provider-policy.ts
│       │   │   └── validation/       # schemas.ts (Zod), index.ts
│       │   ├── test/                 # Vitest setup (setup.ts)
│       │   ├── index.css             # Global styles + Tailwind directives
│       │   └── main.tsx              # Entry point: QueryClient, AuthProvider, BrowserRouter
│       ├── e2e/                      # Playwright E2E tests
│       │   └── discover.spec.ts
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
├── SYSTEM.md                         # LLM-oriented architecture doc
├── PROMPT.md                         # Original build prompt / spec
├── docs/AGENT_CONTINUATION.md        # Agent handoff document
└── package.json                      # Monorepo root with workspace scripts
```

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Pages | `{Name}Page.tsx` | `DiscoverPage.tsx`, `VenueDetailPage.tsx` |
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
| Supabase client | `apps/web/src/shared/lib/supabase.ts` |
| Environment config | `apps/web/src/shared/lib/env.ts` |
| Provider policy | `apps/web/src/shared/lib/provider-policy.ts` |
| Auth context | `apps/web/src/features/auth/AuthProvider.tsx` |
| Mock provider | `apps/web/src/features/events/providers/mock-provider.ts` |
| Mock seed data | `apps/web/src/features/events/providers/mock-catalog.ts` |
| TM browser provider | `apps/web/src/features/events/providers/ticketmaster-browser-provider.ts` |
| Validation schemas | `apps/web/src/shared/validation/schemas.ts` |
| Tailwind theme | `apps/web/tailwind.config.js` |
| DB migrations | `packages/db/migrations/001-006` |
| TM API client | `packages/jobs/src/ticketmaster/ticketmaster-client.ts` |
| Sync service | `packages/jobs/src/sync/sync-service.ts` |