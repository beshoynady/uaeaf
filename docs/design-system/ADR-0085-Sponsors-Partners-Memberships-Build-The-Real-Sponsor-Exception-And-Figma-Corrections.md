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

**Measured, not a defect:** axe reports a strip item's colour contrast as *incomplete* while the item is partly under the pause control mid-travel; paused or still, no violation. The strip's text and surface are a pairing record measured in every mode.

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
