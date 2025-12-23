# 🚀 Coding LLM Prompt — Build “ratemygig” (TypeScript + Vite)

You are a senior full-stack engineer. Build a production-ready web app called **ratemygig**.

## 0) One-line Goal
A website to **discover upcoming concerts**, **get ticket links**, **save attended gigs**, **rate/review experiences (with photos)**, and **explore aggregated ratings for artists & venues** with filtering by **city / year / venue / artist**.

---

## 1) Hard Requirements (Must-Haves)

### Tech / Stack
- **Frontend**: TypeScript + **Vite** + **React**
- Styling: **Tailwind CSS** (and small component primitives if needed)
- State/data: **@tanstack/react-query** for server state, minimal local state (Zustand or Context)
- Routing: **react-router**
- Forms/validation: **react-hook-form + zod**
- Testing: **Vitest** (unit) + **Playwright** (e2e)

### Auth (must)
- Users can login via:
  1) **Email magic link** (send login email)
  2) **Google OAuth**
- No passwords.

### Core Product Features
1) **Upcoming concerts list**
   - Browse by city (and optionally country/region)
   - Search artist/venue
   - Sort by date
   - Each event shows: artist(s), date/time, venue, city, and **ticket link(s)**

2) **Concert detail page**
   - Event info + lineup + venue + map link
   - Ticket links
   - Community reviews and aggregate rating (if any)

3) **My Gigs (attended concerts)**
   - User can save an event as “I went”
   - Add rating + review text
   - Upload photos to the review
   - Edit/delete own review/photos

4) **Sharing**
   - Each review has a **public shareable URL**
   - Public profile page (optional but recommended): shows user’s reviews (privacy controls below)

5) **Aggregated Ratings**
   - **Venue ratings**: average score + distribution + tags
   - **Artist ratings**: average score + distribution + tags
   - Filters:
     - City
     - Year (from event date)
     - Venue
     - Artist
   - Filtering affects computed aggregates (server-side)

---

## 2) Strong Recommendations (Use These Unless There’s a Better Reason)

### Backend choice (recommended)
Use **Supabase** (Postgres + Auth + Storage + Row Level Security).
- Supabase Auth supports magic link + Google OAuth
- Supabase Storage for photo uploads
- RLS to protect data
- Edge Functions (optional) for ingestion or secure endpoints

If you choose a different backend, it must still provide:
- magic link auth
- OAuth Google
- secure storage uploads
- database with relational queries and aggregations

### Concert data source
Integrate at least one external “events” provider:
- Ticketmaster / Songkick / Bandsintown / similar
- Store external IDs and ticket URLs
- IMPORTANT: Make the provider integration **pluggable**:
  - `IEventsProvider` interface
  - One concrete implementation (e.g., Ticketmaster)
  - A mock provider for local dev without API keys

If API keys are missing, app must still run using mock seed data.

---

## 3) Non-Functional Requirements (Quality Bar)
- **SOLID + clean architecture**: separate domain, data access, UI
- Type safety end-to-end (zod validation at boundaries)
- Security:
  - RLS for user-owned tables
  - Safe file upload rules
  - Prevent XSS (sanitize user content as needed)
  - Rate limit sensitive endpoints (where applicable)
- Performance:
  - Pagination / infinite scroll for listings
  - Caching via React Query
  - DB indexes for common filters
- Accessibility: semantic HTML, keyboard nav, focus states
- Responsive design: works on mobile & desktop
- Observability: structured logging (basic), error boundaries
- Developer Experience:
  - `README.md` with full setup instructions
  - `.env.example`
  - scripts for dev/build/test
  - clear folder structure

---

## 4) Data Model (Design + SQL Migrations)

### Entities (minimum)
**users** (managed by Supabase auth)  
**profiles**
- `id (uuid, pk, references auth.users)`
- `username (unique, nullable)`
- `display_name`
- `avatar_url (nullable)`
- `bio (nullable)`
- `is_profile_public (bool default true)`

**events** (fetched from provider)
- `id (uuid pk)`
- `provider (text)` e.g. "ticketmaster"
- `provider_event_id (text, unique with provider)`
- `name (text)` (e.g. “Artist — Tour Name”)
- `start_at (timestamptz)`
- `city (text)`
- `country (text)`
- `venue_id (uuid, fk venues)`
- `ticket_urls (jsonb)` array of `{label,url}`
- `lineup (jsonb)` array of artist names or IDs (see below)
- `created_at`

**venues**
- `id (uuid pk)`
- `name (text)`
- `city (text)`
- `country (text)`
- `lat (numeric, nullable)`
- `lng (numeric, nullable)`
- `provider_venue_id (text, nullable)`
- unique constraint: `(name, city, country)` or a provider-based unique key

**artists**
- `id (uuid pk)`
- `name (text unique)`
- `provider_artist_id (text nullable)`

**event_artists** (many-to-many)
- `event_id (uuid fk events)`
- `artist_id (uuid fk artists)`
- `billing_order (int)` (optional)
- pk: `(event_id, artist_id)`

**attendance** (user saved “I went / I plan to go”)
- `id (uuid pk)`
- `user_id (uuid fk auth.users)`
- `event_id (uuid fk events)`
- `status (text)` enum: `planned | attended`
- unique constraint: `(user_id, event_id)`

**reviews**
- `id (uuid pk)`
- `user_id`
- `event_id`
- `rating (int 1..5)`
- `title (text nullable)`
- `body (text)`
- `created_at`, `updated_at`
- `is_public (bool default true)` (shareable)
- unique constraint: `(user_id, event_id)` (one review per user per event)

**review_photos**
- `id (uuid pk)`
- `review_id`
- `storage_path (text)` (Supabase storage key)
- `blurhash (text nullable)` or thumbnail path
- `created_at`

**tags** (optional but nice)
- pre-defined: sound, crowd, view, security, vibes, pricing, etc.
- `review_tags(review_id, tag)`

### Indexes (minimum)
- events: `(city, start_at)`, `(start_at)`
- reviews: `(event_id)`, `(user_id)`, `(is_public)`
- venues: `(city, name)`
- artists: `(name)`
- event_artists: `(artist_id)`

### RLS Policy Requirements (Supabase)
- profiles: user can update own profile; public can read only if `is_profile_public`
- attendance: user-only
- reviews: user can CRUD own; public can read only if `is_public = true`
- review_photos: user can CRUD if owns review; public read only if parent review public
- events/venues/artists: read-only for all (writes only by service role / admin ingestion)

---

## 5) API / Data Access Strategy

### Option A (preferred with Supabase)
Use Supabase client directly from frontend with:
- RLS enforced
- Use **RPC functions** or **views** for aggregation queries (recommended)
- Zod validate results in the data layer

### Aggregations needed (server-side)
Create Postgres **views** or **RPC** for:
1) `get_venue_rating_summary(filters)`
2) `get_artist_rating_summary(filters)`
Where filters include:
- `city?: string`
- `year?: number`
- `venue_id?: uuid`
- `artist_id?: uuid`

Return:
- `avg_rating`
- `count_reviews`
- distribution counts for 1..5
- optionally top tags

### Ticket links
Stored per event. Always render safely (validate URLs).

---

## 6) UI/UX Requirements (Pages + Behavior)

### Public Pages
1) **Home / Discover**
   - City selector (remember last city)
   - Upcoming events list (paginated / infinite)
   - Filters: date range, venue, artist search
   - Each card: date, artist(s), venue, city, “Tickets” CTA, “Details”

2) **Event Detail**
   - Event summary (date/time, venue, city)
   - Ticket links
   - “Save” / “Mark attended”
   - Ratings summary (avg + count)
   - Reviews list (public)
   - If logged in and attended: review editor entry point

3) **Venues**
   - Venue directory by city
   - Venue detail: rating summary + filtered reviews + past events (optional)

4) **Artists**
   - Artist directory search
   - Artist detail: rating summary + filtered reviews + upcoming events (optional)

### Authenticated Pages
5) **My Gigs**
   - Tabs: Planned / Attended
   - For attended: show review status (not reviewed / reviewed)
   - Quick add/edit review

6) **Write/Edit Review**
   - rating (1..5)
   - title (optional)
   - review text
   - tags (optional)
   - photo uploader (multiple)
   - toggle public/private
   - save

7) **Profile**
   - display name, username, bio, avatar
   - public toggle
   - list of reviews if public

### Shareable Page
8) **Public Review Page**
   - nice layout for sharing
   - show event info + rating + text + photos
   - canonical URL: `/r/:reviewId`

---

## 7) Photo Upload Requirements
- Use Supabase Storage bucket: `review-photos`
- Only allow images: jpg/png/webp
- Limit size (e.g. 10MB each) + max count per review (e.g. 10)
- Upload flow:
  1) client selects files
  2) upload to storage under path: `userId/reviewId/<uuid>.<ext>`
  3) insert row into `review_photos`
- Public access:
  - If review is public, images should display via signed URLs or public bucket with rules.
  - Prefer signed URLs to control access; cache them.

Optional but recommended:
- Generate thumbnails (client-side or edge function) to speed feeds.

---

## 8) Concert Provider Integration
Implement:
- `IEventsProvider` with methods:
  - `searchEvents({ city, from, to, query, page }): ProviderEvent[]`
  - `getEvent(providerEventId): ProviderEvent`
- Provide at least:
  - `MockEventsProvider` with seed JSON
  - `RealEventsProvider` (one provider)
- Add an ingestion process:
  - When user browses a city, fetch and upsert events into DB
  - Avoid duplicates by `(provider, provider_event_id)`
  - Upsert venue and artist references

If you implement a scheduled sync:
- Use Supabase Cron + Edge Function OR document how to run a node script.

---

## 9) Project Structure (Vite + Clean Modules)
Use a structure like:


/ratemygig
/apps/web
/src
/app (routing, providers)
/features
/events
/reviews
/artists
/venues
/auth
/profile
/shared
/components
/lib (supabase client, env, utils)
/types
/validation (zod schemas)
main.tsx
/packages/core (domain types, interfaces)
/packages/db (sql migrations, rpc, seed)
README.md

```

Keep domain types in `packages/core` and reuse in web app.

---

## 10) Environment Variables
Provide `.env.example` including:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_EVENTS_PROVIDER` = `mock | <provider>`
- `VITE_TICKETMASTER_API_KEY` (or whichever provider you choose)

Never commit secrets.

---

## 11) Implementation Steps (Do in this order)
1) Scaffold Vite React TS app + Tailwind + Router + React Query
2) Configure Supabase client + auth flows (magic link + google)
3) Build DB schema migrations + RLS + storage bucket rules
4) Implement provider abstraction + mock provider
5) Build Discover + Event Detail pages with DB-backed events
6) Attendance save flow
7) Reviews CRUD + shareable public review page
8) Photo uploads + gallery
9) Venue/Artist pages + aggregation RPC/views + filters
10) Polish: loading states, empty states, errors, responsive UI
11) Tests: core utilities + e2e flows
12) Final docs + seed script

---

## 12) Acceptance Criteria (Definition of Done)
- `pnpm install && pnpm dev` works
- User can:
  - login via magic link and Google
  - browse upcoming events (mock data works without keys)
  - open event details and click ticket links
  - mark event attended
  - create/edit/delete review with rating + text
  - upload photos and see them displayed
  - share review via public URL
  - view venue and artist rating summaries
  - filter summaries by city/year/venue/artist
- Security:
  - RLS prevents reading private reviews/photos
  - Users cannot modify others’ data
- Code quality:
  - typed boundaries + zod validation
  - clean feature modules
- Documentation:
  - README includes Supabase setup steps, migrations, storage config, provider keys

---

## 13) Output Format Requirements (IMPORTANT)
Produce the entire project as a **multi-file repository**:
- For each file, output in a code block with a clear path header, e.g.
  - `// File: apps/web/src/main.tsx`
- Include SQL migration files and Supabase instructions.
- Include README with step-by-step setup and screenshots placeholders.
- Keep code runnable and consistent.

---

## 14) “Feel free to expand” — Safe Enhancements (Optional)
If time allows, add:
- “Top rated venues/artists this year” leaderboard
- Review reactions (helpful/upvote) with anti-abuse limits
- Setlist field (manual) + “best song moment” quick tag
- Friend follow system (later)
- Export user gig history as CSV
But do **not** derail the core deliverables.

---

## 15) Product Tone / Branding
Keep UI clean, modern, dark-mode friendly.
Brand name: **ratemygig** (simple logo text is fine).

---

### Start building now.
Do not ask questions unless absolutely blocking; choose sane defaults and document them in README.
```
