# ADR-0072 — The Item Palette, the Rules Evolved for the Reference Direction, and the Two Institutional Pages

**Status:** Accepted and built, except D12 (proposed, awaiting the owner's approval).
**Date:** 2026-09-15
**Authority:**
- Owner batch brief of 2026-09-15, «الدفعة الختامية: نظام الألوان، ومطابقة المرجع، والحركة السينمائية — الرؤية والرسالة ثم كلمة الرئيس». Its §4 approves five decisions, its §10 grants the authority to evolve a rule that blocks a better result (never contrast or accessibility), and its §8 keeps back one decision (the green hero overlay, D12).
- Three owner messages during the batch:
  - build both pages without stopping, choosing between options with the skills and against UI/UX criteria;
  - the identity lines go in empty places, behind the content or smaller, and never push the content or break the design;
  - no visible breadcrumb on the institutional pages; the trail stays in structured data.
- The owner's two visual references (Vision & Mission; the President's Message).

**Amends:** ADR-0065 D2, D3 and R2 (D1) · ADR-0069 D10 IL-1, IL-3/IL-4 outside the hero and IL-5 (D2) · ADR-0070 D1 and D4 (D5, D10) · ADR-0071 D7, D8, D9 and D10 (D1, D2, D5) · Chapter 4's type scale (D4) · `ui/surface.ts`'s card edge, for item cards (D1) · IA §8.5 and Chapter 14 §4 on the institutional pages (D7) · Chapter 2 PR-010 for linked routes (D11).

**Does not amend:** any contrast floor (4.5 text and grounds, 3 shapes, every theme) · keyboard, focus and reduced-motion rules · the header, the footer and the shared layout · Figma (locked; D14 lists the back-sync).

**Amended by ADR-0074 D2 (2026-09-15), recorded before the change:**
- **D1, the item edge in dark.** The edge is each ramp's 200 step (`green.200`, `teal.200`, `steel-blue.200`, `desert-sand.200`), no longer the card's own ground. It reaches 3:1 or more on the page grounds and the green register; measured 3.96–5.69 on green and 7.90–11.35 on the dark base. Light and high contrast are unchanged.
- **D5, Vision & Mission.** The values stand on the green register, and the call to action on the page's ground with its photograph.

**Companion:** `docs/engineering/page-building-guide.md` (the guide for the next page, in Arabic).

> **Amended by ADR-0073 (2026-09-15):** D2 — the identity lines outside the hero also stand on the seam between two sections (`SeamLines`). D5 — the alternating grounds carry the rhythm, but not the separation: base and sunken are ΔE 2.13 apart in light and one white in high contrast. *Content for the client* — the hero's football stadium is replaced; the vision's remains, awaiting the owner.

---

## D1 — The item palette

Four existing ramps, one colour per position in a closed set of cards: the goals, the values, and the two statements. An item has three names in each of the three lists: `--color-item-N-surface` (the card's ground), `--color-item-N-ink` (its number and icon) and `--color-item-N-edge`.

### The condition (owner §4.1, as built)

- **Among the four inks:** ΔE ≥ 10 in the worst of normal, deuteranope and protanope vision. The card carries a number and a title, so colour is not the only cue (WCAG 1.4.1); the earlier 15 was stricter than the criterion asks.
- **Against the state colours:** ΔE ≥ 15 under the same three visions, against each state's resting colour and its text name (`--color-semantic-{success,error,warning,info}` and `-text`).
- **Narrowed here, for the owner's review:** the `-hover` variants are not in the state set. Measured with them, light has no set at all: desert sand `.800` ↔ `error-hover` 12.85, and green `.200` ↔ dark `success-hover` 8.22. A hover colour appears only under the pointer on a labelled control and never carries a state's meaning on its own.
- Simulation Viénot, Brettel and Mollon (1999); CIE76 on CIELAB (D65); every threshold compared unrounded.

### The values

**Light** (card text: `text-primary` and `text-secondary`; `text-muted` is not used on an item card):

| Item | Surface | Ink | Ink on surface | Ink on page grounds (min) | Primary / secondary on surface |
| --- | --- | --- | --- | --- | --- |
| 1 green | `green.100` #B8E0C5 | `green.900` #002110 | 11.84 | 15.59 | 14.51 / 6.25 |
| 2 teal | `teal.100` #B3E0D6 | `teal.600` #155748 | 5.85 | 7.67 | 14.55 / 6.26 |
| 3 steel blue | `steel-blue.100` #B3D1E6 | `steel-blue.600` #094A73 | 5.89 | 8.53 | 13.18 / 5.67 |
| 4 desert sand | `desert-sand.100` #F0DFC0 | `desert-sand.800` #422C14 | 10.00 | 11.92 | 16.02 / 6.90 |

Among the inks **10.75** (item 1 ↔ 4, protanope) · against the states **16.20** (item 3 ↔ `info-text`) · against the categories, normal vision, 9.13 (item 2 ↔ category 2, reported) · the four grounds apart, normal vision, 9.00.

**Dark:**

| Item | Surface | Ink | Ink on surface | Ink on page grounds (min) | Primary / secondary on surface |
| --- | --- | --- | --- | --- | --- |
| 1 green | `green.800` | `green.200` | 6.51 | 8.19 | 12.40 / 6.81 |
| 2 teal | `teal.800` | `teal.200` | 7.21 | 8.20 | 13.70 / 7.52 |
| 3 steel blue | `steel-blue.900` | `steel-blue.300` | 5.09 | 4.61 | 17.25 / 9.47 |
| 4 desert sand | `desert-sand.900` | `desert-sand.100` | 12.61 | 12.44 | 15.82 / 8.68 |

Among **13.38** · against the states **15.59** (item 3 ↔ `info`) · against the categories 22.16 · grounds apart 17.16.

**High contrast:** surface `#FFFFFF`, ink `#000000`, edge `#000000` (21:1). No hue: no step of desert sand clears both 15 from that theme's dark state colours and 3:1 on white (`.500` 10.5 from the states; `.400` 2.77:1). The number and the title tell the cards apart there.

### Why green's ink is the darkest step in light

Every green step from `.300` to `.700` stands under 15 from the success colours for a deuteranope or protanope (`.700` 4.7), and `.800` falls within 10 of desert sand's ink under protanopia (7.41). `.900` is the one step that clears both. The card still reads green through its ground.

### How the colour is assigned (cycling)

Alternatives, judged on four criteria: no two neighbours sharing a colour in one, two and three columns; the reference; a rule an editor cannot break; no category reading.

| Option | Neighbours | Reference | Rule | Chosen |
| --- | --- | --- | --- | --- |
| **Position modulo 4** (1, 2, 3, 4, 1, 2) | none share a colour in 1, 2 or 3 columns | the goals in the reference exactly | derived, nothing to set | **yes** |
| Tones of one hue per set | adjacent cards 2–3 ΔE apart | loses the reference's four colours | derived | no |
| A different starting colour per set on one page | none share | the reference's values do not follow one | a second rule to remember | no |

### The conflict with ADR-0065 D2 and D3, resolved by evolving the rule

| | Before | After |
| --- | --- | --- |
| ADR-0065 D3 | "Where the data carries a real classification, colour is assigned per category and fixed — never per item." | Unchanged for categories. **Item colours** are a second role: a card in a closed set takes the colour of its position. The two roles never meet: an item colour is never on a category badge, never in one element with a category colour, and never in a view that shows a category legend. No item token equals a category token (teal's ink is `.600`, because `.700` is category 2). |
| ADR-0065 R2 | "No colour for decoration." | Unchanged, except that a measured item colour is a second cue for telling cards apart, not decoration. |
| ADR-0065 D2, green | "Card fills, panel tints": `brand.primary` | Item 1 uses green's ramp steps (`.100`, `.900`), never `brand.primary` itself. |

Scope: every page with a closed set of cards.

### The card

`ui/item-card.tsx`:
- the item's ground, a `radius-lg` corner and 24px padding (32px from `md`);
- the number at `display-l` in the ink, where the set is ordered;
- the icon at `--icon-size-lg` (32px) in the ink, with no chip;
- the title at `h4` and the description at `body-sm` in the text tiers.

It carries no lift and no arrow, because it is not a link. Its edge is the card's own ground in light and dark (an item card is not a control, so WCAG 1.4.11 asks nothing of its boundary) and black in high contrast. The card recipe's `border-strong` stays the rule for every raised object that is a control.

**The guard:** part 4 of `token-lists-contract.spec.ts`:
- the three names exist in each list;
- the inks are at least 10 apart and at least 15 from the resting states, in light and dark;
- high contrast has no hue.

It was seen red on the missing names, then red on the two hover distances above, which is how they were found.

## D2 — The identity lines

| Rule | Before | After | Why |
| --- | --- | --- | --- |
| IL-1 | "Each stroke keeps the committed footer ribbon's thickness-to-length ratio." | Each stroke keeps the ribbon's shape and length, at **a third** of its thickness for that length (the light weight). | The references draw light strokes. The mark stays recognisable through its shape, order, spacing, angle and colours, which do not change. |
| IL-5 | "`--space-8` (32px) between any painted point of a stroke and any text **or image**…" | …and **any text run**. A stroke may cross a photograph. | Owner decision §4.5. The hero still holds its portrait clear by its own construction. |
| IL-3, IL-4 outside the hero (ADR-0071 D8) | Groups A and B at the frame's edges of a band, with reserves above and below the content (235px at 1440). | No band and no reserve. On a photograph beside a statement or a call, group A at **twice** IL-4's length, set on the corner of the photograph's cut edge. | The owner's rule: the lines take empty places, go behind the content or shrink, and never push content aside. |

What stays forbidden:
- a stroke within 32px of text, at rest or in any frame;
- a stroke that widens the page;
- a stroke that mirrors (IL-7);
- a stroke in the accessibility tree.

Scope: every page that carries the lines.

**Measured, light weight at `xl`:**
- the hero's green stroke is 192 × 8.4px;
- the photograph group's green stroke is 384 × 16.8px, and the group measures 444 × 289px;
- below `md` the green stroke is 96px and the photograph group 222 × 145px.

**The guard:** `e2e/identity-lines.spec.ts`.
- The hero case is unchanged.
- The band case is replaced: every stroke on a photograph is measured against every text run in `<main>`, as loaded and through its reveal. It expects two strokes per photograph, so a record without photographs checks that none are drawn.

## D3 — The accent rule

`--color-border-accent` is a new name in the three lists: `green.500` in light (4.61 / 4.81 / 4.38 on base / raised / sunken), `green.400` in dark and black in high contrast. It is a shape at 3.

It is drawn by `ui/accent-rule.tsx`, a 24 × 2px dash before a statement's name, the goals' label and the values' heading. On the green register the dash takes the band's text colour. It also draws the pull-quote's rule and the neutral outlined link's edge.

## D4 — `display-2xl`

`font.size.display-2xl` is 128px on desktop and 80px on mobile, at line height 1 and weight black, one octave above `display-xl` (64 / 40). 128 is `--space-32` on the 8-point grid. It is used by the statements' ordinals. Before, the scale stopped at 64px, and the reference's ordinals stand at about three times the heading.

## D5 — The page's rhythm

- **Neutral sections alternate their ground.** `Section` takes `ground: "base" | "sunken"`, and every text tier and item ink is measured on both.
- **Vision & Mission:**
  1. hero (photograph, content height);
  2. vision (base);
  3. mission (sunken);
  4. goals (base);
  5. values (sunken);
  6. call to action (green register).
- **The President's Message:**
  1. hero (first screen, portrait);
  2. message (base);
  3. values (green register);
  4. call to action (base).
- **The call to action takes the ground opposite the section before it.**
- **This replaces ADR-0070 D4's panels.** The values and the call stood in photograph panels under the scrim inside the container. The values now stand on the page's ground in item colours, as in the reference. The call stands on the green register with its photograph slanted at the far end. The values' stored photograph (`valuesImageId`) is no longer printed; the field stays (D13).

## D6 — The slanted photograph

`ui/slanted-photo.tsx`:
- **From `lg`:** the picture runs from the page edge on its side to the column gap (`50% − --space-8`), the section's height, cropped to cover. Protocol §7 lets photography extend beyond containers.
- **Below `lg`:** full bleed through the container's margins, at its own ratio.
- **The cut:** its inner edge is cut `--slant` deep: `--space-12`, `-16` from `md`, `-24` from `lg`, `-32` from `xl`. It leans lower-left to upper-right in both languages, and the polygon is physical.

| Option | Reference | Picture kept | Identity angle | Across breakpoints | Chosen |
| --- | --- | --- | --- | --- | --- |
| Full-height 45° cut | flatter than the reference | at `lg` a 420px-tall picture 435px wide loses almost all of its inner half | 45° | breaks at `lg` | no |
| **Token depth (about 72°)** | the reference's angle | loses at most a 128px triangle | not 45°: a crop, not the motif | one token per breakpoint | **yes** |
| 45° corner chamfer | not a parallelogram | nearly whole | 45° | robust | no |

## D7 — No visible trail on the institutional pages

| | Before | After |
| --- | --- | --- |
| IA §8.5 | A breadcrumb is mandatory from depth ≥ 2. | **Not visible** on the institutional pages: `/about` and everything under it. Their `BreadcrumbList` JSON-LD stays. |
| Chapter 14 §4 | JSON-LD is emitted only where the visible breadcrumb is. | On the institutional pages it is emitted without the visible trail. |

- **Why:** the site is shallow, the header's About menu carries the place, and the hero gains room and clarity (owner, 2026-09-15).
- **Scope:** the institutional pages only. Deep entity pages (a club, an athlete, an event) keep the visible trail and are re-evaluated when they are built.
- **Built:**
  - `IdentityHero` renders no trail row without one;
  - both pages pass none;
  - the preparing pages under `/about` and the static `/about` pages (board members, committees) follow the same rule through one `isInstitutional` helper.

## D8 — The entrance (cinematic, one-shot)

- **Order:**
  1. **The hero, on load:** the ground settles (`ambient`); the title, name and subtitle rise along 45° in sequence (`base`, 60ms steps); the strokes slide in along their axes (`slow`).
  2. **Below the first screen, once, as each block enters the view** (`reveal-once.tsx`):
     - a statement's ordinal climbs three rises from 90% (`slower`);
     - its name and statement follow one step apart (`base`);
     - its photograph slides in from the page edge inside its own cut (`slower`), then the two strokes grow from their tails (`slow`, two steps later);
     - the cards follow, number, icon and words in turn, and cards that enter together follow one another in reading order;
     - the call to action last.
- **Limits, all held:**
  - `transform` only, no opacity, so the largest paint is never hidden;
  - no layout shift;
  - no sideways scroll (the slide stays inside the cut, the section clips);
  - one play per block;
  - no scroll-jacking;
  - durations, easing and stagger from the motion tokens;
  - under `prefers-reduced-motion` nothing is marked and nothing plays;
  - without JavaScript the page is at rest and complete.
- **Excluded on purpose:** a block already on screen when the page opens is left at rest. Taking it away to animate it in would show it twice; the flash is worse than the missing entrance.
- **UI/UX reference:** `ui-ux-pro-max` recommends offsets of 8–16px, at most about eight staggered children, and respect for reduced motion. The rise here is 16px (8px on a phone), with six cards.

## D9 — The President's message in two columns

From `lg` the body keeps Chapter 4 §4.6's measure on the reading-start side, and the pull-quote stands beside it at the same measure on the far side. The quote spans every row the paragraphs take (`grid-row: 1 / span n`) and stays in view while the body scrolls. Its rule is the accent rule.

The DOM order is unchanged, so the phone's reading order (first paragraph, quote, rest) is the screen reader's at every width.

## D10 — An icon for each goal

`strategicGoals` moves from `ContentBlock[]` to `IconKeyedContentBlock[]`, the twelve keys of `VALUE_ICON_KEYS`, exactly as `coreValues` is (owner approval §4.4). This amends ADR-0070 D1's "no icon, as the board defines".

- **API:** the schema, both DTOs, the public projection and the OpenAPI document; the specs were seen red then green.
- **Dashboard:** the Vision & Mission editor shows the icon control for goals.
- **Local database:** the page record and its Live revision carry `star`, `trophy`, `flag`, `shield-check`, `users` and `handshake` for goals 1 to 6. This is a temporary choice by meaning, for the federation's approval.

## D11 — Pages in preparation for linked routes

Every internal link reachable from the two pages now resolves. There are twelve routes:
- `/about`, `/about/organisational-structure`, `/about/governance/strategic-plan`, `/about/governance/policies`;
- `/officials`, `/championships`, `/events/federation-events`, `/help`;
- `/accessibility`, `/privacy`, `/terms`, `/sitemap`.

Each page has its title from the site's labels, the standard hero and one status sentence from the messages (`Preparing.status`), and nothing else. Each is registered in `PREPARING_PAGES` (`lib/pages/public-pages.ts`), `noindex`, and outside the sitemap. The full page later takes its entry into `PUBLIC_PAGES` under the same route.

- **Conflict recorded:** Chapter 2's PR-010 lists "Coming Soon" pages as an anti-pattern. The owner's instruction ranks first (CLAUDE.md §1). The pages say nothing but their title and the status, and search engines never see them.
- **The guard:** `internal-links-contract.spec.ts`. It was seen red on exactly the twelve routes.

## D12 — The green hero overlay (proposed, not built)

- **Measured:** white title and the subtitle at 85% opacity over a pure white photograph (the scrim's worst admissible ground), at both ends of the gradient. The lowest alpha that clears 4.5 for both:

| Overlay | Lowest alpha |
| --- | --- |
| `green.700` | 0.80 |
| **`green.800`** | **0.72** |
| `green.900` | 0.66 |
| today's black | 0.59 |

- **Proposal:** a new name, `--color-surface-overlay-brand`, set to `green.800` in all three lists and used at 72% → 80%. The preview is in the batch report.
- **Not built:** a new colour name needs the owner's approval (brief §8).
- **The design critique (D15) recommends it, with three conditions:**
  1. High contrast keeps black, since that theme carries no hue (D1).
  2. Judge it on a warm photograph (a red track in daylight), not only on the night stadium.
  3. Look at `green.900` at 0.66 as well: it lets more of the photograph through and has deeper shadows.

## D15 — The design critique, and what it changed

`impeccable critique` of both pages from full-page screenshots: Vision & Mission 15/24, "acceptable"; the President's Message 17/24, "good". There was no P0.

**Fixed, each with a test seen red:**

| Finding | Change | Why it holds |
| --- | --- | --- |
| P2: the statement's words were squeezed. The photograph took half the row, and the Arabic mission title broke into three short lines | The photograph takes 5 of 12 columns (`100% × 5/12 − --space-8`) and the words 7, on a 12-column grid | The cap a portrait takes beside a title (ADR-0069 D10); Chapter 5's grid |
| P2: the goals' name was a 13px label while "قيمنا" was a 32px heading | The goals use the values' pattern: the `h2` at its size with the accent rule, the stored sentence under it at `body-lg`, secondary | The reference sets "الأهداف الاستراتيجية" as the heading with a smaller line under it |
| P2: on the green band the primary button (green fill, 1.95:1 against the band) was weaker than the outlined secondary | The primary on the green register takes the band's inverse: the band's text colour as its ground and the band's colour as its text (9.40:1, 6.1:1 pressed) | The action hierarchy reads the right way, and the edge is carried by the fill itself |
| P2: the pull-quote stood at the container's far edge, 254px from the body, without the reference's quotation mark | One column gap from the body (`justify-self: start`); a decorative quotation mark at `display-xl` in the accent colour, hidden from assistive technology | The quote belongs to the letter |

**Recorded for the owner, not changed:**

| Finding | Why it is not changed here |
| --- | --- |
| P1: both calls to action lead to pages in preparation | The owner's instruction was to create those pages, not to change the links (brief §6.4). Other targets or labels are an IA and copy decision |
| P1: the black hero scrim | D12, awaiting approval |
| P1: the English header shows only "Home" at 1440 (the Arabic header shows three or four items) | The header is protected (brief §9). Not verified whether it is a screenshot-timing effect |
| P2: goals and values are 12 near-identical cards in a row | The reference has the same structure. Lighter values (neutral ground, colour on the icon only) would be a design decision |
| P2: the footer's strokes cross its social icons | The footer is protected. Its own artwork is not the identity lines of IL-5 |
| P3: the President's hero is 804px of flat green in the fixture, which has no photograph | Content: the record's hero photograph and the portrait's resolution |
| Question: should the two statement ordinals exist at all? They carry no information and meet goals 01–06 on the same page | Owner direction (ADR-0071 D7, brief §8.1.1); kept |

## D13 — The 39 direct colour uses

ADR-0071 D5 counted 39 places where the application named a ramp step or an identity colour directly.

| Uses | Where | Outcome |
| --- | --- | --- |
| 8 | button bindings, `HERO_SCRIM` | Moved in ADR-0071 D5 |
| 3 | `strategy-cta.tsx`, the outlined link's edge and tints | Moved here to `--color-border-accent` and the green register's own text colour (D5) |
| 1 | `president-message.tsx`, the pull-quote's rule | Moved here to `--color-border-accent` (D3) |
| 10 | `ui/surface.ts`: `CARD_INTERACTIVE` and `FIELD_EDGE` hover edges (6) and `CARD_ICON`'s glyph (1); `styles/motion.css`: the card icon's hover fill and edge and its disabled glyph (3) | Moved to a new name, `--color-action-default`: the Action role of ADR-0065 D2, `green.500` in all three lists, so nothing changes on screen. It is a shape at 3 on the page grounds, and `--color-text-on-brand` records it as a partner for the filled icon |
| 4 | `contact-map.tsx`: the outlined link's edge and tints (3), the location pin (1) | The link moves to `--color-border-accent`. The pin moves to a new name, `--color-map-marker`: `red.500` in all three lists. It stands on map imagery, an unknown ground, so its value does not follow the theme, which is the reason `contact-map.tsx` already gave. It is measured as a shape at 3 on the base ground of the label card it hangs under |
| 10 | `globals.css` logo inks (3), `brand/uaeaf-motif.tsx` (4), `ui/identity-hero.tsx` stroke fills (3) | **Stay on the brand tier, by rule.** ADR-0002 and guide §9.1 forbid identity artwork from following the theme. The brand tier is one value for every theme by construction, whereas a name in the three per-theme lists could be given a different value per theme. `direction-and-logo-contract.spec.ts` and `brand-asset-contract.spec.ts` pin these names for that reason |
| 3 | `layout/site-header.tsx` (2), `layout/primary-nav.tsx` (1) | Stay: the header is protected (brief §9) |

The guard's ledger of ramp steps (`token-lists-contract.spec.ts`, part 3) is now empty: no file in `apps/web/src` names a ramp step.

## Tests

Every guard below was seen red for the reason it names before the change that makes it green.

| Guard | Red | Green |
| --- | --- | --- |
| `token-lists-contract.spec.ts` part 4 (item distinction) | The 12 names missing; then desert sand ↔ `error-hover` 12.85 and dark green ↔ `success-hover` 8.22 | 20/20 |
| `token-lists-contract.spec.ts` part 3 (ramp ledger emptied) | 5 uses left: `contact-map.tsx` 4, `surface.ts` 1 | Ledger empty; 252/252 across design-system, `ui` and contact specs |
| `vision-mission.spec.tsx` (rewritten for D1–D7) | 13 failing | Passing, within 306/306 across pages, `ui`, design-system and registry specs |
| `president-page.spec.tsx`, two columns (D9) | 1 failing | 17/17 |
| `static-page-screen.spec.tsx`, the institutional trail (D7) | 3 failing: helper missing; board members and committees showed the trail | 26/26 with the preparing-page, SEO and registry specs |
| `internal-links-contract.spec.ts` (D11) | Exactly the 12 unresolved routes | 130/130 with the registry, sitemap and contract specs |
| The critique's four fixes (D15): photograph at 5/12, the goals' heading, the primary's inverse on green, the quote beside the body with its mark | 4 failing | 298/298 across 17 files (pages and design-system specs); `tsc` 0, `eslint` 0 |
| The whole browser suite (`apps/web/e2e`), once, at the end of the batch, every route on every viewport | — | **106/106**, 0 unexpected, 0 flaky, 30 min:<br>- `identity-lines` 88: hero strokes at least 36.2px from content; photograph strokes at least 38.1px from text;<br>- `vision-mission-text` 2 and `president-text` 2: the page prints the stored record;<br>- `color-scheme` 6;<br>- `vitals` 8 |
| The whole web unit suite, with the servers stopped | 1 of 387 timed out: the unpaired-colour scan read every source file of both applications past Vitest's 5s default under the full suite's load (7.7s). It was not a colour finding; the case passes on its own | **387/387** across 27 files, after the case was given an explicit 30s timeout |
| The whole API suite, with the servers stopped | — | **841/841** across 96 suites (242s) |
| API goal icons (D10) | 7 failing: projection without `iconKey`, keys not refused; `seed-dev.spec.ts` 8 failing on the committed fixture | 14/14; `tsc` 0 |
| Dashboard goal icon control (D10) | 3/3 failing | 3/3; `tsc` 0 |
| `e2e/identity-lines.spec.ts`, work viewports (360×640, 768×1024, 1440×900 × ar, en × both pages) | Band case replaced by the photograph case | **32/32**. Hero strokes at least 36.2px from content. Photograph strokes at least **38.1px** from text (Vision & Mission, 360×640) and 64px on desktop; 3 photographs, 6 strokes, measured as loaded and through the reveal. Zero sideways-overflow frames. Reduced motion draws nothing animating; no opacity animation in `<main>` |

**Layout shift and the largest paint** (`e2e/vitals.spec.ts`, now per route through `VITALS_ROUTE`):
- Setup: a real mobile context at 390×844 and a desktop at 1440×900, Arabic and English, entrance on and off, CPU throttled 4×, every image held back 1.5s. The dev server with the local photograph fixture.

| Route | Before (16 cases) | After (16 cases) |
| --- | --- | --- |
| Vision & Mission | 8/8. CLS 0, and 0.0017 once, from the shared header. The page's own shifts: none | **8/8. CLS 0 in every case. The page's own shifts: none** |
| The President's Message | 8/8. CLS 0, and 0.0017 once, from the shared header. The page's own shifts: none | **8/8. CLS 0 in every case. The page's own shifts: none** |

The largest paint after the change was 2.7–4.4s, every time an image. The before run measured 3.4–27.5s on a server that had been compiling under load, so the two are not comparable, and no improvement is claimed. What the run does show is that the entrance never delays the paint: the same page with the entrance off measures in the same range.

## D14 — Pending Figma back-sync

The following have no frame yet:
1. both pages' new sections: the slanted photographs with their strokes, the ordinals at `display-2xl`, the item cards and the alternating grounds;
2. the President's two-column message;
3. both heroes without a trail, and the light strokes;
4. the twelve preparing pages;
5. the item palette and the accent rule as variables.

## Content for the client

- The hero's and the vision's football stadium: temporary photographs, to be replaced by the federation's own.
- The six goal icons (D10): a temporary choice.
- The President's Message has no field for a signature image, a call-to-action photograph or a sentence under the values heading; the reference shows all three.
- The values' stored photograph is no longer printed on Vision & Mission.
- The reference's copy differs from the record (goal 03 is repeated as 06 in the reference). The record's copy is printed.

## Registry

DT-GOVERNANCE-007 · Item colours by position in a closed set · Active · v1.0 · Owner: Design System · References: [ADR-0072 D1]
