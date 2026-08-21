# Reference: setlist.fm (setlist.fm)

## Source
- URL: https://www.setlist.fm
- Capture date: 2026-08-21
- Evidence: firecrawl `branding` extraction (+ metadata); screenshot at `.firecrawl/setlistfm-screenshot.png`

## Why this reference matters to us
The user wants **setlists and venue stats as first-class functions**. setlist.fm is the proof these are browsable, wiki-grade surfaces — not an afterthought tab:
- Artist page → tour archive → per-gig setlists → song statistics ("played 214 times", "first/last played")
- Venue page → gig history archive, "latest setlist", stats facade
- Personal statistics for logged-in users

## Design tokens (observed)

### Colors
| Role | Value | Notes |
|---|---|---|
| Brand green | `#85B146` | Header, primary buttons |
| Deep green | `#6A8E39` | Secondary actions |
| Ink | `#343138` | Text |
| Background | white / `#F4F4F2` panels | Light wiki aesthetic |

### Typography & shape
- Roboto throughout; utilitarian scale (h1 ~34px)
- **0px radius** — everything square; reads as "database/wiki", dense tables
- 4px base unit; hairline separators

### Components observed
- Setlist block: numbered song list with tape/cover-art icons, "Edit" wiki affordance
- Song stat bars and "songs played" leaderboards
- Breadcrumb-heavy navigation (Artist → Tour → Concert)
- Dense data tables with muted headers

## What we adopt (function-wise)
1. **Per-event setlist** with numbered songs + covers/medley markers
2. **Song statistics**: play counts, first/last played, avg rating per song
3. **Venue archive**: past gigs list + aggregate venue rating facade
4. **Personal stats** ("your year in gigs") — we already have Wrapped data

## What we skip
- Wiki-style community editing (our setlists are owner-authored)
- Their light/square skin — we render this content in our dark editorial system
