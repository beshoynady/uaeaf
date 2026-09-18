# ADR-0085 — Building Sponsors, Partners and Memberships: the Real-Sponsor Exception, Single-Language Names and the Figma Corrections

**Status:** **Accepted** — 2026-09-17, by the owner («اعتماد المرحلة 0 وبدء التنفيذ»). Built in the batch described by `docs/plans/homepage-sponsors-plan.md`; any departure from this ADR is recorded and asked before it is built.
**Date:** 2026-09-17
**Authority:** The owner's batch prompt «دفعة: الرعاة + شريط الرعاة + الشركاء + العضويات» (2026-09-17), the Phase A findings approved in full, and the owner's answers to decisions A–K in the approval prompt of the same day.

**Accepts:** ADR-0077 (Proposed → **Accepted**) with the amendments in D1, and with its banner rule replaced by D5.1.
**Amends:** the seed rule «no real brand in the seed» (D2) · `docs/engineering/page-building-guide.md` rule 6's automated check (D3.4) · ADR-0037's "carousel/grid" wording for `CMP-AFFILIATIONS-001` (argued in ADR-0077 D4) · ADR-0077 D2 "the banner is filled by a strategic sponsorship" (D5.1) · the design-token set, which gains `--color-logo-plate` (D6.1).
**Does not amend:** ADR-0078 (the first screen is header + hero; the strip is below it) · ADR-0076 D4's "no hidden start state" condition · the hero and `packages/content/hero` · `AuditLogsRepository` · the RBAC system · the `sponsors.restricted` sub-document · `LocalizedText`, which stays bilingual-required for every other collection · the upload path and its refusal of SVG · `assertSafeDevTarget`.

---

## Context

- `sponsors`, `sponsorships`, `partnerships`, `memberships` existed only in `docs/product/07-Mongoose-Schema-Specification.md:858-910`. Nothing existed in `api/src`, the dashboard or the site.
- No `championships` or `events` collection exists in code (ADR-0081 D2). `federation` does.
- The upload path accepts PNG, JPEG and WebP only; **SVG is refused by decision** (`upload-constraints.ts`, "a script-bearing document").
- `LocalizedText` requires both `en` and `ar`. `mediaAssets.altText` uses it.
- `page-rules.spec.ts` rule 6 fails an image on the Arabic page whose alt text has no Arabic letter.

### The real sponsor, as found in Figma (read only)

| What | Node | Found |
| --- | --- | --- |
| Logo | `2374:1997` (`logo-image`, inside `ups-logo` `2374:1996`, inside the banner `2374:1993`) | **One raster only.** JPEG, **284 × 284**, opaque white ground, no transparency. Byte-identical (MD5 `e3165d78…`) to `apps/web/public/design-assets/sponsors/sponsor-logo-ultimate-power-solution-2374-1993.jpeg`. No SVG and no dark-ground variant |
| Name, banner | `2374:2004` | `Ultimate Power Solution` |
| Name, strip | `2374:1313` | `ULTIMATE POWER SOLUTION` (uppercase by CSS). The strip has no logo |
| Name, in the artwork | the logo | `ULTIMATE POWER SOLUTION` |

**Official display name (owner, 2026-09-17): `Ultimate Power Solution`** — singular, as the logo and Figma write it. English only (D4).

**Measured colours of the logo** (284px source, dominant clusters): blue ≈ `rgb(48,96,144)` **6.56:1** and `rgb(72,96,144)` **6.27:1** against white; red ≈ `rgb(240,48,48)` **4.06:1** against white; its ground white. Every part of the mark clears WCAG 1.4.11's 3:1 on its own white ground, which is why the plate (D6.1) is white.

---

## Decisions, as answered by the owner

| # | Question | Answer |
| --- | --- | --- |
| A | The strip with few logos | Still while the row holds them; moves, with a pause button, once it does not (D7) |
| B | Keeping demo data out of production | `isDemo` on the document **and** the existing seed guard; public reads exclude `isDemo` in production (D2.1) |
| C | `targetId` before championships/events exist | `targetType` required; `targetId` optional; Federation's is validated; `endDate` required for the other two (D1) |
| D | The same organisation in two sections | A separate record per collection; the logo asset may be shared (D1) |
| E | Tiers | `Strategic`, `Official`, `Supporting` — «الراعي الاستراتيجي» · «الراعي الرسمي» · «الراعي الداعم». **The real sponsor is `Official`.** The banner shows the highest tier present (D5.1) |
| F | The improved banner | D6, with `--color-logo-plate` added to the system (D6.1) |
| G | Name representation | `OrganizationName { ar?, en? }`, at least one (D4) |
| H | Official name | `Ultimate Power Solution` |
| I | Demo logos vs the SVG refusal | SVG sources in the project, rasterised to PNG at 2× with Playwright, uploaded through `MediaAssetsService` (D2) |
| J | Where Partners go | Their own section after Sponsors, on the green register (D5) |
| K | Alt text beside a printed name | `alt=""` where the name is printed beside the logo; the name as alt, with `lang`, where the logo stands alone. Rule 6's check reads `lang`, **with a negative test** (D3.4) |

---

## D1 — ADR-0077, accepted with its amendments

ADR-0077 D1–D6 are accepted as written, except:

1. **Names may be single-language (D4).** `sponsors.name`, `partnerships.partnerName` and `memberships.organizationName` use `OrganizationName`, not `LocalizedText`.
2. **`sponsorships.targetId` is optional** until the target collections exist:
   - `targetType: 'Federation'` → `targetId` must be the federation record's id, or empty (then read as the federation).
   - `targetType: 'Championship' | 'Event'` → `targetId` is accepted empty, and is not resolved (no collection to resolve against).
   - `endDate` is **required** when `targetType` is not `Federation`, so an event sponsorship still expires.
3. **Every one of the four collections gains `isDemo: Boolean = false`** (D2.1).
4. **`sponsorships`, `partnerships` and `memberships` gain `isVisible: Boolean = false`.** The specification's `isActive` (partnerships) and `status` (memberships, sponsorships) describe the **relationship**, not whether the site shows it. New records are hidden by default (ADR-0084's pattern); a visible record must be complete.
5. **The same organisation in two sections** is two records — one `partnerships` row and one `memberships` row — which may point at the same `mediaAssets` id. The specification's "no Organization model" rule stands, and ADR-0037's separation of commercial from governance relationships stays structural.

No field in the specification is removed; no enum value is withdrawn. No data exists to migrate.

---

## D2 — The real-sponsor exception to the seed rule

**Rule, amended:** the seed carries no real organisation's name or mark, **with one exception**: `Ultimate Power Solution`, the federation's actual official sponsor (owner, 2026-09-17).

- **Logo:** the Figma raster above, uploaded through `MediaAssetsService` by the seed, never referenced by a hard-coded path in application code.
- **Website:** `https://upsgenerator.com/`, opened in a new tab with `rel="noopener noreferrer"` and a readable "opens in a new tab" notice.
- **Tier:** `Official`.
- **Dates — PROVISIONAL:** start `2026-09-01T00:00:00+04:00`, end `2027-08-31T23:59:59+04:00` (`Asia/Dubai`), stored UTC. Marked provisional in the seed and in the explainer, to be replaced with the contract dates.
- **`isDemo: false`** — the only record in the seed allowed to reach production.
- **Not taken from `upsgenerator.com`:** no logo, no copy.
- **The Figma descriptor and taglines are not seeded.** They have no recorded source; `promotionalText` stays empty until the federation supplies text.

Every other partner, membership and sponsor in the seed is **fictional**: invented names, invented SVG marks drawn in the project and rasterised to PNG at 2× (the upload path's SVG refusal is untouched), `isDemo: true`. Some carry an English name only, some an Arabic name only, to exercise D4.

**The seed runs through `tsc` into its own output directory**, never `nest build`, so the API's `--watch` server is never stopped by it (owner, 2026-09-17).

### D2.1 — Demo data cannot reach the public in production

1. **The existing guard:** `assertSafeDevTarget` refuses `NODE_ENV=production` and any non-local database. Used, not weakened.
2. **The document flag:** every public read of the four collections excludes `isDemo: true` when `NODE_ENV === 'production'`. Outside production the demo records show, so the homepage can be built and reviewed.
3. **The dashboard** marks every `isDemo` record with a «بيانات تجريبية» badge.

The flag answers the case the guard cannot: a development database copied to a production server.

---

## D3 — The Figma corrections (owner-approved as defects)

Each is **PENDING FIGMA BACK-SYNC**.

| # | Figma | Correction | Governing rule |
| --- | --- | --- | --- |
| 1 | Strip colours `#070c08`, `#ffb800`, `#8a948d`, `rgba(255,184,0,.1)` — no tokens | Strip on the **black register** (`--color-section-black-*`). No amber: no token exists, and `gold.500` is the Medal Gold semantic, not a sponsor accent | CLAUDE.md §16; ADR-0059 D2; `Section` `REGISTER_CLASSES` |
| 2 | Text at 9, 10, 11, 12px (strip, stats labels, tier badge, sector, banner eyebrow) | Nothing below `text-body-sm` (13px on a phone) | Chapter 4 §4.10; page-building-guide §2; ADR-0074 D4. ADR-0041's two exceptions are non-transferable and not used |
| 3 | No pause control on the strip | A visible, keyboard-operable pause/play button whenever the strip moves | WCAG 2.2.2; `CMP-CAROUSEL-001`; ADR-0043 |
| 4 | Two different strategic partners on one page | One source: the banner is computed (D5.1); tier labels come from data | ADR-0077 D2 as amended |
| 5 | Three sponsor counts (8, 10, 5) | Stats computed from data, shown only when meaningful | ADR-0077 D6 |
| 6 | Cards inside a bordered card (`Sponsor Strip` → `Sponsor Cards`) | One level: the grid sits directly in the section | `02-Design-Principles.md` PR-001 Clarity Over Decoration; CLAUDE.md §15. No chapter names nested cards explicitly — this is the nearest written rule |
| 7 | Sponsors container 1360 (AR) | **1312** at 1440, via `Section`'s `CONTAINER` | Chapter 5 §5.2–5.3 |
| 8 | Membership emblems `object-fit: cover`; banner logo cropped to a circle | `contain`, never cropped, in a plate | Chapter 8 §M.9 |
| 9 | Carousel dots on rows that already fit | No dots, no carousel; the row follows `row-capacity.ts`'s pattern | ADR-0077 D4; `02-Design-Principles.md` §Anti-Patterns |
| 10 | Banner ground: industrial photograph | **Removed.** Black register plus the identity lines | Page rule 2 category A |

### D3.4 — Rule 6's check, amended

An image whose element, or nearest ancestor with a `lang` attribute, declares a language is checked against **that** language instead of the page's. The rule's text is unchanged — "each field in its own language; a proper noun as its record writes it". Only the automated check learns to read `lang`.

**Condition of the change (owner):** a negative test proves the amended check still fails a non-Arabic alt on the Arabic page that carries no `lang`, or carries a `lang` that does not match its text. The check is not changed without that test.

---

## D4 — Single-language organisation names

A new embedded sub-schema, `OrganizationName { ar?: string; en?: string }`, used by the three collections:

- each present value is trimmed, non-empty and at most 150 characters;
- **at least one** of the two is present;
- `LocalizedText` is not changed.

**Display rule, shared by the site and the dashboard** (one function in `packages/content/sponsors`, ADR-0083's pattern):

- The page's language if present; otherwise the other one.
- The element gets `lang` of **the field that supplied the text** — never a guess from the characters.
- A name in the other language is isolated: `<bdi lang="en">` on the Arabic page, `<bdi lang="ar">` on the English page.
- Never translated, never transliterated.
- **Dashboard:** search matches both fields; lists are ordered by `displayOrder`, never alphabetically, so a mixed-language list has one order.

---

## D5 — Sections, order and compositions

Homepage order, from `02-Homepage-Specification.md` §5, with only the built sections present:

| # | Section | Composition (page rule 5) | Register |
| --- | --- | --- | --- |
| — | Hero | hero | — |
| — | **Sponsor strip** (ADR-0077 D5, ADR-0078 D3) | band | black |
| 9 | **Sponsors** | banner + card grid | neutral; the banner block is black |
| 9 | **Partners** | coloured register | **green** (decision J) |
| 11 | **Memberships** | card grid | neutral, with seam lines at its boundary |

Green for Partners gives each boundary a separator (rule 3: a register change) and breaks the run of two neutral grids (rule 5) without adding a photograph.

**Empty shelves.** Each is absent, not empty, when nothing qualifies:

| Component | Hidden when |
| --- | --- |
| Strip | `siteSettings.sponsorStrip.isVisible` is false, or no sponsorship is visible, in its window and not cancelled |
| Sponsors section | no sponsorship qualifies |
| Banner | never alone: it exists whenever the section does (D5.1) |
| A stat | its figure is incomplete or below 1 |
| Partners · Memberships | no visible record |

**The partnership CTA** has no destination page. It is shown only when the section's `ctaUrl` is set. The seed leaves it empty.

### D5.1 — The banner shows the highest tier present (owner, 2026-09-17)

Replaces ADR-0077 D2's "the banner is filled by a strategic sponsorship".

1. Take every **qualifying** sponsorship: `isVisible`, not `Cancelled`, inside its window in `Asia/Dubai`, and (in production) not `isDemo`.
2. The banner tier is the **highest tier among them**: `Strategic` › `Official` › `Supporting`. It is never pinned to `Strategic`.
3. Among sponsorships of that tier, `pageSections.configuration.bannerSponsorshipId` wins when it names one of them (ADR-0077's admin choice, kept); otherwise the lowest `displayOrder`.
4. The banner's sponsorship is **not repeated** in the grid below it.

**Tests required:** an `Official` sponsorship alone fills the banner; adding a qualifying `Strategic` one moves the banner to it and returns the `Official` one to the grid; ending the `Strategic` one's window returns the banner to the `Official` one.

---

## D6 — The banner, improved

```
┌─ black register · identity lines at the inline-end corner ──────────────────────────────┐
│  ┌────────┐   الراعي الرسمي · <bdi lang="en">Official Sponsor</bdi>  (tier label, body-sm) │
│  │ [logo] │   <bdi lang="en">Ultimate Power Solution</bdi>          (H3)                  │
│  │ plate  │   scopeLabel when present                              (body)                │
│  └────────┘   زيارة الموقع ↗ (يفتح في تبويب جديد)                    (link, 44px target)   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
          phone: the plate above the text, both at inline-start; nothing below 13px
```

| Decision | Why | Source |
| --- | --- | --- |
| Black register instead of a photo | The photograph is not athletics; the register is an official brand ground | Rule 2 A; ADR-0059 D2 |
| Identity lines | The section needs an identity element at its scale | Page rule 1; `identity-lines` guard |
| Logo in a plate, `contain`, no circle crop | The mark is a third party's; its JPEG's white ground must read as a plate, not a hole | §M.9; ADR-0037 Risks |
| Plate content ≤ 128 CSS px (desktop), 96 (phone) | 284px source ⇒ ≥ 2.2× at 128. Wider than 142 is under 2× | Measured source |
| One tier label, from data | Figma stacks three labels for one fact; the tier is whatever D5.1 chose | ADR-0077 Risk 3; PR-001 |
| No VIP badge on the banner | VIP (`isFeatured`) and the banner are two emphases | ADR-0077 Risk 3 |
| Name at H3 | 28px is not in the scale | Chapter 4 type scale; CLAUDE.md §8 |
| One link, the website | The card's single action | `02-Homepage-Specification.md` §15; WCAG 2.4.4 |
| Logical properties, logo first in reading order | Arabic: logo on the right; English: on the left | CLAUDE.md §9 |

### D6.1 — `--color-logo-plate`, added to the design system

| Mode | Value | Reason |
| --- | --- | --- |
| light · dark · high contrast | `{color.white}` (`#FFFFFF`) | A third-party mark supplied on an opaque white ground must sit on the same white, in every mode; any other ground shows the file's edge as a box |

**Measured:**

- **the mark on the plate:** blue 6.27–6.56:1, red 4.06:1 — every part clears 3:1 (WCAG 1.4.11);
- **the plate on its surroundings:** 21:1 on `--color-section-black-surface` (black) in every mode. On a light neutral ground the plate is nearly invisible (white on `neutral-warm.50`), so any plate on a neutral ground carries `--color-border-strong` (4.48:1 on base, WCAG 1.4.11) — the edge is the boundary, not the fill.

A pairing record in `packages/design-tokens/tokens/semantic/pairings.json` states these partners and floors, so the three-list guard measures them in every mode.

---

## D7 — The strip's motion

- **CSS, not Motion.** A continuous translate loop is one `@keyframes` on `transform` with `animation-play-state`. A written deviation from ADR-0076 D4's table, which sends "pausing and resuming" a timeline to the library: a loop with one state flag needs neither a timeline nor a library.
- **Travel follows the reading direction** (ADR-0077 D5).
- **Still while the row holds its items (decision A).** Capacity is computed from the item count per breakpoint (`packages/content/sponsors/strip.ts`, `row-capacity.ts`'s pattern), so no JavaScript measures anything and nothing shifts. A still strip has no pause button, because nothing moves.
- **Moves only after hydration.** Without JavaScript the pause button cannot work, and moving content without a working pause fails WCAG 2.2.2. The server renders a still, complete, scrollable row; the button and the loop arrive together.
- **`prefers-reduced-motion: reduce`:** no loop and no pause button (Chapter 5 §5.8).
- **Duplicated items for the seamless loop are `aria-hidden` and `inert`.**
- **`transform` only, no `opacity` inside `<main>`** — page-building-guide §3.
- **"What they sponsor" mode on a phone** falls back to "logo + name" (ADR-0077 D5 item 7).

---

## D8 — As built (2026-09-17)

What the build settled that D1–D7 did not say, and where it departs from them. **Every row marked *Departure* is PENDING OWNER CONFIRMATION** (a departure from this ADR after acceptance needs the owner's approval), and every new visual state is **PENDING FIGMA BACK-SYNC**.

| # | Built | Kind | Why | Evidence |
| --- | --- | --- | --- | --- |
| 1 | The identity lines of the Sponsors section (seam lines below it), the Memberships section (seam lines at its boundary) and the banner (`PhotoLines` at its inline-end corner) are drawn **from `lg` (1024px) only** | *Departure* from D5/D6 "identity lines" below `lg` | At `md` the section heading spans the line and the strokes came 0–28px from the text, under IL-5's 32px clearance; the banner's text column has no reserved corner below `lg` (`lg:pe-40`) | `page-rules.spec.ts` rules 1 and 3 on `/` (24 checks, both languages, three widths, three colour modes), with `home-sponsors-title` and `home-memberships-title` listed PENDING for rule 1 below 1024; clearance measured at ≥ 40px where the strokes are drawn. **Gap:** `identity-lines.spec.ts` covers the three internal pages only, not `/`, so the 32px clearance on the homepage is measured but not yet guarded by that spec |
| 2 | The loop's duration is **seconds per item**: slow 6 · medium 4.5 · fast 3, plus 2 in the scope mode (`STRIP_SECONDS_PER_ITEM`), set as `--strip-duration` | *Departure*: D7 named no unit, and no motion token describes a continuous loop | `--motion-duration-ambient` is reserved for one element (ADR-0069 D9); a per-item reading time keeps the speed the same for 3 items or 12 | `strip.spec.ts`; `motion.css` declares the variable |
| 3 | The logo plate stands **bare only on the black register** (strip, banner). In a card it has no edge of its own; the card's `--color-border-strong` edge bounds it | *Departure* from D6.1's "any plate on a neutral ground carries `--color-border-strong`" | A bordered plate inside a bordered card is a box in a box (D3 #6); in high contrast the plate on the green register measured 1:1, so the pairing record lists `--color-section-black-surface` only | `pairings.json` `--color-logo-plate`; `CARD` in `surface.ts` |
| 4 | The strip's item widths: logo 112 · logo and name 224 · with scope 320 · pinned 360 CSS px, gap 32; content widths per breakpoint from Chapter 5 §5.2's margins. The row stands still from the first breakpoint that holds every item; a pinned sponsor alone always stands still | Settles D7 "still while the row holds its items" | A count and a fixed item width make the promise measurable without script (no layout shift) | `stripRowFrom`; the dashboard preview prints the same width |
| 5 | Dashboard: five screens under "Homepage" in the page's order (hero, strip, sponsors, partners, memberships). Each opens only with every grant its Save uses; saving is publishing; demo records carry a "Demo data" badge and `isDemo` cannot be written | Settles "managed from the dashboard" | ADR-0084's save pattern and CLAUDE.md §31 | `navigation.spec.ts`; `sponsor-relations` editor specs |
| 6 | Copy not in Figma: the strip's label, pause and play; "Visit the {name} website" and its new-tab notice; the stats' label; the Partners title; every dashboard label | New copy | Accessible names and the dashboard have no Figma frame | `apps/web/messages`, `apps/dashboard/messages` (`HomeSponsors`, `SponsorRelations`) |

### D8 — Owner's resolutions (2026-09-18)

The three departures above were marked PENDING OWNER CONFIRMATION. Two are
settled and built; the third is deferred with its reason.

**#1 — The identity lines from `lg` on the homepage: CONFIRMED, and the gap
closed.** The departure stands: below `lg` the sponsors' and memberships'
headings span the line, and the strokes measured 0–28px from them, under
IL-5's 32px. `lg` is Chapter 5 §5.1's breakpoint, not a new number.

The row's own **Gap** — "`identity-lines.spec.ts` covers the three internal
pages only, not `/`" — is closed. That spec now measures `/` as well:

- `ALL_ROUTES` gains `/`; the portrait-hero case runs only where there is a
  portrait hero (`PORTRAIT_HERO_ROUTES`), since the homepage's hero is a
  different composition.
- The departure is asserted **in both directions**, so neither it nor its
  undoing is silent: below 1024 the page draws no identity-line set at all,
  and from 1024 it draws at least one. That second assertion earned itself
  immediately — it caught the run measuring an error page, where the
  below-`lg` cases had "passed" on a page with no strokes because it had no
  content either.
- `PhotoLines` now marks itself `data-photo-lines`, and the spec counts and
  measures by that mark. The banner's set was drawn with no `SlantedPhoto`
  wrapper around it, so the previous selector
  (`[data-slanted-photo] [data-il-stroke]`) never saw it — on any page.
- The spec's animation filter admitted any `endTime` that was a `number`.
  `Infinity` is one: the strip's loop would have made the scrub endless
  rather than failed. It is `Number.isFinite` now, which excludes both that
  and the scroll-driven parallax's CSS percentage. Animations that do not end
  are left running, as the percentage case always was — pausing the parallax
  moves the portrait the hero case measures against.

**#3 — The plate's edge: CONFIRMED with an explicit edge in high contrast and
forced-colors, and the green register now recorded and measured.** The
departure's reasoning holds in light and dark, where the plate's own
`#FFFFFF` fill is its boundary on both registers. It does not hold in the
high-contrast list, where `--color-section-green-surface` is `#FFFFFF`: the
plate, its card and the band become one white field and the fill measures
1:1. Leaving the green register out of the pairing record recorded that as a
fact rather than fixing it.

Built: every plate draws `--color-border-strong` (`#000000` in that list,
21:1 against white on either side) at `--border-width-default` (2px there),
**in the high-contrast list and in `forced-colors: active` only**. Light and
dark draw nothing — an edge there is a box inside the card's box (D3 #6). A
pseudo-element at `inset: 0` with an inherited radius, for the reason
ADR-0075 M0-A gives: a border changes the element's size in one list while
the geometry guards measure another. The black register stays `#000000` in
high contrast and keeps its fill boundary; the edge is drawn on its plates
too, where it lands on a ground already its own colour.

**Why the black register measures `#4A4942` in dark, and not black.** Asked
when these numbers were read back, and it is deliberate: `colors.dark.json`
records it against ADR-0059 — "the one register that differs by theme. Pure
black against this theme's `#131210` page measures 1.12:1, i.e. no section
boundary at all. `neutral-warm.700` measures 2.07 against the page while
keeping both text tiers over AA (9.04 and 4.75)." So it is a per-theme value
chosen so the band still reads as a band, not an elevation, an overlay or a
drifted token. The plate's 9.04:1 measured on the rendered page is the same
9.04 that comment records, arrived at independently.

`pairings.json` now lists both registers for `--color-logo-plate`, with an
exemption stating why one floor cannot express the boundary, and the four
measurements that exemption stands on are made in the logo-plate part of
`token-lists-contract.spec.ts`.

**#2 — The loop's duration: DEFERRED, and not touched here.** The owner's
decision is that the strip moves at a constant speed in pixels per second,
with the duration computed from the track's width — which removes the idea
of "seconds per item" that this row records, rather than adjusting it. That
is a redesign of the strip's motion, not a correction to this value, so it is
settled together with the rest of that redesign and this row stands until
then. `STRIP_SECONDS_PER_ITEM` and `--strip-duration` are unchanged by this
batch.

**Verification, and what is not yet verified.** The token and component
measurements above are green. The homepage cases of `identity-lines.spec.ts`
are **not yet verified in a browser**: the local web dev server answers 500
on every route (its render worker exits repeatedly, with the machine at
0.7 GB free of 7.9 GB), and the plan for this batch puts restarting the
servers out of scope. The three internal pages' cases pass. The homepage
cases, the high-contrast screenshots of the plate edge, and `forced-colors`
are listed under **PENDING FIGMA BACK-SYNC** below and are the first thing to
run once that server is restarted.

---

**Measured, not a defect:** axe reports one *incomplete* on the strip and no violation. Under D7 it was a strip item passing beneath the pause control mid-travel; under D9 the control is in the anchor and never over the track, and the one remaining incomplete is the pause button's own `aria-hidden` glyph — "Element content contains only non-text characters", which is axe declining to measure a decorative glyph beside a real text label. The strip's text and surface are a pairing record measured in every mode.

---

## D9 — The strip's motion and its anchor, rebuilt (2026-09-18)

Settles D8 #2, and replaces D7's decision A and D8 #4's "still while the row
holds its items". Every visual decision below names the chapter it comes from;
where a chapter says nothing, the derivation from already-approved numbers is
shown rather than a number being chosen.

### D9.1 — One continuous loop, at every count and every width

**Built:** the row always moves. The `data-row-from` state — a row that stands
still from the first breakpoint whose content width holds every item — is
removed, together with `stripRowFrom`, `STRIP_BREAKPOINTS`, the `CONTENT_WIDTH`
capacity table and `rowWidth`. Nothing replaces them; no code is left behind.

**Why.** Two states meant two sets of rules for one component, and which one a
visitor saw depended on how many sponsors the federation happened to have that
month — a strip that moved with five and stood still with four, at the same
width, on the same page. The rhythm of a page is not a function of a record
count. One behaviour is also the only one that can be measured and guarded
once instead of per breakpoint: the removed CSS was five media queries of
near-identical rules.

### D9.2 — A rate in pixels per second, not seconds per item

**Built:** `STRIP_PIXELS_PER_SECOND = { slow: 42, medium: 57, fast: 85 }`, one
named constant in `@uaeaf/content/sponsors`. The duration is computed, never
authored: `duration = copyWidth / rate`.

**Why a rate and not a duration.** Chapter 5 §5.6's motion tokens are all
durations for a discrete transition — 100ms on a hover, 220ms on a modal,
1200ms for ambient background motion. None of them describes a loop that never
ends, which is what D8 #2 recorded and why it set `--strip-duration` itself.
A duration cannot be the unit here: for the same duration a longer row must
move faster, so the strip's visible speed changed with the number of sponsors
and with the display mode. A rate is the only unit under which the thing a
visitor actually perceives stays fixed.

**Where the three numbers come from.** They are D8 #2's own approved seconds,
re-expressed — not new values. D8 #4 fixes an item's track share at
`STRIP_ITEM_MIN[mode] + STRIP_GAP`; for the default mode (`logoName`, the value
in `STRIP_DEFAULTS`) that is 224 + 32 = 256 CSS px. Dividing D8 #2's
seconds-per-item into it:

| Speed | D8 #2 seconds per item | 256 px / seconds | Built |
| --- | --- | --- | --- |
| slow | 6 | 42.67 | **42 px/s** |
| medium | 4.5 | 56.89 | **57 px/s** |
| fast | 3 | 85.33 | **85 px/s** |

So a strip in its default mode moves at the speed it moved at before this
change; what changes is that the other two modes now move at that speed too.

**`SCOPE_EXTRA_SECONDS` is removed, not carried over.** D8 #2 added 2s per item
in `logoNameScope` because a scope line takes longer to read. Under a rate that
allowance is automatic and almost exactly the same size: a scope item is
320 + 32 = 352 px, which at 57 px/s takes 6.18s against the old model's 6.5s —
a 5% difference, for a special case that no longer has to exist. The old
model's real defect shows in the other direction: a `logo` item (112 + 32 =
144 px) also got 4.5s, so it crossed at 32 px/s — the same strip moving at half
the speed, on the same page, because the editor turned the names off.

**`--motion-duration-ambient` is not touched** (ADR-0069 D9 reserves it for one
element).

### D9.3 — A seam that cannot show

**Built:** the list is repeated `copies` times, and one cycle translates the
track by exactly one copy's width, so the frame after the last is the first.
`copies = max(2, ceil(1312 / copyWidth) + 1)`, where 1312 is the widest content
width in Chapter 5 §5.2 (the `2xl` container).

**Why that formula.** The seam shows when the track is not wider than the
viewport plus the distance travelled. One copy is the distance travelled, so
the track must exceed the widest viewport by one copy. Counted per breakpoint:

| Sponsors (default mode) | Copy width | Copies | Cycle |
| --- | --- | --- | --- |
| 1 | 256 px | 7 | 4.5s |
| 3 | 768 px | 3 | 13.5s |
| 5 | 1280 px | 3 | 22.5s |
| 10 | 2560 px | 2 | 44.9s |

The rate is 57 px/s in every row of that table. The count is computed once on
the server from numbers D8 #4 already fixed, so nothing is measured in the
browser and nothing shifts (Chapter 5 §5.9, ADR-0009).

### D9.4 — Direction from one variable

**Built:** `--strip-direction: -1` in LTR and `1` in RTL, and a single
`@keyframes` whose `to` is
`translateX(calc(var(--strip-copy) * var(--strip-direction)))`. The two
mirrored keyframe blocks are removed.

**Why.** ADR-0076 already rules that RTL uses physical transforms and is never
mirrored wholesale; one signed variable is that rule expressed once rather than
a second copy of the animation that can drift from the first.

**The documented exception.** Chapter 5 and this project's CSS use logical
properties. `translateX` is physical and is used here, **on the motion axis
only**: a transform has no logical form, the axis of travel is the inline axis
in both directions, and the sign is what carries the direction. Nothing else in
the strip uses a physical property.

### D9.5 — The anchor

**Built:** a fixed block at the start of the line holding the strip's title, a
divider, and the pause button; the logos travel through the remaining track.

- **The title** is `HomeSponsors.strip.label` — "رعاة الاتحاد" /
  "Federation sponsors" — which D8 #6 already approved. It was the `aside`'s
  `aria-label`; it is now printed, and the `aside` points at it with
  `aria-labelledby`, so the name is announced once rather than twice.
- **The divider** closes the anchor, at its inline end, so the order along the
  line is title, button, rule, track — the rule separates the block that stays
  from the row that travels, which is the distinction it is there to draw. It
  is the anchor's own `border-inline-end` at `--border-width-default` in
  `--color-section-black-border`, the register's edge token, and it is drawn
  only from `md`, where the anchor is beside the track rather than above it.
  It is deliberately **not** an identity stroke: IL-5 requires 32px between a
  stroke and any text or image, which a 40px-tall row cannot give, and
  ADR-0073 D2 makes the strokes a section-scale element. The strip is an
  `aside`, not a section.
- **The pause button** sits inside the anchor and is always visible. Its
  accessible name, its `aria-pressed` and its `aria-hidden` glyph are unchanged.

**Below `md` the anchor becomes a line above the strip.** Chapter 5 §5.2's
content widths decide it: 704px at `md` leaves about 400px of track once the
anchor's title, divider and button are placed, and 592px at `sm` leaves under
300px — less than one item in the default mode (256px). `md` is the first width
at which an inline anchor leaves a track worth moving.

**"No empty shelf" holds:** the anchor is inside the strip's own `aside`, so a
strip with nothing to show renders neither. The anchor never stands alone.

**The pinned sponsor moves from the centre of the row to just after the
anchor.** D7 put it at the centre because the row had no fixed start; with an
anchor there is one, and the sponsor the section also banners is the first
thing after the strip's own title — the reading order the emphasis already
claims. It stays outside the track and still, as D7 requires; only where the
still block sits has changed.

### D9.6 — The track's edges, the items, and their states

- **Fade** by `mask-image`, a symmetric `linear-gradient` with `--space-8`
  (32px) of transparency at each end. Symmetric on purpose: an identical mask
  in both directions cannot be wrong in RTL, which a one-sided gradient can. A
  fixed colour gradient is also wrong on principle here — it would have to know
  the register's colour in three themes.
- **Logo colour is never touched.** No grayscale and no filter, in any state
  (Chapter 8 §M.9, already D6's rule).
- **One height for every item**, set by the plate (`h-10`, 40px) and its fixed
  inner padding, never by the file's own frame — so a wide mark and a tall one
  occupy the same row height.
- **Hover and focus:** the item's ground becomes
  `--color-section-black-divider` and the plate takes `--elevation-card-hover`.
  **No scale**, which would change the item's width and break the row's rhythm
  mid-travel. The ground token is the one the pause button in this same strip
  already uses for its hover, so the strip has one hover language. There is no
  spacing token for a 2–3px lift, and inventing one would be an arbitrary value
  (§16); elevation is this system's own word for raising an object (ADR-0052).
- **Every logo is a link** to `sponsor.website` where there is one, reusing the
  banner's copy (`sponsors.visitWebsite`, `sponsors.opensInNewTab`) and its
  `target`/`rel`. `TOUCH_TARGET` brings the 40px plate to a 44px target and
  `FOCUS` draws the ring. A sponsor with no website is not a link.
- **Pausing** on hover and `:focus-within` holds the loop without changing the
  button's `aria-pressed`; the button's own state is held until it is pressed
  again. Unchanged from D7.
- **`prefers-reduced-motion: reduce`:** no animation, the row static and
  scrollable, the button not rendered. Unchanged from D7.

### D9.7 — What is not in this batch

The dashboard's strip editor, the strip's content and its data source, the
sponsors section, the banner, partners and memberships are untouched. The three
speeds remain the editor's choice (ADR-0077 D5 #5); only the unit behind them
changed, and `SponsorStripSettingsPublic` is unchanged.

---

## Risks

1. **Strip and Sponsors section adjacent on the homepage** until sections 2–8 are built (ADR-0043 Risk 3). Mitigated by the differences ADR-0043 requires: compact and moving vs detailed and static.
2. **A single raster logo with a white ground.** Nothing larger than 142 CSS px until the federation supplies a vector or transparent file and a dark-ground version.
3. **`targetId` optional** means "who sponsors championship X" is unanswerable until championships exist.
4. **The banner can show a `Supporting` sponsor** when it is the only tier present. Accepted by D5.1: a section that exists always has its highest sponsor emphasised.

---

## Consequences

- ADR-0077 → Accepted with D1's amendments and D5.1's banner rule. ADR-0043's open items point here and to ADR-0077.
- `07-Mongoose-Schema-Specification.md` Domain 9 gains the fields of D1, each marked with this ADR.
- `page-building-guide.md`: the seed rule gains D2's exception; rule 6's check gains D3.4.
- `02-Homepage-Specification.md` §15: stats computed, banner from D5.1, no photograph.
- `PAGE_SECTION_TYPES` gains `MEMBERSHIPS` (ADR-0077 Risk 4).
- `docs/content/homepage-client-content.md`: contract dates, a vector or transparent logo with a dark-ground version, and the real partner and membership lists before launch.
