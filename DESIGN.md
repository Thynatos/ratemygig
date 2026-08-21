# ratemygig — Visual direction

**THE BOARD** · direction locked 2026-08-22 · seed key `4f855fe9` (direction / operate) · form: candidate 3 of 7 grounded

> This document is the direction contract. It was written at lock and is updated at finish to describe what was actually built. Product truth lives in [PRODUCT.md](PRODUCT.md).

---

## 1. Thesis

**A gig is a listing before it is a memory.** Every show this product touches existed first as a line on a board — the changeable-letter board in a venue foyer, the painted fascia, the month of dates screwed to the wall by the box office. ratemygig is that board, kept.

The idea this surface owns: **the rail**. Content is not held in cards; it is held on horizontal rails, in fixed slots, the way plastic capitals sit in the grooves of a letter board. Date in the left slot. Name in the body. Score in the right slot. Every list in the product, everywhere, forever.

**What it refuses:** the near-black music app with a neon gradient, glass cards, and glowing hover states — which is exactly what this codebase shipped before, and exactly what the category ships by default. Not one glow, not one gradient, not one rounded card survives.

---

## 2. Where it came from

Derived from the gig-goer's own world, not from software. The grounded candidates, in order of resonance: the box-office ticket stub · the screenprinted gig poster · **the venue marquee and foyer letter board** · the taped setlist sheet · the tour laminate · the mixing-desk channel strip · the 7″ record centre label.

The board won the roll and holds up under scrutiny for a reason the poster and the stub don't: **a letter board is already an interface.** It has a fixed grid, a rigid row contract, a state system (the strip you slide in when a show sells out), and a hard constraint on typography (letters live in slots; you cannot kern them). That grammar transfers to an app without costume.

### Raises taken from the challengers

Three challenger worlds were fused against this direction and weighed on audience identification and product clarity. None beat it on both axes. Each donated one discipline it had and the board lacked:

- **RAISE — the row contract** *(from the sneaker archive wall, declined)*. That world's power is that every box end carries the same three fields in the same slots, so a wall of them reads as one system. Adopted: **one row contract — slot · body · slot — used by every list in the app.** No feature gets a bespoke card.
- **RAISE — numbers as material** *(from Ikeda's datamatics, competitive)*. Adopted: **figures are the visual material on statistics surfaces**, set in tabular lining figures, column-aligned, at display scale. Rating distributions are drawn as bare columns, not as decorated widgets.
- **RAISE — printed-mark states** *(from the centre-rail reference setting, competitive)*. Adopted: **states are printed marks at exactly one device pixel, never glows.** Hairline at rest, filled when pressed, struck when spent, double-ruled on focus. Zero radius. Motion is damped, single-axis, no overshoot.

### Self-critique against the known defaults

| Default | Verdict |
|---|---|
| Cream ground + high-contrast serif display + terracotta | Refused. No cream, no serif display, no terracotta. |
| Near-black + one neon accent + glowing edges | **The live danger.** The incumbent app is literally this. Refused by material rule: the ground is a warm brown-black that reads as *board*, not void; the accent is amber **plastic**, and `box-shadow` with a zero offset is banned outright. Flat fills, hard edges. |
| Broadsheet hairlines + italic serif + tracked mono labels | Adjacent — hairlines and mono labels are present. Distinguished by material: **expanded** capitals (not condensed, not italic serif), amber plastic strips, grooved insets, and no multi-column body text anywhere. |

---

## 3. The world

### Colour

**Strategy: restrained.** Warm neutrals plus one accent. Two additional colours exist and are strictly semantic — they may never be used decoratively.

Dark, not by category but by scene: *a gig-goer on the last bus at 11:40pm, phone at low brightness, thumb-typing what they thought of the night; and the same person on a Sunday laptop browsing their own archive.* Both are low-light. The product ships dark only, and says so.

| Token | Value | Role | Contrast on `--board` |
|---|---|---|---|
| `--groove` | `#0C0A08` | Page ground; the recess behind the board | — |
| `--board` | `#16130F` | The board itself — every panel and row | — |
| `--board-raised` | `#221D17` | A row under the cursor, a raised slot | — |
| `--rail` | `#3A342B` | Hairline rules between rows (decorative separation) | 1.5:1 (non-informational) |
| `--rail-strong` | `#6B6153` | Control boundaries: inputs, buttons, checkboxes | **3.06:1** ✓ |
| `--bone` | `#F2EBDD` | Primary text — warm bone plastic, faintly yellowed | **15.9:1** ✓ |
| `--bone-dim` | `#A79E8C` | Secondary text | **7.1:1** ✓ |
| `--bone-faint` | `#8A8172` | Micro-labels, timestamps, disabled | **4.9:1** ✓ |
| `--strip` | `#FFB020` | **The accent.** Sodium amber | **10.2:1** ✓ |
| `--strip-ink` | `#16130F` | Text *on* amber (board colour) | **10.2:1** ✓ |
| `--struck` | `#F0584A` | Semantic only: cancelled, sold out, destructive, error | **5.6:1** ✓ |

**The accent is earned, never decorative.** Amber appears in exactly three situations, all of which mean *this is the live thing*:
1. **Tonight** — today's date, the show happening now, the current year on Wrapped.
2. **Your score** — a rating you gave, or an aggregate score.
3. **The one primary action** on a screen. One. If two actions want amber, one of them isn't primary.

There is no success green. A confirmed state (attended, followed, saved) is a **filled bone mark**, not a colour — printed-mark discipline.

### Type

Two families. No serif display, no italic display, no system stack as a display voice.

- **Board voice — Archivo, width 125 (Expanded), 700–800, ALL CAPS, `letter-spacing: 0.02em`.**
  Slot letters are *wide* — they're molded plastic in a groove, and they can't be tightened. Positive tracking on expanded caps is the signature, and it is a deliberate refusal: the category reflex for live music is condensed caps with tight negative tracking. Used for page titles, the date slot, and section headings. **Never for body copy or user-written text.**
- **UI voice — Archivo, width 100, 400/500/600.** Sentence case. 15px base, compact and dense, in the tradition of both reference products.
- **Reading voice — Archivo, width 100, 400, 17px/1.6, measure capped at 68ch.** Review bodies, About/Privacy/Terms.
- **Data voice — Fragment Mono, 400.** Only where there is real data or measurement: catalog-style event IDs, timestamps, play counts, setlist positions. Never as a costume for "technical".
- **Figures — Archivo with `font-variant-numeric: tabular-nums lining-nums`** everywhere a number can change or align in a column.

Scale (fluid, clamped):

| Step | Size | Use |
|---|---|---|
| `board-xl` | `clamp(2.5rem, 7vw, 4.25rem)` | Page title on a board header |
| `board-lg` | `clamp(1.75rem, 4vw, 2.5rem)` | Section headings, big figures |
| `board-md` | `1.25rem` | Row titles, subsection headings |
| `ui-lg` | `1.0625rem` | Reading body |
| `ui` | `0.9375rem` | Default UI text |
| `ui-sm` | `0.8125rem` | Secondary row meta |
| `label` | `0.6875rem`, caps, `0.08em` | Slot labels, column headers |

### Shape and material

- **Radius: 0. Everywhere.** Buttons, inputs, panels, avatars, photos, modals. A letter board has no rounded corners. This is the single most legible break from the incumbent.
- **Rules are exactly 1 device pixel** (`1px` at 1×; hairline via `border-width: 1px` on a `--rail` colour — never 2px decorative left borders).
- **Elevation is groove, not shadow.** A raised element is a lighter fill (`--board-raised`) between two rails. Where a real shadow is required for layering (modal, dropdown, sticky header), it carries an **offset and a soft blur** — `0 12px 32px -8px rgba(0,0,0,.7)` — never a zero-offset halo.
- **The strip** is the one solid amber form: a flat rectangle, board-coloured text, no radius, no shadow, no gradient.
- **Spacing: 4px base unit.** Rows are dense (44–56px tall on mobile, comfortable touch targets); groups are separated generously. More space above a heading than below it.

### Structure — the row contract

Every list in the product renders the same three-part row:

```
├─ SLOT ─────┬─ BODY ───────────────────────────┬─ SLOT ──┤
│  FRI       │  Fontaines D.C.                  │  ████▌  │
│  14        │  Albert Hall · Manchester        │   4.0   │
│  MAR       │  19:30 · with Been Stellar       │         │
├────────────┴──────────────────────────────────┴─────────┤
```

- **Left slot** is fixed-width (`5.5rem` desktop, `4rem` mobile) and holds the *identity* of the row — for an event, the date, set in board voice; for a leaderboard, the rank; for a setlist, the position.
- **Body** is the name and its inseparable context. *Never an artist without the room, never a room without the city* (PRODUCT.md §5.2).
- **Right slot** holds the score or the single row action.
- Rows are separated by one `--rail` hairline. The board's own edges are `--rail-strong`.
- Hover / focus raises the row fill to `--board-raised` and turns its **left rail-cap amber** — a 2px amber bar in the row's left gutter that reads as a strip slid partway in.

### Motion

One authored moment, one axis. A strip slides into a groove; it does not bounce, scale, or fade up.

- **Grammar:** `translateX` only, `140–200ms`, `cubic-bezier(.2,0,0,1)`, from an already-visible default. No overshoot, no scale, no blur transitions.
- **The authored moment:** on a board's first paint, the amber TONIGHT strip slides in from the left over 220ms, once. Nothing else on the page animates on entrance.
- **Micro-interaction:** the row rail-cap wipes from 0 to full height on hover/focus (120ms). Pressed controls translate 0 and instead **invert fill** — a printed mark, not a physical press.
- **`prefers-reduced-motion: reduce`** removes every transform and transition; states change instantly. Nothing is hidden behind an animation.

### Browser surfaces

Themed from the palette, not left to defaults: selection (`--strip` at 25% with bone text), caret (`--strip`), scrollbars (groove track, rail thumb, square), focus ring (see below), and `text-underline-offset`.

### Focus

**Focus is a printed bracket, not a glow.** `outline: 2px solid var(--strip); outline-offset: 2px;` — square, amber, always visible, never removed. On amber surfaces the outline flips to `--bone`. Applied via `:focus-visible`, with `:focus` fallback on custom controls.

---

## 4. Signature

**The board header with the TONIGHT strip.**

Every primary page opens with a board header: the page title in expanded bone capitals against the board, a rail beneath it, and — where the page has a *live* fact — a flat amber strip carrying it in board-coloured capitals. On Discover it reads the real date. On Wrapped it reads the year. On a venue page it reads the next show in that room. It appears **once per page**, slides in once, and is the only saturated colour above the fold.

The second signature, smaller and everywhere: **the score strip** — a rating rendered as five square slots on a rail, filled slots in amber, empty slots in groove. It replaces the star icon entirely. It is the same object at 12px in a row and at 40px on a review page.

---

## 5. Honest risk

All-caps expanded type and zero radius can tip into cold or into retro-kitsch signage cosplay. Three guards:

1. **Caps are rationed** — display voice and micro-labels only. Every sentence a human wrote (review bodies, comments, empty-state copy, errors) is sentence-case Archivo at reading size.
2. **No bulbs, no marquee lights, no chase animation, no distressed textures.** The world is the *board*, not the Broadway sign. Kitsch enters through ornament, and there is none.
3. **Warmth carries the temperature** — the brown-black ground and yellowed bone are what keep a zero-radius, all-hairline system from reading as a terminal.

Second risk: dark-only ships without a light theme. Accepted deliberately — the use scene is low-light on both ends, and a half-committed second theme would dilute the material. Recorded here so a future session knows it was a decision, not an oversight.

---

## 6. Scope

Applies to every route under `apps/web/src`. The token layer lives in `apps/web/src/index.css` and `apps/web/tailwind.config.js`; the row contract and board primitives live in `apps/web/src/shared/components/ui/`.

---

*Section 7 — what was actually built — is appended at finish.*
