# 🎵 ratemygig

> Discover upcoming concerts, get ticket links, save attended gigs, rate/review experiences with photos, and explore aggregated ratings for artists & venues.

![ratemygig](https://img.shields.io/badge/ratemygig-Concert%20Rating%20Platform-blueviolet)

> **🚀 Ready to deploy?** See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete production setup guide.

## 🚀 Features

- 🎫 **Discover Concerts** - Browse upcoming events by city, search by artist/venue
- 🎟️ **Ticket Links** - Quick access to ticket purchase sites
- ⭐ **Rate & Review** - Share your concert experiences with ratings and photos
- 📸 **Photo Uploads** - Client-side resize + thumbnails (1200px + 300px)
- 📊 **Aggregated Ratings** - View venue and artist ratings with filters
- 🔗 **Shareable Reviews** - Public review pages for social sharing
- 📤 **Export CSV** - Download your gig history
- 🔐 **Secure Auth** - Magic link and Google OAuth login

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | TypeScript, Vite, React 19 |
| Styling | Tailwind CSS 3 |
| State | TanStack React Query, Zustand |
| Routing | React Router 6 |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Testing | Vitest, Playwright |

## 📁 Project Structure

```
ratemygig/
├── apps/
│   └── web/                    # Vite React application
│       └── src/
│           ├── app/            # Root app, routing
│           ├── features/       # Feature modules
│           │   ├── auth/       # Authentication
│           │   ├── events/     # Event discovery
│           │   ├── reviews/    # Reviews & My Gigs
│           │   ├── venues/     # Venue pages
│           │   ├── artists/    # Artist pages
│           │   └── profile/    # User profile
│           └── shared/         # Shared components, utilities
├── packages/
│   ├── core/                   # Domain types & interfaces
│   └── db/                     # SQL migrations & seeds
├── docs/
│   └── AGENT_CONTINUATION.md   # Handoff for AI agents / continuation loops
└── README.md
```

**Continuing development:** see [docs/AGENT_CONTINUATION.md](docs/AGENT_CONTINUATION.md) for what is done, what is open, and how to hand off to the next session.

## 🏁 Quick Start (Development)

```bash
git clone <repo-url>
cd ratemygig
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Uses mock data by default. For production deployment with real data, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## 🚀 Production Deployment

**Full step-by-step guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

Quick overview:
1. Create Supabase project
2. Run 12 SQL migrations in order
3. Configure Auth (Magic Link + Google OAuth)
4. Set environment variables
5. Seed with mock data or ingest from Ticketmaster
6. Build: `npm run build`
7. Deploy to Vercel/Netlify/static host

---

## 📁 Database Setup

Run migrations in Supabase SQL Editor (in order):

```
001_initial_schema.sql
002_rls_policies.sql
003_indexes.sql
004_aggregation_functions.sql
005_storage.sql
006_seed_mock_catalog.sql      ← Optional demo data
007_social_features.sql
008_setlists.sql
009_setlist_stats_rpc.sql
010_discovery_intelligence.sql
011_profile_lists.sql
012_review_photos_thumbnail.sql
```

## 🗃️ Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (linked to auth.users) |
| `venues` | Concert venues with location |
| `artists` | Musical artists |
| `events` | Concert events (from providers) |
| `event_artists` | Many-to-many: events ↔ artists |
| `attendance` | User attendance (planned/attended) |
| `reviews` | User reviews with ratings |
| `review_photos` | Photo attachments |
| `tags` | Review tags |
| `review_tags` | Many-to-many: reviews ↔ tags |

### Row Level Security

- **profiles**: Users can update own; public can read if `is_profile_public`
- **attendance**: User-only access
- **reviews**: CRUD own; public can read if `is_public`
- **events/venues/artists**: Read-only for all

## 🎭 Events Provider

The app supports pluggable event providers:

```typescript
interface IEventsProvider {
  searchEvents(params: SearchEventsParams): Promise<SearchEventsResult>
  getEvent(providerEventId: string): Promise<ProviderEvent | null>
}
```

### Available Providers

| Provider | Status | Env Variable |
|----------|--------|--------------|
| Mock | ✅ Ready | `VITE_EVENTS_PROVIDER=mock` |
| Ticketmaster | 🚧 Template | `VITE_EVENTS_PROVIDER=ticketmaster` |

The mock provider includes sample concert data for development.

### Provider mode behavior

The web app now uses one consistent provider contract:

| `VITE_EVENTS_PROVIDER` | Discover / event detail | Artists / venues / cities | Mock fallback |
| --- | --- | --- | --- |
| `mock` | DB `provider = mock` first, then mock seed data | DB mock-linked records first, then mock seed data | Yes |
| `ticketmaster` | DB `provider = ticketmaster` first, then live Ticketmaster if `VITE_TICKETMASTER_API_KEY` is set | DB Ticketmaster-linked records only | No |
| `all` | All DB rows first, then live Ticketmaster, then mock seed data | All DB-linked records first, then mock seed data | Yes |

Provider-scoped queries also fail closed now: if there are no linked Ticketmaster venues/artists/events in the DB, the app returns an empty list instead of leaking mock or global rows.

### Ticketmaster and empty Discover

If `VITE_EVENTS_PROVIDER=ticketmaster`, Discover reads **database** events where `provider = ticketmaster` and only uses the live Ticketmaster API when `VITE_TICKETMASTER_API_KEY` is set. The app does not fall back to mock data in that mode. If you see no events:

1. **Seed or migrate** — Run all SQL files in `packages/db/migrations/` in order (including `006_seed_mock_catalog.sql` if you want demo rows), or
2. **Ingest from Ticketmaster** — From the repo root, after configuring the jobs workspace:

   ```bash
   npm run jobs:ingest
   ```

   Set environment variables for `packages/jobs` (see root [`.env.example`](.env.example)): `TICKETMASTER_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` (export in your shell or load them with your usual tooling).

3. **Live API in the browser** — Without DB rows, the app can still call Ticketmaster from the client if `VITE_TICKETMASTER_API_KEY` is set in `apps/web/.env.local`.

## 🔐 Authentication

### Magic Link (Email)
1. User enters email
2. Supabase sends magic link
3. User clicks link → authenticated

### Google OAuth
1. User clicks "Continue with Google"
2. Redirects to Google auth
3. Returns to app authenticated

## 📸 Photo Uploads

- Stored in Supabase Storage bucket: `review-photos`
- Path format: `{userId}/{reviewId}/{uuid}.{ext}`
- Thumbnails: `{userId}/{reviewId}/thumbs/{uuid}.{ext}` (300px, generated client-side)
- Originals resized to max 1200px before upload
- Allowed types: JPG, PNG, WebP
- Max size: 10MB per file
- Max 10 photos per review

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm run test
```

### E2E Tests (Playwright)

After installing dependencies, download browsers once (required on a fresh machine):

```bash
cd apps/web && npx playwright install
```

Then:

```bash
npm run test:e2e
```

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run jobs:ingest` | One-shot Ticketmaster sync into Supabase (`packages/jobs`; service role + TM key) |
| `npm run lint` | Lint code |

## 🎨 Design System

The app uses a custom dark theme with:
- **Colors**: Primary (sky blue), Accent (fuchsia), Surface (slate)
- **Effects**: Glassmorphism, subtle glows, micro-animations
- **Typography**: Inter (body), Outfit (display)

## 🚧 Roadmap

- [x] DB-backed events + mock seed (`006_seed_mock_catalog.sql`) and optional live Ticketmaster (`VITE_EVENTS_PROVIDER`, `VITE_TICKETMASTER_API_KEY`)
- [x] Image thumbnails generation — client-side resize (1200px + 300px thumbs) on upload
- [x] Top rated venues/artists leaderboard — with year + city filters
- [x] Review reactions (helpful/like/love) — rate-limited, optimistic UI
- [x] Friend follow system — follow users, artists, and venues
- [x] Export gig history as CSV — from My Gigs page
- [x] Scheduled event sync (GitHub Actions cron) — see `.github/workflows/ingest.yml` and `packages/jobs`
- [x] Gig Wrapped — personal year-in-review stats at `/wrapped` (`015_user_year_stats.sql`)
- [x] Share cards / OG images — per-review social previews via Supabase Edge Function + Vercel crawler rewrite

## 📄 License

MIT

---

Built with ❤️ for music lovers
