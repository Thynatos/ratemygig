# Reference: Letterboxd (letterboxd.com)

## Source
- URL: https://letterboxd.com
- Capture date: 2026-08-21
- Evidence: firecrawl `branding` extraction (+ metadata); screenshot at `.firecrawl/letterboxd-screenshot.png`

## Why this reference matters to us
The chosen **visual direction** ("dark editorial") and the product model:
- Diary entry = social object (log a film → it appears in feeds, friends can like/review)
- Profile as an archive: ratings histogram, favorites, yearly lists
- Restrained chrome; poster imagery + big type carry the identity

## Design tokens (observed)

### Colors
| Role | Value | Notes |
|---|---|---|
| Background | `#14181C` | Near-black blue-grey; the whole app |
| Surface | `#1B2126`–`#20262C` range | Cards, rows |
| Primary/slate | `#445566` | Buttons, chips, secondary surfaces |
| Accent green | `#00AC1C` | THE CTA color — used for one action only |
| Text | `#9AB` muted / white emphasis | Two-level text system |
| Rating | `#00E054`-ish green stars | Ratings glow against dark |

Key pattern: **one loud accent, everything else quiet slate**. Color is earned by content (posters), not chrome.

### Typography
- Graphik (grotesque) everywhere — we substitute **Inter**
- Georgia italic reserved for film titles/quotes in editorial contexts — a signature trick worth stealing for event names
- Compact scale; 13–15px UI text

### Spacing & shape
- 4px base unit — tight, dense feel
- ~3px radius cards; buttons small-radius with subtle inset highlight (`inset 0 1px rgba(255,255,255,.1)`)
- Poster grids: consistent aspect ratio, hover reveals actions

### Components observed
- Film card: poster + hover overlay (watched/like/watchlist quick-actions)
- Review row: poster thumbnail + review snippet + star rating inline
- Profile header: avatar, stats row (films/ratings/followers), favorites strip
- Yearly "Your year in film" lists

## What we adopt
1. Full token palette direction: `#14181C` base, slate surfaces, single accent
2. Serif-italic display for **event/artist names** in editorial moments
3. Card hover quick-actions (rate/log instead of watched/like)
4. Profile stats-row + rating histogram patterns
5. Dense-but-calm density (4px rhythm)

## What we skip
- Green accent (ours will differ — decision pending)
- Their exact layout metaphors where our content is date-driven rather than title-driven
