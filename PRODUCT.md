# ratemygig — Product definition

> **Status:** written 2026-08-22, inferred from the codebase (`PROMPT.md`, `packages/core/src/types`, `apps/web/src/features/*`) and the reference research in `docs/design/references/`. Where the code didn't settle a question, this document states an assumption rather than leaving a blank. Assumptions are marked **[A]**.

---

## 1. One sentence

**ratemygig is where you keep a permanent record of every gig you've been to — what you saw, where, who with, what they played, and whether it was any good.**

Discovery of upcoming shows exists to feed that record. The record is the product.

---

## 2. Who it's for

### Primary: the gig-goer who counts

People who go to somewhere between 8 and 60 live shows a year and already, informally, keep score. They remember that the Fontaines D.C. show at Albert Hall was better than the one at Manchester Academy. They have a shoebox of tickets, a camera roll they never revisit, and a running argument with a friend about which venue has the worst sound.

They are already the type of person who logs things: Letterboxd for films, RateYourMusic or Discogs for records, Strava for runs. **[A]** The Letterboxd overlap is assumed to be high and is the single strongest positioning signal we have.

What they want:
- A place the memory *goes*, so it stops being lost
- Their own history back, sliced and counted (most-seen artist, venue league table, year in gigs)
- Enough social surface to argue with friends, without becoming a social network job

### Secondary: the venue and artist scout

The same person, in planning mode. Before buying a ticket they want to know: is this venue actually good, or is it a converted warehouse with two toilets and a sightline problem? Aggregate venue and artist ratings answer that — and they only exist because the primary audience keeps logging.

### Explicitly not for

- **Ticket buyers who want the cheapest seat.** We link out to tickets; we don't sell them and we take no affiliate position on price.
- **Industry professionals.** No promoter tooling, no analytics dashboards, no artist claim-your-page flow.
- **Passive music discovery.** We are not a recommendation engine you scroll. Spotify does that. You have to have *gone*.

---

## 3. What it actually does

Grouped by the job it serves, mapped to what exists in the codebase today.

### A. Find something to go to
- **Discover** (`/`) — upcoming events, filtered by city and date range, searchable by artist or venue. Trending and recommended sections for signed-in users; nearby venues via geolocation.
- **Event detail** (`/events/:id`) — lineup, date/time, venue, map link, ticket links, community reviews, aggregate rating, "friends going" from your follow graph, add-to-calendar (.ics + Google).
- Event data is ingested from Ticketmaster on a daily cron, with a mock catalogue for offline development.

### B. Log that you went
- Mark attendance on an event ("I went").
- **Write a review** (`/review/:eventId`) — 1–5 rating, optional title, body, tags, photos (client-resized, thumbnailed). Saves as **draft** or **published**.
- **Setlist** (`/events/:id/setlist`) — the owner of a logged gig can enter the songs played, in order, with cover/medley markers.
- **My Gigs** (`/my-gigs`) — the personal archive: everything attended, reviewed, drafted. CSV export, calendar export.

### C. Get your history back as something
- **Gig Wrapped** (`/wrapped`) — one year, counted: gigs attended, distinct artists, distinct venues, top five artists, top five venues. Year navigation back to 2000.
- **Profile** (`/profile`, public at `/u/:username`) — stats row, review archive, followed artists and venues, social links, privacy controls.
- **Song pages** (`/songs/:id`) — how many times you've heard a song live, first and last time.

### D. Compare and argue
- **Venue detail** (`/venues/:id`) and **Artist detail** (`/artists/:id`) — aggregate rating, rating distribution, review list, gig archive, follow button. Aggregates are filterable by city, year, venue, and artist, computed server-side.
- **Top Venues** (`/venues/top`) and **Top Artists** (`/artists/top`) — leaderboards with year and city filters.
- **Feed** (`/feed`) — reviews from people you follow.
- **Lists** (`/lists/:id`) — user-curated collections of events.
- Reactions and comments on reviews; notifications when someone you follow posts, or an artist/venue you follow announces a show.

### E. Share
- Every published, public review has a permanent URL (`/r/:reviewId`) with a generated OG share card.
- Public profiles are opt-in per user, and reviews are individually public or private.

---

## 4. Positioning

> **Letterboxd for gigs.**

That's the one-line pitch, and it's earned rather than borrowed: the diary entry as a social object, the profile as an archive, statistics as the reward for logging.

Where we sit relative to the three products in `docs/design/references/`:

| | Them | Us |
|---|---|---|
| **Songkick** | Great at *what's on*. Discovery is the destination; your history is a thin "tracked artists" list. | Discovery is the *on-ramp*. The destination is your archive. |
| **setlist.fm** | Great at *what was played*. A crowd-edited wiki about artists — impersonal, and reviews aren't the point. | Setlists are one column of your entry, not a separate encyclopedia. Owner-authored, not wiki-edited. |
| **Letterboxd** | The model for the diary-as-social-object and the profile-as-archive. Different medium. | Same shape, but live music: the event is a one-time thing that happened *to you*, in a *place*, on a *date*. That difference drives the design. |

### The thing only we can say

A film is the same film in every cinema. **A gig is never the same twice.** The same artist on the same tour is a different night in Glasgow than in Bristol; the venue is a co-author of the experience; the date is not metadata, it's the identity of the thing.

So ratemygig rates the *intersection* — this artist, at this venue, on this date — and can therefore answer questions no one else can: *which room does this band sound best in, and was the night I went a good one?*

---

## 5. Product principles

1. **The date is the identity.** Every gig is a specific night. Dates are typographic heroes, never grey metadata in the corner.
2. **The venue is a co-author.** Never render an artist without the room, or a room without the city.
3. **Logging must be cheaper than remembering.** The path from "I was there" to a saved entry is short, forgiving, and resumable — drafts exist because people start reviews at 1am on the bus home.
4. **Statistics are the payoff, not a settings page.** Counts, streaks, league tables and Wrapped are the reason to keep logging. They get real design attention.
5. **Social is for argument, not for reach.** Follows, reactions and comments exist so friends can disagree about a show. No follower counts as vanity metrics, no algorithmic ranking, no growth loops.
6. **We never sell you a ticket.** Ticket links are a courtesy and are visibly a hand-off, not a conversion funnel.
7. **Empty is the normal first state.** A new user has zero gigs logged. Every archive surface must be designed for zero as carefully as for two hundred.

---

## 6. Voice

Second person, plain, slightly dry. The voice of a friend who also goes to a lot of shows and isn't precious about it.

- "You haven't logged any gigs yet." — not "Your journey begins here."
- "Rate the night" — not "Submit your review."
- "Couldn't load this venue. Try again." — not "Oops! Something went wrong 😅"
- Numbers stated flatly: "41 gigs. 33 artists. 19 venues."

Never: exclamation marks in system messages, emoji in UI chrome, "amazing"/"epic"/"legendary", apologising errors, or music-journalist adjectives applied to the user's own taste.

---

## 7. Assumptions register

| # | Assumption | Basis | Risk if wrong |
|---|---|---|---|
| **[A1]** | Primary audience overlaps heavily with Letterboxd / RateYourMusic users | Reference set chosen for this project; product shape mirrors Letterboxd | Design leans archival when audience wants planning-first |
| **[A2]** | UK/Europe-leaning gig-goers ("gig" not "concert" in the product name) | Product name, and "gig" used throughout the codebase | Copy register reads slightly off to a US audience |
| **[A3]** | Mobile is where logging happens, desktop is where browsing happens | Reviews are written after the show; archives are browsed at leisure | Wrong emphasis in responsive priorities |
| **[A4]** | Users log *retrospectively*, often weeks late | Draft support exists; no live check-in feature | Discovery deserves more weight than assumed |
| **[A5]** | Photo-per-review counts are low (0–4), not gallery-scale | Client-side resize to 1200px + 300px thumb, no album UI | Photo layouts under-designed |

Revisit this table when real usage data exists.
