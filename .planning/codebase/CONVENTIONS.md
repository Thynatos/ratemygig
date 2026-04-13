# Conventions

## Code Style

- **TypeScript strict**: Uses `typescript-eslint` recommended config with React hooks and React Refresh plugins
- **ES Modules**: `"type": "module"` in jobs package; Vite handles ESM for web app
- **Function components**: All React components are function components with hooks
- **Named exports**: Components and hooks use named exports (not default), except `App.tsx` which uses `export default`
- **Path aliases**: `@/`, `@shared/`, `@features/`, `@core/`, `@jobs/` — used consistently in imports

## Component Patterns

- **Feature module pattern**: Each feature has `api/`, `components/`, `pages/` (and `providers/` for events)
- **UI primitives**: `shared/components/ui/` — `Button`, `Card`, `Input`, `Modal`, `StarRating`, `Badge`, `Avatar`, `Loading`, `Textarea`
- **`cn()` utility**: Used for conditional className merging (Tailwind)
- **Error boundaries**: `shared/components/ErrorBoundary.tsx` wraps the app root
- **Loading states**: UI primitives handle skeleton/spinner patterns

## State Management

- **Server state**: TanStack React Query with `useQuery` / `useMutation` hooks in `api/*.ts` files
- **Query key factories**: e.g., `eventKeys.list(filters)`, `eventKeys.detail(id)` — co-located in API modules
- **Cache invalidation**: Explicit `queryClient.invalidateQueries()` on mutations
- **Stale time**: 5 minutes default, 30 minutes for cities
- **Auth state**: React Context (`AuthProvider`) — not in React Query

## Data Access

- **Direct Supabase queries**: No API middleware; all database access uses `supabase.from('table')` or `supabase.rpc()`
- **Zod validation**: Input schemas in `shared/validation/schemas.ts` — used with `react-hook-form` resolvers
- **Row mapping**: `mapEventRow()`, `mapProviderEventToEvent()` — transform DB/provider shapes into domain types
- **Dependency injection**: Event resolution uses `resolveEventsWithDeps()` / `resolveEventWithDeps()` pattern for testability

## Form Handling

- `react-hook-form` + `@hookform/resolvers/zod` validation
- Schema-driven definitions in `shared/validation/schemas.ts`
- Forms: login, profile edit, review write, event filters, rating filters

## File Upload

- Supabase Storage bucket `review-photos`
- Path format: `{userId}/{reviewId}/{uuid}.{ext}`
- Constraints: JPG/PNG/WebP only, 10MB max, 10 photos per review
- Validated at schema level (`photoUploadSchema`)

## Error Handling

- `ErrorBoundary` component catches React render errors
- Supabase errors thrown and caught by React Query error boundaries
- `logger.ts` for structured logging
- Ticketmaster client: 404s return `null`, other errors are thrown

## Styling

- **Tailwind CSS 3** with dark mode (`darkMode: 'class'`)
- Custom color palette: `primary` (sky blue), `accent` (fuchsia), `surface` (slate)
- Custom fonts: Inter (body), Outfit (display)
- Glassmorphism + glow effects (`boxShadow: 'glow'`, `'glow-lg'`, `'glow-accent'`)
- Animations: `fade-in`, `slide-up`, `slide-down`, `scale-in`, `spin-slow`, `pulse-glow`
- PostCSS + Autoprefixer

## Database Conventions

- UUIDs for all primary keys
- `created_at` / `updated_at` timestamps on mutable tables
- `set_updated_at()` trigger function for automatic timestamp updates
- JSONB columns for `ticket_urls` and `lineup` in events table
- RLS policies on all user-owned tables
- Composite unique constraints: `(provider, provider_event_id)`, `(user_id, event_id)`, `(name, city, country)`