# ADR-0122 — Header v2: Six Items and Mega Panels

> **Numbering note.** The build brief that authorised this header (`docs/design-specs/header/2026-09-28-header-redesign-plan.md` §11, and the code comments it produced — `header-shell.tsx:162`, `theme-switch.tsx:27,79`, `layout.tsx:56`) anticipated this record as **ADR-0121**, on the assumption that ADR-0120 was the highest existing record. Between that plan being written and this record being filed, **ADR-0121 — Identifier Spelling In API Responses** (2026-09-28/29, an unrelated batch on `api/`) took that number first and is Accepted. This record is therefore **ADR-0122**, and the four code comments above cite the wrong ADR number until the files that carry them are next touched. See D3 and D-Note below.

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-29. |
| **Authority** | Product Owner decisions in `docs/design-specs/header/2026-09-28-header-redesign-design.md` (the spec, including its §15 post-reconciliation decisions, which override anything earlier in the same document) and `docs/design-specs/decision-log.md` (24 numbered decisions, 2026-09-28/29). |
| **Amends** | **ADR-0062 D1** (the eight-item structure) — replaced by six items, five panels, Home reachable from the logo only. **ADR-0062 D5** (the 1280 row-threshold measurement) — re-measured for the new six-item tree at 40/24 margins. **ADR-0062 D4** (the drawer nests in flow, not as a modal) — reversed; see D3. **ADR-0061 D5** (the language switcher spells the destination out) — shortened to an endonym glyph; the full name moves to `aria-label`/`title`. |
| **Does not amend** | **ADR-0062 D3** (WAI-ARIA APG Disclosure Navigation, not `role="menu"`) — unchanged; `primary-nav.tsx` still builds `<button aria-expanded aria-controls>` over a plain `<ul>` of links. **ADR-0062 D6** (motion entirely from tokens) — unchanged; the panel rise, the drawer stagger and the tricolour wipe all cite existing tokens, none minted. **ADR-0062 D7** (the `[hidden]`-cannot-be-overridden finding, and driving the attribute from layout state) — unchanged; `mega-panel.tsx`'s `hidden={!isOpen && !isRow}` is the direct descendant of that fix. **ADR-0063 D1** (link text must use `--color-text-link`, never `--color-brand-primary`) — extended to hover, not altered; see D5. **ADR-0063 D2** (footer quick-links derived from the nav tree) — unchanged mechanism; `FOOTER_QUICK_LINKS = navDestinations()` still derives, only the tree under it changed. **ADR-0069 D9** (`--motion-duration-ambient` restricted to one authorised use) — respected, not loosened; see D11. |
| **Context** | The eight-item header (ADR-0062) carried three unresolved defects: a top-level "Home" item duplicating the logo's own destination; an About panel whose first child repeated the parent's name (`Nav.about` / `Nav.aboutOverview` read identically); and three built, indexed, working pages — `/records`, `/results-rankings`, `/disciplines` — reachable from no link in the header at all. Championships and Events were flat items pointing at pages still under construction. There was no place in the tree for a season, a discipline primer, or national teams and talent, and every panel was a single column, which cannot hold the richer structure those additions need. |
| **Decision** | Six top-level items, five of them mega panels, one (`contact`) a direct link; Home is reachable only from the logo. Below 1536px the row uses `--space-10`/`--space-6` (40px/24px) margins and gutters, not the 1440px master's `--grid-margin-xl`/`--grid-gutter-xl` (64px/32px) — D2. The drawer below 1280px is now a modal: focus-trapped, scroll-locked, `aria-modal` — a deliberate reversal of ADR-0062 D4 — D3. The language switcher shows only the destination's endonym glyph — D4. The active item's tricolour underline never appears on hover for a non-active item; hover changes text colour only — D5. `badge` and `keepsCardInDrawer` are explicit `NavItem` fields, not string comparisons — D6. `/about/organisational-structure` and `/events/federation-events` are deleted with no redirect — D7. Site search is new: a `$text` index per source with Arabic-spelling normalisation, Atlas Search explicitly rejected — D8 — and no `/search` page — D9. The Athletics and Events & Seasons panel cards use `section-black` — D10. The live-stream indicator is a static dot — D11. `CMP-MEGAMENU-001` is raised from Experimental to Stable — D12. |
| **Why This Decision** | Every defect ADR-0062 left open was a consequence of a flat, single-column structure trying to hold a growing tree: duplicate destinations, unreachable pages and no room for new sections are what a tree outgrowing its container looks like. Grouping into five panels with two-level columns solves all three at once and gives the three pending sub-projects (seasons, public events, athletics) a structural home before their content exists. The drawer reversal, the search build and the card-surface departure are each a specific, evidenced correction to an assumption that stopped holding once the tree grew — not a redesign for its own sake. |
| **Risks** | **The 40/24 margins read as slightly tighter than the 1440 master between 1280–1535px.** Mitigation: measured, not guessed (D2); the alternative (64/32 throughout) leaves English 26.44px short of the row it needs at 1280. **The drawer-as-modal is a reversal of an explicit prior decision.** Mitigation: the reversal is on the same evidence standard as the original decision — the tree is measurably longer now, and the drawer covers the full page, which ADR-0062 D4 itself did not have to weigh against. **Arabic search misses word forms `$text` cannot stem.** Mitigation: stated plainly as a known limitation (D8), not hidden behind "search works." **27 new nav icon glyphs and every new visual state have no Figma frame.** Mitigation: `Pending Figma Back-Sync`, D13, enumerated rather than asserted compliant. |
| **Consequences** | `apps/web/src/lib/navigation.ts`'s `PRIMARY_NAV` is fully replaced; `messages/{ar,en}.json`'s `Nav` namespace is restructured to match. A new `api/src/modules/platform-administration/search/` module and six schema-level `search_text` indexes are added, with no field added, removed or renamed on any schema. `docs/product/01-Information-Architecture.md` §8.1 and §12 need the corresponding update (not made by this record — see Chapter-edit note under D12). Four D9-flavoured code comments (D-Note) misnumber this ADR until their files are next touched. |

---

## D1 — The structure: six items, five panels, Home from the logo only

Amends **ADR-0062 D1**. The six root keys, in order, are `about`, `athletics`, `championshipsResults`, `eventsSeasons`, `media`, `contact` (`apps/web/src/lib/navigation.ts:67–162`). Five carry `children` (panels); `contact` is a direct link. Home carries no entry at all — `PRIMARY_NAV.some((item) => item.href === "/")` is asserted `false` by `navigation.spec.ts` — and is reached exclusively through the logo link in `header-shell.tsx:206–217`.

A panel's `children` are **columns**, never links directly: a column is itself a `NavItem` with no `href` and its own `children`, which is what `MegaPanel`/`MegaColumn` lay out side by side and what a screen reader announces as a heading (`mega-column.tsx`'s visible `<h2>`). This one nested level is the structural answer to the three defects in Context: `about`'s first column (`aboutFederationColumn`) now starts with `aboutOverview` → `/about` and a separate, correctly distinct `presidentMessage` child, closing the old `Nav.about`/`Nav.aboutOverview` duplication; `championshipsResults` carries `records` and `resultsRankings` as ordinary column children, closing the unreachable-page defect; and `athletics`, `eventsSeasons` each have two columns precisely because a single column could not hold a "discover the sport" group beside a "community" group, or an events group beside a seasons group.

**What survives from ADR-0062 unchanged, restated here because D1 replaces the section it lived in:**
- **D3 — Disclosure Navigation, not a menu.** `primary-nav.tsx`'s `renderGroup` still builds a `<button aria-expanded aria-controls>` over a plain `<ul>`; `role="menu"`/`menuitem` remains absent and guarded.
- **D6 — Motion entirely from tokens.** The panel rise/fade, the drawer's staggered entrance and the tricolour wipe (D5 below) each cite an existing token; none is invented for this batch.
- **D7 — `[hidden]` cannot be overridden by a stylesheet.** `mega-panel.tsx:85` (`hidden={hidden}`, driven by `!isOpen && !isRow` in `primary-nav.tsx:295`) is the same layout-state-driven fix ADR-0062 D7 introduced, now serving five panels instead of three.

## D2 — The 1280 measurement, re-taken for six items

Amends **ADR-0062 D5**, which measured the old eight-item tree. Measured live (`measure-header.mjs`, output in `measure-output.json`) on the actual six-item row at 1280px and 1440px, both locales, comparing 64/32 margins (the 1440 master's `--grid-margin-xl`/`--grid-gutter-xl`) against 40/24 (`--space-10`/`--space-6`):

| Locale | Width | Margins | Row needs | Available | Slack |
| --- | --- | --- | --- | --- | --- |
| English | 1280 | 64/32 | 878.44px | 852px | **−26.44px** |
| English | 1280 | 40/24 | 838.44px | 900px | **+61.56px** |
| Arabic | 1280 | 64/32 | 902.92px | 852px | **−50.92px** |
| Arabic | 1280 | 40/24 | 862.92px | 900px | **+37.08px** |

Presented in the same shape as ADR-0062 D5's own table (wanted against available, per language), because it answers the same question its predecessor did, for the tree that replaced it. **Decision:** `--space-10`/`--space-6` (40px/24px) below `1536px`; `--grid-margin-xl`/`--grid-gutter-xl` (64px/32px) resume at `2xl` (1536px), where 1536 − 128 margins − logo − utilities leaves comparable slack to the 1280/40-24 case. No value here is free: both pairs are named design-system spacing tokens (Design-system table in `2026-09-28-header-redesign-plan.md`, "القيم المعتمدة"), never a literal pixel figure written into the component.

## D3 — The drawer becomes modal: a deliberate reversal of ADR-0062 D4

**Amends ADR-0062 D4**, which explicitly decided the drawer would nest in flow as an inline accordion, "not as a second floating layer" and not a modal. §15 item 5 of the design spec reverses that decision: the drawer below 1280px now carries `role="dialog"`, `aria-modal="true"` while open, a focus trap (`use-focus-trap.ts`, shared with the search dialog — D8), and a page scroll lock (`document.body.style.overflow = "hidden"` plus `scrollbar-gutter: stable`, scoped to the same effect in `header-shell.tsx:143–156`).

**This is recorded as a deliberate reversal, not a silent contradiction of a still-standing decision.** ADR-0062 D4's own reasoning — a *second floating layer* has no hover to open it on touch and covers the list it came from — is about a **flyout**, and is unaffected: the drawer is still one inline accordion, not a flyout-over-a-flyout. What changed is a fact ADR-0062 D4 did not have in front of it: the tree is now six items deep with two-level columns under each, not a shallower eight-item list, and the accordion it renders now covers the full page underneath it for the whole time it is open. A drawer that visually and structurally covers everything, while nothing stops the reader from scrolling or tabbing into the page behind it, is a modal **in every way except its accessibility contract** — it was already a barrier in fact; ADR-0062 D4's "not a modal" was a decision about disclosure and layering, and those are unchanged. The reversal is on the same evidence standard ADR-0062 D4 itself used, re-applied to a tree that outgrew the assumption.

**D-Note (numbering).** This record was drafted expecting the number 0121. That number belongs to an already-Accepted ADR (Identifier Spelling In API Responses), so this is 0122. Four code comments written against the earlier expectation cited `ADR-0121` — `layout.tsx`, `theme-switch.tsx` (×2) and `header-shell.tsx` — and have been corrected to `ADR-0122 D15` and `ADR-0122 D3` respectively. The two `ADR-0121` references in `api/src/common/authz/administrative-id-endpoints.ts` are correct as they stand: they mean the identifier-spelling record.

## D4 — The language switcher, shortened

Amends **ADR-0061 D5**, which had the control spell the destination out in full ("English" / "العربية" as the visible label). The tools capsule (`header-tools-capsule.tsx`, `language-switch.tsx`) now shows only the destination's own endonym glyph — `EN` on the Arabic page, `ع` on the English page — with the full name moved to `aria-label`/`title` (`switchLanguageFull`, "{language} — switch to {language}" / "{language} — التبديل إلى {language}"). `lang`/`hrefLang` on the link are unchanged from ADR-0061 D5. The reason is capsule space: three controls (search, language, theme) now share one 44px-tall capsule at 1280's tighter 40px margins (D2), and a spelled-out language name was the widest of the three.

## D5 — The tricolour indicator: 3px, `scaleX`, and hover changes text only

`TricolorIndicator` (`tricolor-indicator.tsx`) is a 3px bar (`--border-width-ring`) painted from `--brand-tricolor`, animated by `scaleX` from the inline-start edge rather than the previous version's `translate` (`motion.css`, `.nav-indicator[data-state="rest"]`). Its middle ink is `--color-tricolor-mid`, which resolves to **black in light mode and white in dark mode** (confirmed in `packages/design-tokens/build/css/light.css`/`dark.css`, both at line 135) — this **corrects the design spec's own §4 phrasing, "أخضر/أسود/أحمر" (green/black/red), which names only the light-mode reading**; §15 item 6 flags the correction explicitly and this ADR records it as the resolution.

**Hover on a non-active item changes text colour only, never the underline.** `primary-nav.tsx`'s `topLevelClass` (line 363–368) adds `hover:text-[color:var(--color-text-link)]` and `focus-visible:text-[color:var(--color-text-link)]` to the non-active branch; the indicator's own hover/focus CSS rules that used to reveal the bar on `:hover`/`:focus-visible` were removed from `motion.css` (kept only for `[aria-expanded="true"]`, so an open panel's own trigger still draws its underline). This extends **ADR-0063 D1** (`--color-text-link`, never `--color-brand-primary`, as link text) to the hover state rather than altering it. The reason, recorded in `decision-log.md` #8: two tricolour underlines lit at once — the active page's permanent one and a hovered item's temporary one — hide which page the reader is actually on. Colour is a safe second channel for "you are about to open this"; a second underline is not.

## D6 — `soon` badge and `keepsCardInDrawer` as explicit `NavItem` fields

`NavItem.badge?: "soon"` (`navigation.ts:36–40`) is set on exactly one destination, `/national-teams`, rendered by `MegaLink` as a neutral chip joined into the link's own accessible name (`mega-link.tsx:66`, `Badge` composed from the shared `BADGE`/`BADGE_NEUTRAL` recipes in `@/components/ui/surface`, not a page-specific import). `NavItem.keepsCardInDrawer?: true` (`navigation.ts:41–47`) is set only on `athletics`, and read by `MegaPanel`'s `showFeature` (`mega-panel.tsx:71`) to decide whether a panel's feature card survives inside the drawer — every other panel drops its card there, because a promoted destination below a full column of links is a second screen of scrolling on a phone; Athletics keeps its "find the nearest club" card because that card is the panel's own call to action, not a promoted article.

Both fields replace what would otherwise be a string-literal comparison against `item.key` (`decision-log.md` #9): `item.key` is typed `string`, so a typo in a key comparison (`"athletic"` for `"athletics"`) compiles and fails silently, where a typed, optional field does not.

## D7 — Deleting two routes with no redirect

`/about/organisational-structure` and `/events/federation-events`, and their backing pages/screens/`PREPARING_PAGES` entries, are deleted outright — no redirect, no middleware rewrite; each now 404s locally by the existing `app/[locale]/[...rest]/page.tsx` catch-all. Both deletions are safe on the evidence gathered before the delete:

- **`/about/organisational-structure`** — its content (the federation's org chart) becomes a section of the Board of Directors page instead of its own destination; the tree it belonged to (`boardMembers`) still exists and still links from the About panel.
- **`/events/federation-events`** — carried `noindex, follow` and was never in the sitemap; grep confirmed after deletion that no remaining source file references `federation-events`, `FederationEventsScreen`, or `OrganisationalStructurePage`, and `internal-links-contract.spec.ts` — red before the five replacement `PREPARING` pages existed, green after — confirms nothing else in the app still points at either deleted route.

## D8 — Search: `$text` with Arabic normalisation; Atlas rejected outright

A new, unauthenticated, rate-limited (`@RateLimit(60, 60)`) public endpoint, `GET /search/public` (`api/src/modules/platform-administration/search/search.controller.ts`), searches six sources in parallel (`Promise.allSettled`, so one failing collection drops only its own group): `articles`, `albums`, `videos`, `clubs`, `athletes`, `coaches` (`search-sources.ts:21`, `buildSearchSources`). Each source's `publicFilter` is read from that resource's own real public listing code, not invented — with two corrections made against the brief that first drafted them: `articles` uses `publicationState: 'Live'` (the brief's `'Published'` matches no row, since `ARTICLE_PUBLICATION_STATES` is `['Draft','Live']`), and `clubs`/`coaches` add `status: 'Active'` (an `Inactive` row would otherwise be publicly searchable). `athletes` is a two-phase read: the `$text` index lives on `Athlete.name` (no bilingual name field exists on `AthleteProfile`), and a match is resolved through `AthleteProfile` before it can become a public hit, dropping any athlete with no live profile.

**Six `search_text` indexes**, each `default_language: 'none'` (declared as `Schema.index(...)`, no `@Prop` touched, confirmed by a pre-check that no collection carried a prior text index):

| Collection | Fields |
| --- | --- |
| `articles` | `title.ar`, `title.en` |
| `albums` | `title.ar`, `title.en` |
| `videos` | `title.ar`, `title.en` |
| `clubs` | `name.ar`, `name.en` |
| `athletes` | `name.ar`, `name.en` |
| `coaches` | `fullName.ar`, `fullName.en` |

`normalizeArabic` (`arabic-normalize.ts`) folds alif forms, ta marbuta/ha, alif maqsura/ya, hamza carriers, diacritics and tatweel before the term reaches `$text`.

**Atlas Search was rejected as an explicit decision, not deferred** (`decision-log.md` #21): the database is the local `mongodb://127.0.0.1:27017/uaeaf` deployment, with no Atlas cluster and therefore no `lucene.arabic` analyzer available to run against. **The known limitation is recorded plainly, not hidden behind "search works":** MongoDB's `$text` with `default_language: 'none'` does not stem Arabic — a search for "الأندية" (the plural, with the definite article) will not find a club whose stored name is "نادي" (the singular). `normalizeArabic` corrects spelling **variation** (the same word written two ways); it does nothing for **derivation** (two different forms of the same root). This is the deliberate cost of building on the project's real, local infrastructure rather than a search backend the project does not have.

A subsequent security review found six issues, all fixed: an `athletes` result linked to a non-existent `/athletes/:slug` route (changed to the anchor form `/athletes#slug`, matching `clubs`/`coaches`); the `athletes` group's `total` counted rows before the profile join and could reveal that a non-public athlete existed by name (fixed to count after the join, from the same resolved array `items` slices from); a regex-injection test that asserted an always-empty mock result rather than the actual query shape (rewritten to assert the literal `$text` filter reaching the model); a missing controller-level test for the bracket-notation injection shape (`?q[$ne]=1`, added); a missing `@MaxLength(80)` on the DTO (added, so an oversized query is a 400 rather than a silent truncation); and six schema diffs that had accidentally rewritten an unrelated `Types.ObjectId` import style across all six files (reverted so each diff is index-only, confirmed zero-`MongooseSchema` by `grep`).

## D9 — No `/search` page

Amends **§15 item 1** of the design spec, which called for a `/search?q=` page (`noindex, follow`) alongside the dialog. Owner decision, `decision-log.md` #14: the dialog alone, with five results per group and a "show more" that raises one group's own limit to the endpoint's ten-item ceiling, is the whole search surface. No standalone results page was built.

## D10 — Athletics and Events & Seasons cards use `section-black`

Both panels' feature cards render on the `section-black` surface. Recorded in `decision-log.md` #7 as a deliberate departure from the design canvas, which showed a blue card surface for at least one of these: **no blue surface token exists in the design system, and blue is not a UAEAF identity colour** (Federation Green and Federation Red are — Chapter 1). Introducing one for a single card would be exactly the "arbitrary colour" CLAUDE.md §2 forbids. The two panels never render their cards simultaneously (only one panel is open at a time), so the shared dark surface does not create a visual collision between them.

## D11 — The live-stream indicator is a static dot

`MegaLink`'s icon tile, when a broadcast is live, renders a static filled circle (`bg-[color:var(--color-brand-secondary)]`, sized to the same `--icon-size-sm` token every sibling icon in that tile already uses) rather than a pulsing one. No token on the design system's motion scale licenses a continuous, above-the-fold pulse: `--motion-duration-ambient` is restricted by **ADR-0069 D9** to its one named use (the President's-Message portrait hero's background settle) and explicitly forbids a second use without its own ADR; `--motion-duration-entrance` is restricted to below-the-fold arrival content; `--orbit` belongs to `BrandBorder` alone; `--slower` is reserved for record/medal celebratory moments (ADR-0062 D6). Rather than invent a seventh motion value, the destination's caption shows the broadcast's real title (`live.title`, sourced from `getHeaderFeatures`), so colour is not the only channel carrying "this is live." The pulse itself remains open — see D14.

## D12 — `CMP-MEGAMENU-001`: Experimental → Stable

`docs/design-system/08-L3-Navigation-Components.md` (around line 462) currently records `CMP-MEGAMENU-001` as `Status: Experimental (Chapter 8 G.2) — not currently required by any documented Workflow`, with only a Purpose and Taxonomy — no Anatomy, no Behavior, no Accessibility section, unlike its neighbour `CMP-TOPNAV-001`. This header is that component's first production use. Its specification, as built and tested, is:

- **Anatomy:** a links column, a second links-or-content column ("middle" slot), and a fixed-width feature card, laid out as a CSS grid whose track count (`data-columns`) is `columns.length + (middle present ? 1 : 0)`, closing up when either optional track is absent rather than leaving a gap.
- **Behavior:** one panel open at a time; opens on `Enter`/`Space`/hover-with-`(hover: hover)`; closes on `Escape` (returning focus to its trigger), an outside pointer press, a route change, or another panel opening.
- **Accessibility:** WAI-ARIA APG Disclosure Navigation (`<button aria-expanded aria-controls>` over a plain `<ul>`, never `role="menu"`); `aria-current="page"` on the matching link only, never the trigger; roving focus (arrow keys, Home/End) inside an open panel; a visible `<h2>` per column, not `sr-only`.
- **Status:** **Stable**, scoped to this header's usage.

**The chapter file itself is not edited by this record** — per the task's own instruction, this ADR states the change and the edit `08-L3-Navigation-Components.md` needs (replace the `Experimental`/one-line description block with the Anatomy/Behavior/Accessibility/Status content above, following `CMP-TOPNAV-001`'s existing shape), for a future documentation pass to apply.

## D13 — Pending Figma Back-Sync

Figma access is not confirmed restored for this batch; per CLAUDE.md §1a.4 and §18, no Figma file was touched. The following visual states exist in the shipped code with no corresponding Figma frame, and are recorded here for that reconciliation:

- The six-item row with five mega panels, at 1280 and 1440, both locales, both themes.
- The three-track panel grid (links column(s) + middle slot + feature card) — specifically the Media panel's article-teaser middle slot, which has no frame at all in the source design (found only by re-reading spec §3.5 after an initial build omitted it).
- The tricolour indicator's `scaleX` wipe and its light/dark middle-ink correction (D5).
- The modal drawer (focus trap, scrim, scroll lock) below 1280px — a behavioural change with no corresponding visual frame, since the visual composition is unchanged from ADR-0061's own "PENDING FIGMA BACK-SYNC" drawer note.
- The shortened language switcher (glyph-only) in the tools capsule.
- The search dialog: combobox input, type tabs, grouped listbox, "show more," empty/error/loading states.
- The static live-stream dot on `MegaLink`.
- The `soon` badge chip on National Teams & Talent.
- The five new `PREPARING` pages' standing screens (`/athletics`, `/national-teams`, `/events`, `/seasons`, `/seasons/current`).
- The 27 new nav-panel icon glyphs plus the fallback glyph (`nav-icon.tsx`) — original line art fitted to each destination, not sourced from Figma, because Figma tooling was not exercised for this batch.

## D14 — Open items, stated honestly

- **The live-stream dot's pulse** (D11) — `DESIGN DECISION REQUIRED`: needs either a new ADR extending an existing motion token's authorised use, or a new token, before any pulsing treatment can be added.
- **The English club-finder card copy** ("Find the Nearest Athletics Club" / "Search Now") is a literal translation of the approved Arabic wording, not an independently owner-approved English string (`decision-log.md` #11, `PENDING-OWNER`).
- **The drawer's tools row uses the same 44px touch target as the row**, not the 48px shown in the reference design (`decision-log.md` #15, `PENDING-OWNER`): no 48px token exists for a control; 44px is the documented floor (IA §12) and is what `min-h-11` already provides.
- **The `coaches` public-search filter** (`status: 'Active'`) is applied by direct analogy to `Club`'s identical field, with no coaches-specific public-route precedent to confirm it against — no public route for coaches exists at all yet (`decision-log.md` #20, `PENDING-OWNER`).
- **`Search.retry`** is a defined message key with no control wired to it yet; the error state shows the message only.
- **The Events & Seasons panel's "jump to a season" middle slot**, and the Championships panel's season-summary middle slot, are both still absent (no reader exists for either) — explicitly deferred to the seasons sub-project in the same series, not built here.

## D15 — High contrast follows the device, and outranks the switch

The theme control is a two-position switch: light and dark. High contrast is not a third
position on it.

`prefers-contrast: more` is read by the same inline script that already resolves the theme
before first paint (`layout.tsx`), which writes `data-theme="high-contrast"` and re-applies
on a live change of the setting. While that setting is on it overrides whatever the switch
last wrote, and the switch reports its own **stored** preference rather than the applied
attribute — otherwise a reader who chose dark would see the control claim light for as long
as high contrast was active.

**No token is redeclared under a media query.** `high-contrast.css` already defines the whole
theme under `[data-theme="high-contrast"]`; the script's only job is to write that attribute.
Duplicating any of its 176 values into a media query would create a second place for them to
drift.

`forced-colors: active` is the browser's own business and needs nothing from this codebase.

Amends nothing. Completes the theme-control behaviour that ADR-0061 and the dark-theme work
left at two positions.

