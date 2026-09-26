# ADR-0075 — The Strategic Plan Page: Its Domain, Seams Visible in Every Mode, Seam Lines Below a Coloured Band, and the Rules Calibrated Again

**Status:** In progress — Task Zero decisions recorded before their implementation (2026-09-15); the page sections are appended as they are built.
**Date:** 2026-09-15
**Authority:**
- The owner's brief «بناء صفحة الخطة الاستراتيجية كاملة» (§١–§١٦), and the mid-batch correction «بنية البيانات والتحكم من الداشبورد» (a full domain, a dashboard screen, the documents section removed, five days).
- The brief's §٣ approvals: group B option (a); rule 2's scope; the hero hierarchy; the goal-card edges in light; git forbidden for every subagent; `sizes` set from the crop.
- The brief's §٤: an amended reading of rule 3 is authorised, recorded here before the change.

**Amends:** `page-building-guide.md` §٤ (seam lines after a coloured band), §٦ (rules evolved), §٨ rule 3 (high contrast) · ADR-0073 rule 2 (scope for portraits, maps and documents) · ADR-0072 D2 (group B's red stroke), D4 (`display-2xl` no longer printed), the hero title size · ADR-0074 D3 (built), D8 (the three rule 1 findings resolved) · the `strategic-plans-page` API module (completed; old fields removed, no rows to migrate).

**Does not amend:** any contrast floor · the RBAC system (two catalogue rows are added for this resource) · any other domain module · the header, the footer and the shared layout · Figma (the back-sync list is at the end).

**Companions:** `docs/engineering/plans/strategic-plan-page-plan.md` (the plan), `docs/engineering/how-strategic-plan-page-works.md` (the explainer, written with the page).

**Amended by:** ADR-0102 §D1 — the *dashboard* editor's layout only: the status, review, versions and SEO panels leave the page's vertical flow and become sibling panels under one tablist. The composition lock on the public page, and the ordering prohibition, are untouched.

---

## M0-A — Rule 3 in high contrast: a register change counts only with a drawn edge

**Measured.** In the high-contrast list every coloured register surface and every item surface is `#FFFFFF`, as the page grounds are (ADR-0074 D2, D8). A seam whose only separator is "the register changes" therefore has no separator in that mode. On Vision & Mission the seam between the goals and the values was visible there only by the cards' black edges; on the new page there are seven seams and four of them rest on a register change.

**The amended reading of rule 3 (recorded before the change):**

| | Text |
| --- | --- |
| **Old** | A register change between neutral and coloured is a separator. |
| **New** | A register change is a separator in light and dark, where the two grounds measure at least 1.4:1 apart (ADR-0059 §D2's floor for "departs from the page"). In high contrast it is a separator only because **every coloured band draws its top and bottom edge there**: a `--border-width-default` (2px in that list) line in `--color-border-strong` (`#000000`), 21:1 against the white grounds on both sides. The edge is drawn by one stylesheet rule keyed on `data-register`, so it holds for every coloured band on the site, present and future, and never in light or dark. |
| **Why** | The brief's §٤: the seam must be visible in the three modes without exception, on every section composition. A drawn edge that appears in high contrast only is the treatment the brief names; it changes no colour in light or dark, adds no layout (an inset pseudo-element, not a border), and uses tokens the high-contrast list already defines for exactly this purpose (Chapter 7 §7.3: elevation is carried on solid borders there). |
| **Scope** | Every `section[data-register]` that is not neutral: the identity hero, the listing hero on a register, the values bands, the new page's two green bands. Item cards keep their own black edge (ADR-0072 D1). |
| **Guard** | `page-rules.spec.ts` rule 3 now runs in light, dark and high contrast and measures, per seam: the hero before it, or visible seam strokes, or two photographs meeting, or the two grounds at least 1.4:1 apart, or an edge at least 3:1 against both grounds. A register change that draws no edge fails in high contrast. |

## M0-B — Seam lines below the seam, for a section after a coloured band

**Measured (ADR-0074 D8).** `SeamLines` centres its group on the seam, so half of it stands on the previous section. After a green band that half measures 1.95:1 (green) and 1.60:1 (red) — under the 3:1 floor for a shape — which left three rule 1 findings open (the President's message and call, the board's list).

**Decision.** `SeamLines` takes `placement`: `centered` (the existing drawing) or `below`, where the group's top edge is the seam and the whole group stands in the later section's top padding, on the page's own ground. Nothing of it touches the band.

| Stroke on the page ground | Light (base / sunken) | Dark (base / sunken) | High contrast |
| --- | --- | --- | --- |
| Red `--color-brand-secondary` | 5.63 / 5.35 | 3.18 / 3.57 | 5.88 |
| Green `--color-brand-primary` | 4.60 / 4.37 | 3.89 / 4.37 | 4.81 |
| Black `--logo-ink` (white on dark) | 20.09 / 19.09 | 17.91 / 20.09 | 21 |

Computed from the token lists; measured again in the browser by the guard. Every value clears 3:1 in every mode.

**Why not a recoloured crossing set.** The same strokes measured against the four item surfaces: light 3.02–4.49 (clears), dark **2.20–3.75** (three of four under 3:1 for red, two for green). A set that crosses a band would need a per-band ink, a second identity colouring, and would still fail on the dark palette surfaces. Standing below the seam needs no new colour and holds on every ground the strokes can stand on.

**Rejected (the brief's other options):** a monochrome set in the band's text colour — abandons the red/green identity on the very sections that need identity; a two-tone set that changes colour at the seam — a stroke the logo never draws.

**Guard.** For every `[data-seam-lines][data-placement="below"]`: each sampled point of every stroke outline lies at or below the section's top edge, and each stroke's fill measures at least 3:1 against the section's computed background, in the three modes. IL-5 (32px from text) is measured as before by `identity-lines.spec.ts`, extended for sets drawn from a width: it counts, scrolls to and waits on displayed sets and reveal blocks only. A set that is not displayed draws nothing, cannot enter the view and would otherwise hang the reveal loop (seen at 360 on the plan, where the pillars' set is hidden). The 32px threshold is unchanged; what goes unmeasured below the width is exactly what `PENDING` records there.

**Applied to:** the President's message (after the green portrait hero), the President's call to action (neutral, no photograph, after the green values), the board's list (after the green listing hero), and on the new page the pillars (after the green timeline band) and, where a later section has no photograph, after the green execution band. The three findings this closed leave `PENDING` in `page-rules.spec.ts`; what IL-5 later bounded by width is recorded under "M0 as measured".

## M0-C — Group B's short red stroke: option (a)

Owner decision (brief §٣): B's red stroke takes A's red length, 40.8 ribbon units instead of 23.4. The group keeps the logo's order and spacing (IL-2); only the last stroke's length changes. Expected at 390: about 48px long and about 1.9px thick, measured after the change in both languages; the hero's portrait inset grows with B's width and the guard re-measures IL-5 on the two built pages.

## The hero hierarchy: the title rises, the ordinals fall

Owner decision (brief §٣): "the title is the message; the ordinal is punctuation". The identity hero's `h1` takes `text-display-xl` (Chapter 4 §4.4: Display XL, 64/40, "Large Headings") and the statements' ordinals take `text-display-l` (56/36). `display-2xl` (ADR-0072 D4) stays in the scale and is no longer printed on any page. Applied to the two built pages and the new one.

## Rule 2's scope (brief §٣)

Portraits, maps and documents are outside rule 2: they are not expected to show athletics, and rule 6 alone governs their alternative text. Recorded in ADR-0073's rule 2 item.

## The goal cards' edges in light (1.25–1.52): deliberate, unchanged

ADR-0072 D1: "Light draws no edge" — the card is distinguished by its ground (the four surfaces are 9.00 ΔE apart), its number and its title, and it is not a control, so WCAG 1.4.11's 3:1 boundary does not apply to it. Dark got a 200-step edge (ADR-0074 D2) because the owner set 3:1 as a condition for dark on the green register. Light was not an oversight.

---

## M0 as measured (after the change)

- **Group B's red stroke at 390** (both languages, seams and the English hero): 48.23px long, 1.88px thick — was 27.7px and 1.08px (ADR-0074 D3). In the Arabic hero with the portrait the lines shrink to keep the portrait's floor, and B's red measures 46.04px / 1.79px there.
- **Rule 3 in the three lists**, `page-rules.spec.ts`, 1440, both languages: Vision & Mission, the President's Message and the board page, 28 checks each, all green — every seam marked, and every set of strokes placed below a seam wholly on its section at 3:1 or more on the rendered ground.
- **IL-5 after the change.** Vision & Mission: 16/16 on the working viewports. The President's Message: 12/16 at first. The four misses were geometry, not the variant: Display XL's 40px title reached 16.8px from group A beside the Arabic title at 360, and the strokes placed below the seam reached 0–16.5px from the message's body and the call's heading below `lg`, where those lines span the frame. Two consequences, both recorded:
  - the hero title is H1 on a phone and Display XL from `md`, and the ordinals H1 and Display L likewise, so the title is never outranked at any width;
  - `SeamLines` takes `from="lg"`: the President's message and its call draw the strokes from `lg`, where the two-column layout and the start-aligned call leave the far corner empty; below `lg` the two findings stay recorded in `PENDING`, now bounded by width (`{ reason, below: 1024 }`), so the guard fails the day they are fixed there. The board's list draws them at every width: its heading is short.
  - The plan's pillars (measured on the built page): the strokes below the seam reached 11px from «محاورنا الاستراتيجية» and 3.7px from "Our Strategic Pillars" at 360, where the heading spans the line. `SeamLines` takes `from="md"` too, and the pillars draw the strokes from `md`, where the heading leaves the far corner 32px clear. Below `md` the section has no identity element; `PENDING` records it bounded by width (`{ reason, below: 768 }`).
- **The goal cards' edges in light:** unchanged, by decision (above).

## Open for the owner: the pillars below `md`

Brief §١٢ item ٤ (a rule structurally impossible as composed). Rule 1 wants a section-scale identity element in every section; on a phone the pillars have none, because the heading fills the corner the strokes need and the section has no photograph. Options:

- **(a) Keep as built:** strokes from `md`, the gap recorded in `PENDING` below 768. No new pattern.
- **(b) Shorten the heading on a phone** («المحاور» / "Pillars"): content change, the client's text.
- **(c) A photograph in the pillars on a phone:** a sixth picture slot, a record field and a client image; it also changes rule 5's sequence at that width.

Recommended: (a) until the client's photographs arrive, then decide (c) against the real pictures. Nothing else on the page depends on the answer.

**Owner decision (2026-09-16): (a), as built.** The strokes stay from `md`; the gap below 768 stays recorded in `PENDING`, to be reconsidered when the client's photographs arrive.

## The domain, as built (owner correction 2026-09-15)

**Where.** `api/src/modules/federation-governance/strategic-plans-page/` — the module the FigJam physical model already gave this page, completed rather than duplicated: a second collection for one page is the duplicate representation the operating model §5 forbids, and the owner's "one collection for this domain" names it. It had no rows, no fixture and no tests, so the seven fields the design has no use for (`periodStart`, `periodEnd`, `foundationPillars`, `strategicAxes`, `impactMetrics`, `documentId`, `documentVersion`) were removed with nothing to migrate. `entityType` stays `strategicPlansPage`.

**The schema** (`schemas/strategic-plans-page.schema.ts`, `schemas/plan-list-items.schema.ts`):

| Field | Type | Why it is shaped so |
| --- | --- | --- |
| `heroImageId · heroTitle · heroSubtitle` | `HeroPageSchema` | the trio every page wrapper carries |
| `federationId` | ObjectId ref Federation, required | the row's identity; never editable |
| `introHeading · introText` | `LocalizedText` required | the overview, «خارطة طريق نحو المستقبل» |
| `introImageId · objectivesImageId · metricsImageId · ctaImageId` | ObjectId ref MediaAsset, null | every picture the page prints is a field (owner rule 2026-09-14); ids, never paths |
| `phasesTitle` | `LocalizedText` or null | the frame gives the timeline no heading; the editor may |
| `phases[]` | `{ _id, title, description, iconKey ∈ PLAN_PHASE_ICON_KEYS, displayOrder, isVisible }` | the four icons the frame draws, as a closed set the editor picks from (`common/constants/plan-phase-icon-keys.ts`), never a free string or an upload |
| `pillarsTitle · pillarsText` | required · null | the pillars' heading and its paragraph |
| `pillars[] · objectives[]` | `{ _id, title, description, displayOrder, isVisible }` | the two numbered lists; no icon, the frame draws none |
| `objectivesTitle · metricsTitle · executionTitle · ctaTitle` | required | one heading per section |
| `metrics[]` | `{ _id, value: string, label, displayOrder, isVisible }` | the figure as stored text («2030», «+30%»), as the board's `ImpactMetric` already had it; the page parses the digits to count |
| `executionText · ctaText` | null | the two paragraphs |
| `executionSteps[]` | `{ _id, title, description or null, displayOrder, isVisible }` | the five stations of the path; a description slot for a future editor |
| `seo · revisionId · publicationState` | as Vision & Mission | the shared publishing shape |

- **Bilingual text** is `LocalizedText` / `LocalizedTextDto` `{ ar, en }` everywhere, the project's one pattern.
- **Order** is `displayOrder`, explicit and renumbered 1..n on every move; the project's name for the concept, so no third pattern. **Stability** is the item's own `_id`: a list item is a subdocument with an id, an item sent back with its `_id` keeps it, one sent without gets a new one. **Visibility** is `isVisible`, default true; a hidden item stays in the record and never reaches the public projection.
- **The public projection** (`dto/strategic-plan-public-response.dto.ts`) is an explicit field list (ADR-0069 D3): hidden items omitted, lists sorted, each item carrying its `id`, every image resolved in one `resolvePublicImages` call.
- **Routes** on Vision & Mission's pattern: `GET current/public` (the newest Live), the editorial routes (`editorial-state`, `PATCH :id`, `publish`, `submit`, `restore`), and `PATCH :id/lists/:list/order { ids }` which accepts only a permutation of the list's current ids (`invalidListOrder` otherwise). Two catalogue rows were added for this resource (`Update`, `Publish`); the RBAC system is untouched, and the Super Admin role took the rows through the ordinary bootstrap script.
- **Tests (red first):** schema 12, DTOs 25, service 18, catalogue and entity-content specs, `seed-dev.spec.ts` 14 with the new fixture — 80/80; `nest build` 0; `openapi.json` regenerated (+6 paths, +7 operations).

**What the client controls, and what the code holds:**

| From the dashboard | Held in the code | Why the code holds it |
| --- | --- | --- |
| every text, figure and picture of every section | the order of the eight sections | rules 1, 3 and 5 hold on the sequence the developer built; the guard checks that build, not an editor's rearrangement |
| adding, removing, reordering and hiding items in the five lists | each section's composition (band, cards, rows, statement) | a client who could make two card grids adjacent would break rule 5 without knowing |
| the SEO fields | showing or hiding a whole section | a hidden section removes a seam's separator and can put two like compositions side by side |
| — | the eyebrow «الحوكمة والاستراتيجية» and the two call-to-action labels | IA §8.1 labels, printed from the navigation's messages, as Vision & Mission's call does |

Freedom in the content, discipline in the structure.

**The seed.** `api/seed/dev/strategicPlansPage.json`, Arabic verbatim from the frame (`720:624`), English a translation of it; published on the local database on 2026-09-15 (revision `6aa945b0…`) after a direct-publish policy for the entity was created, as the two other pages have.

## The page, as built

Eight sections, Figma's order less its documents section (owner correction §١):

| # | Section | Composition (the guard's reading) | Ground | Rule 1 element | Rule 3 separator before it |
| --- | --- | --- | --- | --- | --- |
| 1 | Hero | `IdentityHero`, content height, eyebrow «الحوكمة والاستراتيجية» | photograph under the scrim | the hero's lines | — |
| 2 | Overview | statement: words in 7/12, `SlantedPhoto side="start"` | base | the photograph | the hero |
| 3 | Phases | band: a rail through four icon chips, numbers at Display L | green | the register | register change |
| 4 | Pillars | cards: `ol` of six `ItemCard`s by position | base | `SeamLines placement="below" from="md"`; **none below `md`** (owner decision below) | register change |
| 5 | Objectives | statement: five numbered rows, each edged in its item's ink, `SlantedPhoto side="start"` | sunken | the photograph, and `SeamLines` in the far corner | seam lines |
| 6 | Indicators | statement: four counting figures in the item inks, `SlantedPhoto side="end"` | base | the photograph | the mirrored pair's photographs meeting |
| 7 | Execution path | band: five steps climbing in the reading direction, joined chip to chip by one segment per climb | green | the register | register change |
| 8 | Call | statement: words in 7/12, `SlantedPhoto side="end"`, two buttons | base | the photograph | register change |

Rule 5's sequence: hero → statement → band → cards → statement → statement (the one mirrored pair) → band → statement.

**The signature.** The execution path is the identity's own geometry — the ascent of «نقطة الارتقاء» (Chapter 1 §2.1) — applied to the one section whose content is a climb: each step one `--space-12` higher than the one before, in the reading direction, joined chip to chip by one segment per climb that draws itself from its own step when the block enters the view, mirrored for the other direction. Figma's version was five English labels joined by ↓ arrows.

**Deviations from Figma, each with its rule:**

| Figma | Built | Rule |
| --- | --- | --- |
| Breadcrumb pill in the hero (`720:687`) | none visible; `BreadcrumbList` in JSON-LD; the eyebrow names the section | ADR-0072 D7 (owner) |
| Black rounded panel with four white cards (`756:217`) | the green register as a rail | rule 5 (no third grid), rule 1, Chapter 7 register set |
| Six loose accent hues on the pillars' numbers (`#b45309`, `#0369a1`, `#0f766e`, `#b91c1c`) | the four item inks by position | ADR-0072 D1 |
| Objectives on pastel rows (pink, violet, teal, amber) with a loose bar | rows on the sunken ground, edge and number in the item's ink | ADR-0072 D1; ADR-0050 palette |
| KPI cards in blue, teal and orange on black (`758:202`) | figures in the item inks on the page's ground, beside a photograph | ADR-0072 D1; ADR-0050 |
| 12px KPI labels | `body` (16/15) | Chapter 4 §4.10 (13px minimum) |
| «STRATEGIC PILLAR ↓ OBJECTIVE ↓ …» in English (`758:221`) | the five stations in Arabic («المحور الاستراتيجي · الهدف · المبادرة · القياس · الأثر»), as an ascending path | brief §٦ item ٤; Chapter 1 §2.1 |
| Six 1px dividers (`Divider`) | none; separators are registers, seam lines and meeting photographs | rule 3 |
| Two photographs in 3955px | five: hero, overview, objectives, indicators, call | rule 1; brief §٧ م٣ |
| Documents section (`758:232`) | removed | owner correction §١ |
| CTA as a rounded panel on a dark photograph with two text links | words beside a slanted photograph on the page's ground, two buttons (Vision & Mission primary, policies secondary) | ADR-0072 D5/D6; the site's call pattern |
| Hero title 40px | Display XL from `md`, H1 on a phone | owner decision (the title rises) |

**The pictures** (rule 6 read for each; rule 2's suspension item in ADR-0073 lists them):

| Slot | Asset | Alternative text (Arabic / English) | `sizes` from the crop |
| --- | --- | --- | --- |
| Hero | `vision-mission-values` 1344×768 | «ملعب ألعاب القوى ليلًا بمضماره الأحمر» / "An athletics stadium at night with its red track" | `100vw` |
| Overview | `contact-hero` 1536×672 | «منظر جوي لمدينة زايد الرياضية عند الغروب، وملعبها يحيط به مضمار أحمر» / "Aerial view of Zayed Sports City at dusk, its stadium ringed by a red running track" | from the section's height × the picture's ratio (see the measurements) |
| Objectives | `vision-mission-cta` 1536×672 | «عدّاؤون على مضمار ملعب عند الغروب» / "Runners on a stadium track at sunset" | likewise |
| Indicators | **McKenzie Community Track** 4976×2627 (real; Rick Obst, CC BY 4.0, Wikimedia Commons; source and licence in the asset's caption) | «مضمار ألعاب قوى أحمر بثماني حارات مرقّمة من 1 إلى 8 في يوم مشمس، تحيط به غابة صنوبر وتلال، وأشخاص بعيدون عند طرفه» / "A red eight-lane athletics track with its lane numbers 1 to 8 on a sunny day, pine forest and hills around it, and people far off at its end" | likewise |
| Call | `vision-mission-mission` 1536×672 | «عدّاؤون على مضمار ألعاب القوى عند الغروب» / "Runners on an athletics track at sunset" | likewise |

Every text was written after looking at the picture. The four library assets are generated (ADR-0074 D1) and stay under the suspension until 2026-10-02; the one real photograph is the only addition, and it carries its licence.

## The dashboard screen, as built

`apps/dashboard/src/app/[locale]/(app)/strategic-plan/page.tsx`, on Vision & Mission's pattern (`loadEditorialScreen`, the shared `EditorShell` with its status and version panels).

- **Nine sections in the page's order:** 1 hero · 2 overview · 3 phases · 4 pillars · 5 objectives · 6 indicators · 7 execution path · 8 call · 9 search and sharing (`components/admin/strategic-plan/editor.tsx`). Every text is a `BilingualField`, Arabic and English side by side. Every picture is a `MediaPicker` over the existing library, with preview and upload.
- **No control for section order or section visibility** — absent, not disabled; `editor.spec.tsx` asserts no such control exists, and the API's `forbidNonWhitelisted` refuses any such key.
- **The five lists** use `PlanListField` (`components/admin/strategic-plan/plan-list-field.tsx`), a generic field by props (`fields.kind`: `item`, `phase`, `metric`, `step`):
  - native HTML5 drag from a handle (the row is `draggable` only while its handle is pressed, so text selection inside the inputs still works), plus move up/down buttons and the arrow keys on the handle, each announcing the new position in a polite live region;
  - a visibility checkbox per row; a hidden row stays on screen, badged «مخفي», and stays editable;
  - add (a new row carries no `_id`) and remove; every operation renumbers `displayOrder` 1..n (`lib/admin/plan-lists.ts`);
  - a phase row picks its icon from the four keys, with the glyph beside the select (`lib/icons/plan-phase-icons.tsx`, parity-tested against the API enum).
- **Explicit save.** Nothing is sent until «حفظ المسودة»; the body holds only the changed scalars and each changed list whole (`lib/admin/strategic-plan.ts` `toPatchBody`).
- **Registration:** one `EDITORIAL_ENTITIES` entry, one navigation item under the same two grants as Vision & Mission, a `StrategicPlan` message block in both languages. No shared component or library was modified; no dependency was added.
- **Tests (vitest):** `plan-lists.spec.ts`, `plan-list-field.spec.tsx` (render order, add without `_id`, button move keeps ids and renumbers, drag-drop reorders, hide keeps the row, remove, last visible item, drop while disabled, focus after remove), `editor.spec.tsx` (the PATCH body carries only the changed list, ids kept, new pillar without `_id`, no section-order control, the draft takes the saved record), `editorial-entities.spec.ts` flipped to the registration: 56/56 across the four files after the review's fixes; `plan-phase-icons.spec.tsx` 4. `tsc` 0 · `eslint` 0.

## Interaction states

The page's interactive elements are its two call-to-action links (and the shared header and footer, untouched). The pillar cards, objective rows, phase items and execution steps **are not links and carry no hover response**: feedback on something that does nothing when clicked is a false affordance (Chapter 11 §UX; `ui/item-card.tsx`, ADR-0072 D1). The brief listed them among the interactive elements; that is the one place this page departs from the brief's list, and why.

| Element | Rest | Hover | Active | Focus-visible | Disabled · loading · selected · error · success |
| --- | --- | --- | --- | --- | --- |
| Primary «الرؤية والرسالة» (`PLAN_PRIMARY`) | `--button-primary-background` / `-text` | `-background-hover` | `-background-pressed` | 2px `--a11y-focus-ring` with a 2px painted `--a11y-focus-offset` band, measured against every ground by `register-contrast.spec.ts` (black ring and white band in light and high contrast, white ring and black band in dark) | not applicable: a navigation link has no disabled, loading, selected, error or success state; the next page's loading is the browser's |
| Secondary «السياسات واللوائح» (`PLAN_SECONDARY`) | accent outline, `--color-text-link` on the page ground | 8% accent mix | 16% accent mix | same ring | as above |

- Colour transitions use `--motion-duration-fast` with `--motion-easing-standard` (`TRANSITION`); reduced motion zeroes the duration and keeps the colour change.
- Touch: `:active` carries the pressed step; nothing depends on hover.
- The dashboard's controls (list field buttons, checkbox, drag handle, section inputs) use the dashboard's existing `BUTTON_ICON`, `BUTTON_SECONDARY` and field recipes, which `interaction-state-contract.spec.ts` guards.

## Motion, as built

One motion system: the site's `motion.css` and `RevealOnce`. No Framer Motion and no GSAP (brief §٧ م٤-أ asks for one system; Framer Motion would have been a second one beside the three built pages, and its server-rendered start state hides content from crawlers — guide §٣).

| Tier | Sections | What moves | Tokens |
| --- | --- | --- | --- |
| Strong | hero · call | hero: the ground settles from 104%, the eyebrow, title and subtitle rise at 45° in sequence, the identity strokes slide in; call: the picture slides in from the page edge inside its cut, the strokes grow | `ambient`, `base`, `slow`, `slower`, stagger 60ms |
| Medium | phases · indicators · execution path | phases: each chip, then its words, in reading order; indicators: each figure climbs and counts up once (`count-up.tsx`); the path: the line draws from the first step, then each step's chip and words | `base`, `slow`, `slower`, stagger 60ms, batched per block |
| Light | overview · pillars · objectives | heading and paragraph rise one step; cards and rows rise as blocks | `base` |

- Once only (`RevealOnce` unobserves); a block in view at load stays at rest.
- `transform` only inside `<main>` — never `opacity` (the "largest paint" guard); the hero's title and picture paint in their first frame, `fetchPriority="high"` on the hero picture, every other picture lazy.
- Horizontal travel follows the language: the picture slides from its own page edge (`--slide-from`, physical per direction), the path's line is mirrored as a whole in RTL.
- More than six items reveal as blocks, not one by one (the pillars: each card is its own block, batched by what enters the view together, capped at §5.7's ten steps).
- `prefers-reduced-motion: reduce`: `RevealOnce` does nothing, every entrance is inside `no-preference`, the counter keeps the server's final figure.
- No seam depends on motion (rule 3): every separator is a ground, an edge, a register or a picture that is present at rest.

## UI elements trialled on this page (brief §٧ م٧)

All live under `components/pages/strategic-plan/` (and the dashboard's `components/admin/strategic-plan/`), written by props with no assumption about item count or text length. None has been generalised; each is a file move away from `ui/`.

| Element | Why chosen | Where here | Pages that would benefit | Cost to generalise | From |
| --- | --- | --- | --- | --- | --- |
| **Rail band** (`phases-band.tsx`) | a short ordered sequence with icons needs a composition that is not a card grid (rule 5) | phases | About (history milestones), Championships (season phases), Organisational structure (levels) | low: rename, move; the rail colour is already a register token | code |
| **Numbered rows beside a photograph** (`objectives.tsx`) | an ordered list after a card grid, without a second grid | objectives | Vision & Mission's goals (would replace the six cards that read as one set with the values — a real improvement ADR-0074 D9 named), Policies (articles), Committees (mandates) | low | code |
| **Ascending path** (`execution-path.tsx`) | the content is a climb; the identity's own ascent draws it | execution path | Athletes (development pathway), Coaches (licence levels) | medium: the rise is `--space-12` per step, fine up to ~6 steps; more needs a wrap rule | code |
| **Count-up figure** (`count-up.tsx`) | the brief's counting KPIs, without hiding the number from crawlers or reduced motion | indicators | Homepage "Federation by the numbers", Results & rankings | low; shared `Type/Statistic Display` role decision first (Chapter 4 addendum) | code |
| **Seam lines below a band** (`SeamLines placement/from`) | the only content-free identity element after a coloured band | pillars; President's message and call; board list | every page with a green hero or band | **already shared** (Task Zero, owner-authorised) | code |
| **Link-button recipe** (`plan-buttons.ts`) | the call's two actions | call | every call to action: today the recipe is copied inside `strategy-cta.tsx` | low: one export in `ui/interactive.ts` | code |
| **Plan list field** (`plan-list-field.tsx`, dashboard) | ordered, hideable items with stable ids, drag and keyboard | all five lists | Vision & Mission's goals and values, the President's values (`BlockListField` has no drag and no visibility) | medium: those lists have no `_id`/`isVisible` upstream yet, so it replaces `BlockListField` only with a schema change | code |

What each would replace on the built pages: the rows would replace Vision & Mission's goal cards (improvement: breaks the goals/values run the critique named); the button recipe would replace the copy in `strategy-cta.tsx` (a change, not an improvement, until a third caller exists); the list field would replace `BlockListField` (improvement for editors, needs the schema). No Radix and no other library was needed: nothing here traps focus or floats; zero dependencies added.

## The code review, and what it changed

A read-only review of the whole batch (API, page, dashboard) found no critical defect and five important ones. Each was verified against the code, fixed test-first, and is guarded:

| # | Finding | Fix | Guard (red first) |
| --- | --- | --- | --- |
| 1 | The editor's draft never took the saved record: an item added before a save kept no `_id`, the form stayed "unsaved", and every later save gave the item a new id | `editor.tsx` reconciles the draft with each new record: a field untouched since the last baseline, or since the save was sent when a write landed, takes the record's value; anything typed after the send is kept (CLAUDE.md §31) | `editor.spec.tsx`: a new pillar's server id leaves the form clean; an edit typed after the send survives the refresh |
| 2 | `GET :id/public` returned the raw published snapshot: hidden items and `federationId` | the route goes through the same explicit projection as `current/public` | `service.spec.ts`: no `federationId`, no hidden pillar |
| 3 | Emptying or hiding every item of a list takes its section off the page — the one thing the page rules forbid an editor to do | the API refuses a list with no visible item (400, before any write); the dashboard makes the state unreachable: the last visible item's remove and hide controls are disabled and the row says why, and each handler checks again when it acts | `service.spec.ts` (empty, all hidden, one visible, absent); `plan-list-field.spec.tsx` (last visible, only item) |
| 4 | The execution path's line ran through column middles while the chips stand at the column start (about 90px off at 1440) | one segment per climb, drawn inside the step it leaves, from its chip's centre to the next chip's (`start-6`, `100% + --plan-gap` across, one `--space-12` up), mirrored in Arabic | `e2e/strategic-plan-geometry.spec.ts`: every segment within 1.5px of both chips, both languages, at 1440, 1024 and 768 — 6 failing, then 6 passing |
| 5 | `reorderList` could erase an edit landing between its read and its write | the write matches the `updatedAt` it read (`updateIfUnchanged`, this module's repository) and answers 409 `staleRecord` otherwise | `service.spec.ts` |

Minor findings fixed with them: `displayOrder` renumbered from array position on every save; a drop checked against `disabled` when it lands; focus moves to the add button after a remove (rows are keyed by position); a handle released anywhere disarms its row; a repeated reorder announcement is heard; the counter shows no leading zeros and starts when half the figure is in view.

Recorded, not fixed:
- **Error codes.** ~~`listNeedsVisibleItem`, `invalidListOrder` and `unknownList` are not in the closed list, so the filter sends them as `badRequest`.~~ **Closed 2026-09-16:** the three, and `listTooLong` with them, are in `api/src/common/errors/api-error-code.ts`, mapped in the dashboard's `FROM_API_CODE`, and each carries copy in both languages under `WriteErrors` (guarded by `write-error-copy.spec.ts`, which demands copy for every code).
- **`sizes` between 1024 and 1439.** The per-section values are measured at 1440; sections grow taller as text wraps below it, so the cover crop may ask for a narrower file than it shows. Measured on the final captures below.

## The design critique, and what it changed

Two isolated assessments (a design review from the captures and the source; the impeccable detector in the source and injected in the page at ar/en 1440 and ar 390).

- **Detector:** the source is clean (exit 0). In the page, 12/12/10 findings, all false positives on measurement: the hero's parallax layer is clipped on purpose; the hero text was measured against the page ground instead of the scrim over the photograph; the pillar descriptions measure 5.67–6.90:1 on the four item surfaces; the "heading rhythm" is the step chip above each step's title.
- **Fixed (edge cases the dashboard can create):**
  - Phases: from `lg` one column per phase (`--plan-phases`), as the path has one per step. With `lg:grid-cols-4` a fifth phase wrapped below the rail with its chip off the line.
  - Figures: `countable` counts only a whole figure. "1.5M" counted its first run of digits and showed "0.5M"; a figure with a decimal or grouping mark, or Arabic-Indic digits, is printed as stored.
- **For the owner (not changed; content model or design decisions):**
  - The lists do not connect: no objective names its pillar, and the item inks by position pair pillar 01 with objective 01 by colour alone. A parent-pillar field is a schema change.
  - «2030» is a horizon shown as a counted indicator, and «+30%» / «+25%» have no baseline or target year. The plan's period appears nowhere above the fold.
  - No cap on the number of steps or phases: at 768, seven steps leave columns of about 80px. A cap is a number for the owner (and a dashboard limit).
  - Hiding an item renumbers the rest: numbers are positions (rule 4). A stored number is a schema change.
  - The execution band carries five single words in the seed; either the client gives each step a description (the field exists) or the band is reconsidered.
- **Owner decisions (2026-09-16):**
  - The two P1 content findings (lists that do not connect; indicators without baseline, target year or plan period) stay as built until the client delivers the content. No schema change.
  - Too many phases or steps for one row (clarified 2026-09-16): no fixed row limit by design. Past a count computed from the width available and the narrowest column the approved layout already shows, the list takes the layout it already has on smaller screens — the phases wrap as they do below `lg`, the steps become vertical as on a phone. Whether a dashboard cap (10 was mentioned) also applies, and which small-screen layout the phases take (two columns without the rail, or vertical with it), are confirmed in the next round's brief before anything is built.
  - No re-critique and no `distill` pass in the next round.

## The row limit: ten items (owner decision 2026-09-16)

The phases stand on one rail and the execution steps on one climb. Every item added narrows every column, and past ten the section is a list nobody reads at any width.

- **`MAX_PLAN_ROW_ITEMS = 10`** (`api/src/common/constants/plan-row-limit.ts`), on `phases` and `executionSteps` only. The pillars, objectives and metrics wrap into rows on their own and carry no limit.
- **The API refuses the eleventh** before any write, in `create` and in `update`, with `listTooLong` and the list's name and the limit in the body. **Hidden items count:** they occupy the row the moment an editor shows them again.
- **Not a DTO decorator.** `ArrayMaxSize` would be refused by the global `ValidationPipe`, which has no `exceptionFactory` and answers a plain `badRequest` — one sentence for four different fixes. Changing the pipe is shared and out of this batch's scope, so the limit is a service guard beside `assertEverySectionShows`, and the DTOs carry `maxItems` for the documentation.
- **The dashboard** disables "add" at ten with a note saying why, and `add` checks again at the moment it acts (CLAUDE.md §31). The number lives in `apps/dashboard/src/lib/admin/plan-lists.ts`, because the dashboard does not depend on the API's package.
- **Tests (red first):** the API refuses eleven phases and eleven steps, accepts ten, counts hidden items, leaves the wrapping lists alone, and refuses a create — seen failing, then passing. The dashboard's refusal was seen red with the guard removed, then green.

## Row capacity: where a list stands in a row, and what it does when it cannot

Owner decisions 2026-09-16. A list that outgrows the row it stands in takes **the layout it already has on a phone** — vertical, the line along the reading-start edge, no staircase — rather than a second-row composition nobody has approved. No fixed item count decides this; the width does.

**The two measured constants** (`row-capacity.ts`, measured in the browser on 2026-09-16, both languages, on the seeded page):

| List | The narrowest approved column | Measured where |
| --- | --- | --- |
| Phases | **214px** | 1024, four phases — the width their row starts at |
| Steps | **128px** | 768, five steps — likewise |

Below these no approved screen has ever drawn the list, so the row is not drawn there either.

**The capacity, at the start of each breakpoint** — the narrowest the range can be, which is the only width a promise can be made at. Usable width is the viewport (capped at `--container-public-max` 1440) less `--grid-margin-*` on both sides; the gap is the one the list's own classes set:

| Breakpoint | Usable width | Phases (gap) | Steps (gap) |
| --- | --- | --- | --- |
| `md` 768 | 704 | — (two columns, no row) | **5** (16) |
| `lg` 1024 | 928 | **4** (24) | **6** (24) |
| `xl` 1280 | 1152 | **4** (32) | **7** (24) |
| `2xl` 1536 | 1312 | **5** (32) | **8** (24) |

`maxPerRow = floor((usable + gap) / (minimum + gap))`.

**The resulting shape, by count:**

| Items | Phases | Steps |
| --- | --- | --- |
| 1–4 | row from `lg`, two columns in the tablet range | row from `md` |
| 5 | row from `2xl`, vertical below it | row from `md` |
| 6 | vertical at every width | row from `lg` |
| 7 | vertical at every width | row from `xl` |
| 8 | vertical at every width | row from `2xl` |
| 9–10 | vertical at every width | vertical at every width |

- **The seed is untouched:** four phases and five steps keep exactly the layout they have today at every width, the tablet's two columns included — the owner's decision, and the reason the tablet form counts as a row of its own while the list still fits the `lg` row.
- **No rollback:** the row is taken from the *first* breakpoint that fits, so a list never returns to a row at a narrower width than one where it stacked.
- **CSS only, decided on the server.** The count is known when the page renders; each breakpoint's classes are written out in full (Tailwind reads the source, not a computed string) and the browser switches on media queries alone. Nothing measures `window`, so nothing settles after paint.
- **Guards:** `row-capacity.spec.ts` holds the arithmetic and the whole 1–10 table; `strategic-plan.spec.tsx` holds what each component renders at 5, 6, 7 and 10; `strategic-plan-geometry.spec.ts` measures the browser itself — at each row breakpoint the columns clear the minimum, and one item more falls under it.
- **Measured on published records** (2026-09-16, local database, each count published and the record restored afterwards), both languages, at 1536 · 1280 · 1024 · 768 · 390, no horizontal overflow in any of the 40 combinations:

| Published | 1536 | 1280 | 1024 | 768 | 390 |
| --- | --- | --- | --- | --- | --- |
| 5 phases | **row**, 5 columns, narrowest 237px | vertical | vertical | vertical | vertical |
| 7 phases | vertical | vertical | vertical | vertical | vertical |
| 7 steps | **row**, 7 columns, narrowest 167px | **row**, narrowest 144px | vertical | vertical | vertical |
| 10 steps | vertical | vertical | vertical | vertical | vertical |

Every drawn column clears its measured minimum (214 · 128), and no list returns to a row at a width narrower than one where it stood vertical.

## Pending Figma back-sync

Every state below exists in code and has no Figma frame (Figma access is read-only; nothing was written there):

1. The Strategic Plan page, Arabic and English, at 1440, 768 and 390: the eight sections as built, including the eyebrow, the rail band, the numbered rows, the counting figures, the ascending path and the call beside its photograph; the documents section removed.
2. The hero title at Display XL from `md` and H1 on a phone; statement ordinals at Display L / H1 (Vision & Mission).
3. `SeamLines placement="below"` on the President's message and call (from `lg`), the board list, and the plan's pillars (from `md`).
4. Group B's red stroke at 40.8 units.
5. The high-contrast seam edge on every coloured band.
6. The dashboard's strategic plan screen (the dashboard has no Figma frames for editorial screens; recorded for completeness).
7. The two one-row lists past their capacity: the phases vertical at desktop widths (five phases below `2xl`, six or more at every width) and the execution steps likewise (six from `lg`, nine or more never). Not a new composition — each is the phone layout the frame already has, appearing at a wider screen — but no frame shows it there.

## Content for the client

- **Urgent (as ADR-0074):** real photographs for the hero, overview, objectives and call slots — four generated library pictures stand in under the suspension to 2026-10-02.
- **The indicators' photograph** is a real, licensed picture of a track in Oregon (CC BY 4.0, attribution in its caption); the federation's own track should replace it.
- **The five figures and their labels** («2030 · 15 · +30% · +25%») are the design's; the federation confirms they are its plan's numbers before publication.
- **The English copy** is a translation of the frame's Arabic; the frame's English screens were not used (brief §٢).
