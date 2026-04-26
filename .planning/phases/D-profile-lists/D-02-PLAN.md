# Plan D-02: Profile Enrichment UI

**Wave:** 2 (depends on D-01 for hooks and types; parallel to D-03 with no file overlap)
**Goal:** Add avatar upload, social links, gig stats to profiles, and enhance the public profile page with tabs.

---

## Files to Create/Modify

### 1. `apps/web/src/features/profile/components/AvatarUpload.tsx` — New component

```
Props:
  currentAvatarUrl: string | null
  userId: string

Layout:
  - Current avatar (large, 96x96) with edit overlay button
  - Hidden file input triggered by click/overlay button
  - Accepts image/jpeg, image/png, image/webp only
  - Max 5MB client-side validation
  - On file select: create canvas, resize to 256x256, convert to blob
  - Upload via useUploadAvatar mutation
  - Loading spinner during upload
  - "Remove" button if avatar exists
  - Error state display
```

### 2. `apps/web/src/features/profile/components/SocialLinksForm.tsx` — New component

```
Props:
  (none — uses useAuth and direct Supabase update internally)

State:
  - websiteUrl, twitterHandle, instagramHandle (from useUserPreferences or direct query)
  - isSaving from mutation

Layout:
  - Website URL input (with https:// prefix, validates URL format)
  - Twitter handle input (@handle format, strips leading @)
  - Instagram handle input (@handle format, strips leading @)
  - Save button
  - Uses useUpdateProfile mutation (new, or direct Supabase update)
```

### 3. `apps/web/src/features/profile/components/GigStatsCard.tsx` — New component

```
Props:
  userId: string

Data:
  - Reviews count (from supabase.from('reviews').select count where user_id = userId and is_public = true and status = 'published')
  - Events attended count (from supabase.from('attendance').select count where user_id = userId)
  - Followers count (from useFollowerCount(userId) — already exists)
  - Following count: artists + venues + users followed (sum of counts from existing hooks or a new RPC)

Layout:
  - Grid of 4 stat items: Reviews, Events, Followers, Following
  - Each with icon (Star, Calendar, Users, Heart), count number, and label
  - Compact glass-card style
```

### 4. `apps/web/src/features/profile/pages/ProfilePage.tsx` — Modify

- Add `AvatarUpload` component above the form
- Add `SocialLinksForm` as a new Card section below the profile form
- Add `GigStatsCard` summary at the top (below the avatar)
- Update form validation schema to include `website_url`, `twitter_handle`, `instagram_handle`
- Load these new fields in the profile fetch useEffect

### 5. `apps/web/src/features/profile/pages/PublicProfilePage.tsx` — Modify

- Add `GigStatsCard` below the avatar/name section
- Add social link icons (Globe for website, Twitter icon, Instagram icon) next to the bio
- Add tab navigation: Reviews | Lists (only shows "Lists" tab if lists exist or it's the owner's profile)
- The Reviews tab shows the existing review list
- The Lists tab is a placeholder for now (D-03 will populate it)
- Import Link icons from lucide-react for social links

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Create AvatarUpload | `apps/web/src/features/profile/components/AvatarUpload.tsx` | D-01 |
| 2 | Create SocialLinksForm | `apps/web/src/features/profile/components/SocialLinksForm.tsx` | D-01 |
| 3 | Create GigStatsCard | `apps/web/src/features/profile/components/GigStatsCard.tsx` | None |
| 4 | Modify ProfilePage | `apps/web/src/features/profile/pages/ProfilePage.tsx` | Tasks 1-3 |
| 5 | Modify PublicProfilePage | `apps/web/src/features/profile/pages/PublicProfilePage.tsx` | Task 3 |
| 6 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-5 |

## Verification

- Avatar upload resizes to 256x256 before upload
- Avatar upload stores in `avatar-photos` bucket with correct path
- Social links validate format (URL for website, @handle for Twitter/Instagram)
- GigStatsCard shows correct counts
- ProfilePage form includes new fields
- PublicProfilePage shows social links and stats
- Build passes, tests pass, 0 lint errors