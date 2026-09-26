# The About page, end to end

`/[locale]/about` on the public site, and the screen that writes it in the
dashboard. Read this before changing either.

**Two things this page no longer owns alone** (ADR-0102, 2026-09-26). The
editor's layout is now the shared tabbed shell — §D1 — so the status, review,
versions and SEO panels are tabs rather than a column beside the form, and the
sections are a vertical rail with the selected one in `?section=`. And the
activation bar is now `components/admin/activation/page-activation-bar.tsx`,
shared with every other page screen — §D2. What the bar *does* on this page is
unchanged; where it lives is not.
`docs/engineering/editor-shell-and-page-activation.md` is the explainer for
both.

---

## 1. Why it exists, and the alternatives that were rejected

The federation's history lived nowhere. `/about` answered with the
in-preparation screen, and the record behind it — `aboutFederationPage` — held
a flat editorial design taken from the physical model before the page was ever
composed: a founding date, one intro paragraph, a first-president block, and a
bounded `achievements` list. Nothing had ever been published from it.

Four things were decided against.

**A new collection.** `aboutFederationPage` was already a workflow entity type,
a publication entity type, a permission resource and a row in two content
registries. A second collection would have meant a second set of all of those,
and a first one left behind as dead weight. The fields were replaced in place
instead. Nothing was stranded, because nothing had been published.

**A singleton.** `SingletonPageService` exists and excludes this collection by
name: the workflow-governed pages pick the newest Live publication among their
rows, which is what lets a record be rehearsed on without touching the live
page. Forcing a singleton here would have been a different rule for one page.

**Editor-controlled section order.** ADR-0101 D3 has the full reasoning. In
short: the order carries the identity guide's colour cadence and the sequence
the scroll scenes are composed against, and an editor dragging a row can see
neither.

**A rich-text editor for the story.** Two paragraphs with four bold runs in
them. A second rich-text system beside the newsroom's would have been a stored
format, a sanitiser, a toolbar and a migration. The field is a plain bilingual
string in which `**text**` reads as emphasis, and `rich-text.tsx` prints it as
text — never as markup.

---

## 2. The file map, in the order the work flows

**API** — `api/src/modules/federation-governance/about-federation-page/`

| File | What it holds |
|---|---|
| `schemas/about-sections.schema.ts` | The ten sections and the closed vocabularies (`DATE_PRECISIONS`, `MILESTONE_CATEGORIES`, `MEDAL_KINDS`, `FACT_TONES`, `HIDEABLE_SECTION_KEYS`) |
| `schemas/about-federation-page.schema.ts` | The row: `isActive`, `hiddenSections`, the ten sections, `seo`, `publicationState` |
| `dto/about-text.dto.ts` | `TitleTextDto` / `ProseTextDto` (the two length ceilings) and `AboutLinkDto` (where a link may point) |
| `dto/about-list-items.dto.ts` | The four list items, the date-precision rule, the one-featured rule |
| `dto/update-about-federation-page.dto.ts` | The draft body, and what a caller may not send |
| `../../../common/dto/toggle-active.dto.ts` | One boolean. Shared with the other fifteen pages since ADR-0102 §D2; this module's own copy is gone |
| `about-public-projection.ts` | **Every rule about what reaches a visitor**, as a pure function |
| `about-images.ts` | Collecting picture ids, and putting the resolved pictures back |
| `about-federation-stats.service.ts` | The counted figures |
| `about-federation-page.service.ts` | Draft writes, the public read, `setActive`, `sourceCounts` |
| `about-federation-page.controller.ts` | The `strategic-plans-page` route set, plus `PATCH :id/active` and `GET sources` |
| `../federation-appointments/` | `GET /public` — the serving board, four fields per person |
| `../../../bootstrap/about-federation-seed-content.ts` | The approved first content |
| `../../../seed-about-federation-page.ts` | `npm run seed:about` |

**Dashboard** — `apps/dashboard/src/`

| File | What it holds |
|---|---|
| `lib/admin/about-readiness.ts` | `AboutDraft` (the shape everything is written against) and the three-level readiness pass |
| `lib/admin/about-federation.ts` | `toDraft` / `changedFrom` / `toPatchBody` |
| `components/admin/about-federation/editor.tsx` | `EditorShell`, the rail beside the fields, the draft state machine, `?section=` |
| `…/section-list.tsx` | The numbered ten as a **vertical tablist**: locks, automatic badges, switches (ADR-0102 §D1) |
| `…/readiness-panel.tsx` | "Before sending for approval" — drawn in the **review tab** since ADR-0102 §D1, not beside the rail |
| `components/admin/activation/page-activation-bar.tsx` | The live/off strip and its confirmation. **Shared with every other page screen** since ADR-0102 §D2; this module’s own copy is gone |
| `…/about-list-field.tsx` | **One** generic list: reorder, per-row state, inline editing, caps |
| `…/media-field.tsx` | `MediaPicker` plus the asset's alternative text |
| `…/section-editor.tsx` | Picks the section's fields by key |
| `…/sections/*.tsx` | One file per section |
| `app/api/admin/page-activation/[entity]/route.ts` | The switch’s BFF route, shared with the other fifteen pages. `about-federation/active` is gone |
| `app/[locale]/(app)/about-federation/page.tsx` | The screen |

**Web** — `apps/web/src/`

| File | What it holds |
|---|---|
| `lib/about/types.ts` | The response as the page reads it, and the printed order |
| `lib/about/rich-text.tsx` | `**bold**`, as text, never as markup |
| `app/[locale]/about/page.tsx` | Three states: no publication, switched off, live |
| `components/pages/about/about-screen.tsx` | The fixed order |
| `…/inactive-screen.tsx` | What a visitor sees while the page is off |
| `…/about-jsonld.tsx` | `SportsOrganization` with its founding date and memberships |
| `…/sections/*.tsx` | One file per scene |
| `…/parts/*.tsx` | `ImageSlot`, `CountUp`, `SectionEyebrow` |

---

## 3. One real example, traced: giving the Basra milestone a year

The milestone the federation documented but never dated. It is seeded
`datePrecision: "unknown"` and is therefore **not on the page at all**.

1. **The editor opens it.** `timeline-fields.tsx` draws the precision
   `radiogroup`. At `unknown` the three date inputs are `disabled` and a blue
   panel says the milestone is withheld until a date is given — blue, because
   nothing is wrong.
2. **They choose "Year" and type 1975.** `patchItem({ datePrecision: "year" })`
   then `patchItem({ year: 1975 })` merge into that one item;
   `editor.tsx`'s `patchSection("timeline")` merges the item list into the
   draft.
3. **Save.** `toPatchBody(original, draft)` sees only `timeline` differ and
   sends only `timeline`, whole — every other section is left out, so saving
   this cannot revert a section someone else edited. Each item keeps its `_id`
   and drops `displayOrder`.
4. **The API takes it.** `MilestoneDto`'s `@HasItsDateParts()` reads the
   sibling `datePrecision` and requires `year`; it is there, so the body
   validates. `AboutFederationPagesService.update` merges the section field by
   field and renumbers `displayOrder` from the array position.
5. **Review and publish.** `POST :id/submit`, then
   `POST :id/publish-approved`. `RevisionsService` freezes the row —
   **without** `isActive`, which the schema keeps out of every plain read.
6. **The visitor's read.** `getCurrentPublic` finds the newest Live
   publication, then `projectAboutPage` drops hidden sections, hidden items and
   undated milestones. This milestone is no longer undated, so it survives.
7. **The page.** `about-screen.tsx` renders `AboutTimeline`, which alternates
   sides from the **filtered** index — so the new milestone takes its place and
   the cards after it swap sides, which is correct, because the line they hang
   off is one line.

---

## 4. The decisions that are not obvious

**Hiding means not rendering.** A hidden section is absent from the API
response. Hidden in CSS it would still be in the markup; skipped in React it
would still be in the server-rendered HTML. Either way the federation's
unfinished wording is one "view source" away. ADR-0101 D4.

**`emptySectionAutoHide`.** A section whose items have all been hidden or
withheld disappears with them. A heading over an empty band tells a reader
something is there.

**Alternation is computed from the visible list.** Taken from a stored order,
hiding the third of six milestones would leave two cards on the same side and a
gap where the third had been.

**The rail is pinned only when it overflows.** Pinning spends vertical scroll
on horizontal movement, which is honest only when there is movement to make.
The track and the viewport are measured; two cards on a wide screen get an
ordinary row.

**`isActive` is `select: false`.** `RevisionsService` freezes whatever a plain
`.lean()` read returns and `PublishingService.restore` writes a snapshot
straight back. An ordinary field here would mean restoring last month's wording
also restored last month's live/offline state — taking a published page off the
site with nobody asking. Both services are shared workflow core, so the
exclusion lives on the field.

**Alternative text belongs to the asset.** One description of a photograph,
written once, rather than six copies that drift. `MediaField` shows it and
links to the library.

---

## 5. Adding a section, or a scene

1. Add the key to `ABOUT_SECTION_KEYS`, and to `HIDEABLE_SECTION_KEYS` only if
   an editor may switch it off.
2. Add its subschema in `about-sections.schema.ts` and its prop on the root
   schema.
3. Add its DTO to `update-about-federation-page.dto.ts`.
4. Teach `about-public-projection.ts` about it — including **when it is
   empty**. Forget this and the page prints a heading with nothing under it.
5. Add it to `REVISION_READ_FIELDS.aboutFederationPage`. Forget this and the
   section silently vanishes from every version a reviewer opens, with no test
   failing.
6. Dashboard: a file in `components/admin/about-federation/sections/`, a line
   in `section-editor.tsx`, and its keys in both message catalogues.
7. Web: a file in `components/pages/about/sections/`, a line in
   `about-screen.tsx`, and its keys in both message catalogues.
8. Extend `SECTION_ORDER` in `about-readiness.ts` **and** `ABOUT_SECTION_ORDER`
   in `lib/about/types.ts`. They are two lists of the same order; the specs pin
   both.

A new scene: put its hooks **inside its own section component** and bind
`useScroll` to that section's own ref. A hook in `about-screen.tsx` would be
conditional on a neighbour existing, which changes hook order between renders.

---

## 6. Three ways to get this wrong, and how you would notice

**Reading `isActive` from an ordinary query.** It is `select: false`, so it
comes back `undefined`, which is falsy, so the page appears switched off and
the dashboard's bar says "not live" about a live page. Use
`findByIdWithActivation`. `about-federation-page.schema.spec.ts` pins the
exclusion in both directions.

**Naming an untouched section in a save.** `toPatchBody` sends only what
changed. Send the whole draft and every section is rewritten with whatever this
screen loaded, silently reverting whoever saved last. The spec that catches it
is "names only the section that changed".

**Adding a colour without a measured pairing.** `token-lists-contract.spec.ts`
fails the moment a token registered `unpaired` is used anywhere. That is why
the medal badges carry the medal in words rather than in colour — see the
deviation table.

---

## 7. What guards it

| Spec | What breaks without it |
|---|---|
| `about-sections.schema.spec.ts` | The closed vocabularies drift from the screens written against them |
| `about-federation-page.schema.spec.ts` | `isActive` enters a revision, and a restore flips the page offline |
| `update-about-federation-page.dto.spec.ts` | A dangerous `href`, a half-claimed date, a second featured pioneer, a hideable hero |
| `about-public-projection.spec.ts` | Hidden content reaches a visitor; an empty section prints a bare heading |
| `about-images.spec.ts` | A stored id reaches the browser, or a deleted asset becomes a broken image |
| `about-federation-stats.service.ts` specs | A tile claims a number nobody counted, or one unreadable source takes the section down |
| `federation-appointments.public.spec.ts` | A former officer is named, or a restricted field leaves the server |
| `about-readiness.spec.ts` | The submission gate and the section badges disagree |
| `about-federation.spec.ts` | A save reverts a section the editor never opened |
| `rich-text.spec.tsx` | An editor's text becomes markup |
| `design-system/*.spec.ts` | Identity colour as ink, an unmeasured pairing, a control with no focus ring |

---

## 8. What was deliberately not built

- **An athlete picker** for an achievement's optional `athleteId`. The
  dashboard has no such component, and inventing one for an optional field is a
  feature of its own.
- **A championships count.** There is no championships collection. The stats
  service answers `null` and the tile is not drawn.
- **Editing an asset's alternative text from the picker.** `MediaPicker`
  requires it at upload and cannot edit it afterwards; adding that would change
  a component three other screens depend on.
- **Section reordering.** ADR-0101 D3.
- **A mobile artboard.** The canvas is one 1440 frame; the page is responsive by
  the Chapter 5 rules, which is the owner's instruction, not an omission.

---

## 9. The words

| Term | Meaning |
|---|---|
| **`hiddenSections`** | The content sections an editor switched off. Seven keys are allowed; the hero and the two automatic sections are not among them. |
| **`emptySectionAutoHide`** | A section disappearing because its own filtering left it with nothing, rather than because anyone switched it off. |
| **`datePrecision`** | How much of a milestone's date the federation has confirmed. `unknown` is an answer, not a gap, and withholds the milestone. |
| **Automatic section** | One whose presence follows its source rather than a switch: leadership (the board module) and the ecosystem (the record counts). |
| **Register** | Which identity ground a band stands on — neutral, green, red or black. |
| **Pinned rail** | The achievements section while its track is wider than its viewport. |
| **Unpaired token** | A colour declared but never measured against a ground. Using one fails `token-lists-contract.spec.ts`. |

---

## 10. Deviations from the approved canvas

Each was forced by a rule that outranks the canvas, and each is listed so the
canvas can be reconciled rather than quietly disagreed with.

| What the canvas draws | What was built | Why |
|---|---|---|
| A bespoke hero: badge eyebrow, 84px title, tricolour rule, concentric rings, brand mark, labelled "scroll to discover" link | `IdentityHero`, the institutional hero the three sibling governance pages use | Owner decision 2026-09-25: the photographic hero on these pages keeps its structure; only colour, tokens and the entrance may differ. The four canvas-only elements are not part of that component. |
| 12px pills on the facts, timeline and pioneer cards | 13px (`text-label`) | The 13px floor holds. ADR-0041's exceptions are narrowly scoped and non-transferable (CLAUDE.md §5, §6). |
| Gold, silver and bronze tinted medal badges | One measured badge ground; the medal is carried by the word | The medal tokens are registered `unpaired` — declared, never measured against any ground. Registering the pairings is a design-token change, raised as a proposal. |
| Coloured figures on the fact cards and timeline dates (identity green / red as text) | A measured text role; the identity stays on the border, the badge and the dot | ADR-0063 D1: the identity colours are theme-immutable and cannot answer to the ground behind them, so they cannot carry text. |
| One 1440 desktop frame | Responsive across the Chapter 5 breakpoints | The canvas has no tablet or mobile state; the owner's instruction is to derive them from the rules rather than invent an artboard. |

All five are recorded **PENDING FIGMA BACK-SYNC**: the canvas at
`docs/design-specs/about/` is the approved source and no Figma frame exists for
these states.

---

## 11. Backlog

Raised by the four `/simplify` reviews and verified by reading, but not applied
in this batch. None is a defect in what ships; each is a cost that will be paid
by the next person unless it is cleared.

### Worth doing next

| # | Item | Why it matters |
|---|---|---|
| B1 | **`CountUp` exists twice.** `@/components/pages/strategic-plan/count-up` already has one that reads `--motion-duration-slower`, reserves the number's width so nothing shifts, and exports `countable()`. The About copy hard-codes 1100ms and re-derives "is this a whole number". | Two count-up behaviours on sibling pages, one bypassing the motion token. |
| B2 | **Two bands are still hand-rolled instead of `Section`** — the timeline and the ecosystem. Four were converted during browser verification, because `brand-surface` paints the *kit's* `--surface-bg`, not the register tokens, so the black and green bands were writing a ground they never got. The remaining two paint `--color-surface-sunken` directly and are correct; the ecosystem one needs a `ref` on the section, which `Section` does not forward. | The page still mixes two ground systems. `Section` would need a forwarded ref first. |
| B3 | **Seven hand-written tricolour gradients.** `--brand-tricolor`, `--brand-tricolor-block` and `BrandAccentBar` / `TricolorDivider` / `BrandBorder` already carry the per-surface and high-contrast handling these miss. The `tri` fact card's `borderImage` also squares off the card's rounded corners. | Visible defect on the `tri` card; the rest is drift from the identity layer. |
| B4 | **The CTA is a third look.** The two sibling pages use `CtaBand tone="red"` with brand-ui `Button`. Reusing it needs `CtaBand` to accept an `id` and a heading level. | Three CTA treatments across one page family. |
| B5 | **`SAFE_HREF` duplicates `isUsableCtaUrl`** (`hero-cta.schema.ts`). Same allowlist, two definitions, and only one of them parses with `new URL`. | An XSS-relevant rule with two homes. |
| B6 | **Four services now copy "newest Live publication among rows"** (`about`, `vision-mission`, `strategic-plans`, `president`), along with `ref`/`plain`/`normaliseList`/`liveVersion`. A `PublicationsService.findNewestLive(entityType)` would absorb all four. | The copy count is the argument. |
| B7 | **The post-save reconciliation hook is copied verbatim** from the Strategic Plan editor. Two copies of a CLAUDE.md §31 guard. | The next page makes three. |
| B8 | **Text ceilings are server-only.** `TITLE_MAX`/`PROSE_MAX` live in the DTO; no field shows a counter, so an editor finds out at save. `packages/content/hero/limits.ts` is the precedent for sharing them. | The missing half of the §31 pairing. |
| B9 | **`readinessOf` does not model `emptySectionAutoHide`.** The API drops an emptied section; only the story section warns about it, and it does so locally. Facts, timeline, achievements, pioneers and governance give no notice. | An editor can hide every item and publish a page missing a section with no warning. |
| B10 | **Milestones carry `featured` with no "at most one" rule**, while pioneers have one. The schema comment implies a single dark card. Whether the timeline should allow more than one is a product decision. | Either the rule or the comment is wrong. |

### Smaller

- `asRecord` is defined three times inside the API module; `Item`/`StoredItem`/`AboutListItem` three times in the dashboard.
- `SECTION_ORDER` and `SECTIONS` are two copies inside the dashboard (the cross-app copy is pinned on purpose).
- The vocabularies (`FactTone`, `CardTone`, `MedalKind`, `DatePrecision`, `MilestoneCategory`) are declared in the API schema, in `about-readiness.ts`, in `web/lib/about/types.ts`, and again locally in four section files. An `@uaeaf/content/about` module is the precedent-backed home.
- Milestone date formatting is written twice (dashboard `formatLead`, web `formatDate`) and mirrors the API's `REQUIRED_DATE_PARTS`.
- `Intl` formatters are constructed per row per render in five places; two other files already pass one down.
- `changedFrom` serialises the whole draft twice on every keystroke.
- `SwitchField` is memoised but the memo never takes effect: `toggleSection` is rebuilt each render.
- `page-activation-bar.tsx` re-implements `useAdminWrite`; it catches failures and is covered by `page-activation-bar.spec.tsx`, but the hook already did that and more. It now serves sixteen screens, so the cleanup is worth more than it was.
- `postalAddress` duplicates `schemaAddress` and produces a different `streetAddress` for the same `#organization` node.
- `AboutOrganizationJsonLd` duplicates the body of the never-called `OrganizationJsonLd`.
- The blue information panel's class string is written three times across the section editors; `numberOrNull`, `FeaturedMark`, `InfoIcon`, `ChevronIcon` and `hasWriting` are each copied between two or three files.

### Proposed design-token change

**Register the medal pairings.** `--color-semantic-medal-gold` / `-silver` /
`-bronze` are declared but marked `unpaired`, so nothing has measured them
against any ground and `token-lists-contract.spec.ts` fails the moment one is
used. The achievement badges therefore carry the medal in words on a measured
ground. Tinting them needs those three pairings registered in
`packages/design-tokens/tokens/semantic/pairings.json` with a contrast floor —
an owner decision, not a code change.

---

## 12. What the browser found (2026-09-26)

Phase 6 ran the page in Chromium at 1440 / 768 / 390, in both languages, with
and without `prefers-reduced-motion`, against the live API and a published,
switched-on page. `apps/web/e2e/about-federation-page.spec.ts` is that run, and
it stays as the page's guard. Screenshots land in `apps/web/e2e/artifacts/about/`
— evidence for a person to look at, never compared to a baseline, because the
content is the federation's and changes.

Six defects surfaced. Each is fixed, and each has a test that fails without the
fix.

| What | Where | Why it mattered |
|---|---|---|
| **The black bands painted no ground.** `brand-surface` paints the *kit's* `--surface-bg`/`--surface-text` and is applied by the `Surface` component alone; used on a register band it paints the canvas. White text sat on a white page. | achievements, pioneers, leadership, cta | Converted to `Section register=…`, the sanctioned way to put a band on an identity ground. |
| **The page scrolled sideways at 390.** A leader card's name is `truncate`d — `white-space: nowrap` — and its `<li>` is a grid item, whose automatic minimum size is its content's min-content width. The track sized to the longest name uncut: 423px in a 390px window, and the whole document with it. | `about-leadership.tsx` | `min-w-0` on the grid item. Guarded by "never scrolls sideways" at every width and language. |
| **The rail pinned on a phone.** The plan's Task 12–14 Step 4 says mobile and reduced-motion always use `scroll-snap`. Reduced-motion was built; the width was not, so on a phone — where the track overflows furthest, 1305px — the section took over the only gesture a reader has for leaving it. | `about-achievements.tsx` | Gated on `--breakpoint-lg`, read from the token rather than written as a number (§16). |
| **The page had no name.** `Pages.about` existed in neither language, so `next-intl` logged `MISSING_MESSAGE` and rendered the key's own path into the `<title>` and the breadcrumb. The entry moved from `PREPARING_PAGES` to `PUBLIC_PAGES` without a name being written for it. | `messages/{ar,en}.json` | Given the label its own navigation already uses (`Nav.aboutOverview`), so no new copy. `page-message-keys.spec.ts` now pins both catalogues, in both languages. |
| **No icon in the sidebar.** `NAV_ICON` had no entry for `aboutFederation`, so the collapsed sidebar drew an empty square named only by a tooltip. | `ui-icons.tsx` | Caught by the dashboard's own `ui-icons.spec.tsx` the first time the whole suite ran against this work. |
| **Four controls took focus without showing it**, and one lit up on hover with no pressed state. | `media-field`, `readiness-panel`, `section-list`, `timeline-fields` | The shared `FOCUS_RING`, plus `active:` on the readiness notice. Caught by `interaction-state-contract.spec.ts`. |

Two of the six were found only by running the *whole* dashboard suite rather
than the files this work touched. That is the lesson worth keeping: this page's
contract guards live in `lib/design-system` and `lib/icons`, nowhere near its
own directory.

### Measured

- **Contrast.** 55 text runs on the four painted grounds, every one ≥ 4.5:1,
  computed from `getComputedStyle` rather than from the tokens, so a wrong
  token is still caught.
- **Layout shift** across the pinned rail, scrolled down and back: **0.0040**
  (the budget is 0.1).
- **Keyboard.** Six controls reached by <kbd>Tab</kbd>, every one drawing an
  indicator.
- **Sideways scroll.** Zero at all three widths, both languages, both motion
  preferences.

### The eleven hiding rules

Each was applied to the real draft, published, and read back from the
server-rendered page: the seven hideable sections one at a time, an achievements
list cut to two cards, a milestone hidden from the middle of the list, every
milestone hidden, and the restore to seed state. **11/11.** In each case the
named thing was withheld and everything else was printed; emptying the timeline
dropped the whole section, as `emptySectionAutoHide` says it should.

One thing to know before repeating this: `PUBLIC_REVALIDATE_SECONDS` is 60 and
`revalidate` is stale-while-revalidate. The first read after the window still
answers from the old copy and only *then* refreshes, so a single fetch reports
the **previous** state. Read twice.

### The activation gate

`PATCH :id/active` requires `aboutFederationPage:Publish`, and the dashboard
hides the control without it. Both halves are tested — the route in
`about-activation-guard.spec.ts`, which also asserts that every one of the
seven writing routes carries a grant, and the screen in
`page-activation-bar.spec.tsx`. The route's refusal is the one that matters: a
hidden button stops nobody who can reach the API.

Since ADR-0102 §D2 the same pair holds for fifteen more pages, and
`page-activation-routes.spec.ts` checks each of them against the permission
catalogue — so a page with the switch and no grant, or a route gated on
`Update`, fails a test rather than a click.
