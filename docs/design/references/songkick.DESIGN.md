# Reference: Songkick (songkick.com)

## Source
- URL: https://www.songkick.com
- Capture date: 2026-08-21
- Evidence: firecrawl `branding` extraction (+ metadata); screenshot at `.firecrawl/songkick-screenshot.png`

## Why this reference matters to us
The logged-out → logged-in arc the user wants:
- **Logged out:** trending concerts, most popular artists front and center.
- **Logged in:** homepage becomes personal — your tracked artists' upcoming gigs.
- Calm, simple chrome; content (posters/dates) does the visual work.

## Design tokens (observed)

### Colors
| Role | Value | Notes |
|---|---|---|
| Brand / CTA | `#E70154` | Vivid pink-red; used sparingly for primary actions |
| Secondary | `#F80046` | Hover/brighter variant |
| Dark surface | `#0C0D0D` | Header/footer band |
| Text on dark | near-white | |
| Link | `#066792` | Utilitarian blue |

### Typography
- Headings: **Archivo** (geometric grotesque), very large display sizes (h1 ~85px marketing)
- Body: **Helvetica Neue** stack; compact 12–14px UI text
- Dates are typographic heroes on event rows — big day/month, muted year

### Spacing & shape
- 8px base unit
- Cards ~3px radius (nearly square); **primary buttons are full pills** (`9999px`)
- Flat shadows; separation via hairline borders and whitespace, not elevation

### Components observed
- Event **list rows**: date block (left) + artist/venue meta (middle) + track/CTA button (right) — dense, scannable
- Artist tiles: photo, name, "X people track" social proof line
- Pill CTA ("Sign up") in brand pink; secondary actions as quiet dark pills
- Location/city switcher prominent in header

## What we adopt
1. Date-block event row as our core list primitive
2. Trending/popular-first logged-out home; personalized after auth
3. Pill primary buttons + near-square cards; restrained single accent color
4. Social-proof microcopy ("12k tracking")

## What we skip
- Ticket-affiliate CTAs (we don't sell tickets)
- Their exact pink (we keep sky/fuchsia family or pick fresh — decision pending)
