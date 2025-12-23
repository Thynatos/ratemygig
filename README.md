# 🎵 ratemygig

> Discover upcoming concerts, get ticket links, save attended gigs, rate/review experiences with photos, and explore aggregated ratings for artists & venues.

![ratemygig](https://img.shields.io/badge/ratemygig-Concert%20Rating%20Platform-blueviolet)

## 🚀 Features

- 🎫 **Discover Concerts** - Browse upcoming events by city, search by artist/venue
- 🎟️ **Ticket Links** - Quick access to ticket purchase sites
- ⭐ **Rate & Review** - Share your concert experiences with ratings and photos
- 📊 **Aggregated Ratings** - View venue and artist ratings with filters
- 🔗 **Shareable Reviews** - Public review pages for social sharing
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
└── README.md
```

## 🏁 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (or local Supabase)

### 1. Clone and Install

```bash
git clone <repo-url>
cd ratemygig
npm install
```

### 2. Configure Environment

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_EVENTS_PROVIDER=mock
```

### 3. Set Up Supabase

#### Option A: Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run migrations from `packages/db/migrations/`:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_indexes.sql`
   - `004_aggregation_functions.sql`
   - `005_storage.sql`
3. Enable Auth providers:
   - Email (Magic Link)
   - Google OAuth

#### Option B: Supabase Local

```bash
npx supabase init
npx supabase start
npx supabase db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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
- Allowed types: JPG, PNG, WebP
- Max size: 10MB per file
- Max 10 photos per review

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm run test
```

### E2E Tests (Playwright)
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
| `npm run lint` | Lint code |

## 🎨 Design System

The app uses a custom dark theme with:
- **Colors**: Primary (sky blue), Accent (fuchsia), Surface (slate)
- **Effects**: Glassmorphism, subtle glows, micro-animations
- **Typography**: Inter (body), Outfit (display)

## 🚧 Roadmap

- [ ] Real event provider integration (Ticketmaster/Songkick)
- [ ] Scheduled event sync (Supabase Edge Functions)
- [ ] Image thumbnails generation
- [ ] Top rated venues/artists leaderboard
- [ ] Review reactions (helpful/upvote)
- [ ] Friend follow system
- [ ] Export gig history as CSV

## 📄 License

MIT

---

Built with ❤️ for music lovers
