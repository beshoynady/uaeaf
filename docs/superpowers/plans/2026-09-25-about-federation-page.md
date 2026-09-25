# About Federation Page — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.
> **Git is read-only in this repository (CLAUDE.md §33).** No task ends in a
> commit. Each task ends in a *verification* step instead.

**Goal:** Replace the flat, never-published `aboutFederationPage` record with a
ten-section composition that an editor writes end to end from the dashboard,
and print it at `/[locale]/about` with nine scroll scenes.

**Architecture:** The record stays in its existing collection and keeps its
existing workflow entity type; only its fields change. Editing follows
`strategic-plans-page` exactly (`PublishingService`: draft → submit → publish).
Section *order* is fixed in code; section *visibility* is stored. The public
read is a projection that removes hidden sections, hidden items, undated
milestones and sections left empty by that removal, so the browser never
receives content a visitor must not see.

**Tech Stack:** NestJS + Mongoose (`api/`), Next.js 16 App Router
(`apps/web`, `apps/dashboard`), `motion@13.3.0`, `@uaeaf/brand-ui`.

**Spec:** the owner's execution brief of 2026-09-25 (this conversation), plus
`docs/design-specs/about/about-page.design.html` and
`docs/design-specs/about/about-admin.design.html`.

## Global Constraints

- No new dependency. No Git command. Work on `main`, leave everything uncommitted.
- `LocalizedText = { ar, en }`, **both halves required**, per the existing schema.
- Arrow functions everywhere except class methods and decorated Nest providers
  (CLAUDE.md §30.1). `try/catch` used plainly where needed (§30.2).
- CSS logical properties only. Code comments in plain English, explaining *why*.
- WCAG 2.1 AA, measured — contrast computed, keyboard operable, `focus-visible`.
- Every write endpoint's response contains `_id` (audit-log interceptor
  condition, `audit-log.interceptor.ts:152-156`, which stays untouched).
- `motion-budget.spec.ts` must keep passing; the budget is never relaxed.
- Protected, read-only: `audit-log.interceptor.ts`, Workflow Engine core,
  `PublishingService`, `app-shell.tsx`, `sidebar-nav.tsx`, `command-palette.tsx`,
  `MotionProvider`, `apps/web` header and footer, the other governance pages.
  The single permitted shell edit is one entry in `lib/navigation.ts`.

## Naming alignment (deviation from the approved schema sketch, flagged)

The brief writes `hidden: boolean` on list items. Every existing embedded list
in this codebase stores `isVisible: boolean` and renumbers `displayOrder` from
the array position (`strategic-plans-page.service.ts`, `normaliseList`). This
plan uses **`isVisible`**, because CLAUDE.md §28 prefers the existing pattern
over a parallel one, and `block-list-field`/`plan-list-field` already read that
name. Same field, same semantics, project's own spelling — reported, not
silently chosen.

`category` on a milestone is an **enum of five**, not editor-typed text: the
approved admin design draws it as a `<select>` with exactly the five options.
Its bilingual labels live in the message catalogues.

## Review Focus

Five conditions the brief implies that no task's happy path exercises:

1. **A section hidden while its scene owns a scroll ref.** Conditional render
   must not change hook order — hooks live inside each section component.
   Pinned to Task 12.
2. **Achievements with two visible cards on a wide viewport.** The pin wrapper
   would reserve scroll distance for a row that never moves. Pinned to Task 13.
3. **A milestone hidden in the middle of the timeline.** Left/right alternation
   must be computed from the filtered index, not the stored one. Pinned to Task 11.
4. **Every stat source empty.** The ecosystem section must disappear rather than
   print a ring with no numbers. Pinned to Task 4.
5. **`isActive` toggled by a user holding `Update` but not `Publish`.** The
   route must refuse, not merely hide the button. Pinned to Task 6.

---

## File Structure

### Backend (`api/src`)

| File | Responsibility |
|---|---|
| `modules/federation-governance/about-federation-page/schemas/about-sections.schema.ts` | The ten section subschemas + the three list-item subschemas |
| `…/schemas/about-federation-page.schema.ts` | **Replaced** root schema |
| `…/dto/update-about-federation-page.dto.ts` | Draft save, with `hiddenSections` and `datePrecision` validation |
| `…/dto/toggle-about-active.dto.ts` | `isActive` only |
| `…/dto/about-federation-public-response.dto.ts` | The visitor projection |
| `…/about-federation-page.service.ts` | Draft write, public projection, filtering |
| `…/about-federation-stats.service.ts` | Counts from `clubs`/`athletes`/`officials` |
| `…/about-federation-page.controller.ts` | `strategic-plans-page` route set + `PATCH :id/active` |
| `modules/federation-governance/federation-appointments/dto/appointment-public-response.dto.ts` | Public projection of a current-cycle appointment |
| `common/constants/permission-catalogue.ts` | `+ Update`, `+ Publish` |
| `common/constants/entity-content.ts` | New `REVISION_READ_FIELDS` |
| `seed-about-federation-page.ts` | Idempotent seed of §14-ب |

### Dashboard (`apps/dashboard/src`)

| File | Responsibility |
|---|---|
| `lib/admin/about-federation.ts` | `toDraft` / `toPatchBody` / `changedFrom` |
| `lib/admin/about-readiness.ts` | Per-section completeness + the pre-submit notices |
| `app/api/admin/about-federation/route.ts` | BFF read/write |
| `app/api/admin/about-federation/active/route.ts` | BFF `isActive` |
| `app/[locale]/(app)/about-federation/page.tsx` | Route, permission gate, data load |
| `components/admin/about-federation/editor.tsx` | `EditorShell` + the two columns |
| `…/section-list.tsx` | The numbered ten, locks, switches, readiness badges |
| `…/readiness-panel.tsx` | "قبل الإرسال للموافقة", three levels |
| `…/active-bar.tsx` | Page status strip + confirm dialog |
| `…/section-editor.tsx` | Dispatches to the selected section's fields |
| `…/fields/{hero,facts,story,timeline,achievements,pioneers,leadership,governance,ecosystem,cta,seo}-fields.tsx` | One per section |
| `…/milestone-row.tsx`, `…/achievement-row.tsx`, `…/pioneer-row.tsx` | List rows + inline editors |
| `lib/navigation.ts` | One entry |

### Web (`apps/web/src`)

| File | Responsibility |
|---|---|
| `lib/about/types.ts` | The public response as the page reads it |
| `lib/about/rich-text.tsx` | `**bold**` → `<strong>`, no `dangerouslySetInnerHTML` |
| `components/pages/about/about-screen.tsx` | Server; fixed order, renders what came back |
| `…/inactive-screen.tsx` | Reuses `PreparingPageScreen` |
| `…/sections/*.tsx` | Nine sections + CTA, each owning its own scroll hooks |
| `…/parts/*.tsx` | `MilestoneCard`, `AchievementCard`, `PersonCard`, `StatTile`, `FactCard` |
| `…/about-jsonld.tsx` | `SportsOrganization` + `BreadcrumbList` |
| `app/[locale]/about/page.tsx` | **Replaced** stub |
| `lib/pages/public-pages.ts` | Move `about` out of `PREPARING_PAGES` |

---

## Task 1 — Section subschemas

**Files:** create `…/schemas/about-sections.schema.ts`; test
`…/schemas/about-sections.schema.spec.ts`.

**Produces:** `HeroSection`, `FactsSection`, `StorySection`, `TimelineSection`,
`AchievementsSection`, `PioneersSection`, `LeadershipSection`,
`GovernanceSection`, `CtaSection`, `AboutSeo`, and the item classes
`Milestone`, `Achievement`, `Pioneer`; the constants
`ABOUT_SECTION_KEYS`, `HIDEABLE_SECTION_KEYS`, `DATE_PRECISIONS`,
`MILESTONE_CATEGORIES`, `MEDAL_KINDS`, `FACT_TONES`.

- [ ] **Step 1** Write `about-sections.schema.spec.ts` asserting: `DATE_PRECISIONS`
  is `['year','monthYear','fullDate','unknown']`; `HIDEABLE_SECTION_KEYS` has
  exactly the seven content keys and excludes `hero`, `leadership`, `ecosystem`;
  a `Milestone` defaults `isVisible` to `true` and `featured` to `false`.
- [ ] **Step 2** Run `npx jest --runInBand api/src/modules/federation-governance/about-federation-page` — expect FAIL (module not found).
- [ ] **Step 3** Write the subschemas. Every text field `LocalizedTextSchema, required: true`.
  Every image field `Types.ObjectId, ref: 'MediaAsset', default: null`.
  Items carry `_id` (do **not** set `_id: false`), `isVisible`, `displayOrder`.
- [ ] **Step 4** Re-run — expect PASS.

## Task 2 — Root schema replaced

**Files:** modify `…/schemas/about-federation-page.schema.ts`; test in Task 1's spec.

**Consumes:** Task 1. **Produces:** `AboutFederationPage` with `isActive`,
`hiddenSections`, the ten section props, `seo`, `publicationState`.

- [ ] **Step 1** Extend the spec: the schema has no `sectionOrder` path, no
  `story.highlights` path, and `isActive` defaults to `false`.
- [ ] **Step 2** Run — FAIL.
- [ ] **Step 3** Replace the class body. Keep `@Schema({ collection: 'aboutFederationPage', timestamps: true })`
  and `publicationState`. Drop `HeroPageSchema` inheritance — the hero is now a
  section object, not the three-field wrapper. Keep `extends BaseSchema`.
- [ ] **Step 4** Run — PASS. Then `npx tsc --noEmit -p api` (ts-jest does not
  type-check; `reference_tsjest_no_typecheck`).

## Task 3 — DTOs and validation

**Files:** create `…/dto/update-about-federation-page.dto.ts`,
`…/dto/toggle-about-active.dto.ts`; test `…/dto/update-about-federation-page.dto.spec.ts`.

- [ ] **Step 1** Spec: `hiddenSections: ['hero']` fails; `['leadership']` fails;
  `['ecosystem']` fails; `['facts','cta']` passes. `datePrecision: 'year'` with
  no `year` fails; `'monthYear'` with `year` but no `month` fails; `'fullDate'`
  needing all three; `'unknown'` passing with none. A `medalKind: 'other'`
  without `medalLabel` passes (the label is optional).
- [ ] **Step 2** Run — FAIL.
- [ ] **Step 3** Implement with `class-validator`. The `hiddenSections`
  constraint is `@IsIn(HIDEABLE_SECTION_KEYS, { each: true })`. The date rule is
  a custom `@ValidatorConstraint` on the milestone DTO reading its sibling
  `datePrecision`. Title max 160, description max 600.
- [ ] **Step 4** Run — PASS.

## Task 4 — Stats service

**Files:** create `…/about-federation-stats.service.ts`,
`…/about-federation-stats.service.spec.ts`.

**Produces:** `AboutFederationStatsService.counts(): Promise<{ clubs: number|null; athletes: number|null; officials: number|null; championships: null }>`

- [ ] **Step 1** Spec: counts come from the three models' `countDocuments`;
  `championships` is always `null`; **when all four are `null` the caller is
  expected to drop the section** — assert `counts()` returns all-null when the
  models throw, so the projection can decide. (Review Focus #4.)
- [ ] **Step 2** Run — FAIL.
- [ ] **Step 3** Implement. Inject the three models by name. **No literal number
  anywhere in this file.**
- [ ] **Step 4** Run — PASS.

## Task 5 — Public projection

**Files:** create `…/dto/about-federation-public-response.dto.ts`; modify
`…/about-federation-page.service.ts`; test `…/about-federation-page.service.spec.ts`.

**Consumes:** Tasks 1–4. **Produces:** `getCurrentPublic()`, `getPublicSnapshot(id)`,
`update(id, dto, actor)`, `setActive(id, isActive, actor)`.

- [ ] **Step 1** Spec, one case each:
  - a key in `hiddenSections` ⇒ that section is absent from the response;
  - an item with `isVisible: false` ⇒ absent;
  - a milestone with `datePrecision: 'unknown'` ⇒ absent **whatever** its `isVisible`;
  - a section whose items all vanished ⇒ the section itself is absent (`emptySectionAutoHide`);
  - no current-cycle appointments ⇒ `leadership` absent;
  - all stats null ⇒ `ecosystem` absent;
  - `isActive: false` ⇒ the response is exactly `{ isActive: false }`;
  - the response never carries `hiddenSections`, `isVisible` or `displayOrder`.
- [ ] **Step 2** Run — FAIL.
- [ ] **Step 3** Implement. Read through `PublicationsService` exactly as
  `strategic-plans-page` does (`liveVersion` → `toPublicResponse`). Filter, then
  drop empties, then attach leadership and stats.
- [ ] **Step 4** Run — PASS.

## Task 6 — Controller, permissions, audit

**Files:** modify `…/about-federation-page.controller.ts`,
`common/constants/permission-catalogue.ts`, `common/constants/entity-content.ts`;
test `…/about-federation-page.controller.spec.ts`.

- [ ] **Step 1** Spec: every write route's response body has `_id`;
  `PATCH :id/active` is declared `@RequirePermission('aboutFederationPage','Publish')`
  — assert by reading the route metadata, so a later edit to `Update` fails the
  test (Review Focus #5); the catalogue contains `Update` and `Publish`.
- [ ] **Step 2** Run — FAIL.
- [ ] **Step 3** Implement the `strategic-plans-page` route set verbatim in
  shape, plus `PATCH :id/active`. Add the two catalogue rows. Rewrite
  `REVISION_READ_FIELDS.aboutFederationPage`.
- [ ] **Step 4** Run — PASS; then `npx tsc --noEmit -p api`.

## Task 7 — Public appointments endpoint

**Files:** modify `…/federation-appointments/federation-appointments.controller.ts`,
`…/federation-appointments.service.ts`; create
`…/dto/appointment-public-response.dto.ts`; test
`…/federation-appointments.public.spec.ts`.

- [ ] **Step 1** Spec: only `status: 'Active'` rows with `termEnd` null or in the
  future; sorted by `displayOrder`; the DTO carries exactly `fullName`,
  `positionTitle`, `roleType`, `displayOrder`, `photoId` — assert that
  `internalContact`, `publicContact` and `nationalityId` are absent.
- [ ] **Step 2** Run — FAIL.
- [ ] **Step 3** Implement `GET /federation-appointments/public` with `@Public()`.
- [ ] **Step 4** Run — PASS.

## Task 8 — Seed

**Files:** create `api/src/seed-about-federation-page.ts`.

- [ ] **Step 1** Write the seed with §14-ب verbatim, both languages. Basra
  milestone `datePrecision: 'unknown'`. `isActive: false`. Every image `null`.
- [ ] **Step 2** Run it twice against the local DB; the second run must not
  duplicate — verify by counting documents before and after.

## Task 9 — ADR

**Files:** create `docs/design-system/ADR-0101-About-Page-Section-Visibility-Exception.md`.

- [ ] **Step 1** Write it, following the house format of ADR-0099. Content is
  fixed by the brief §5 المرحلة 2: hiding allowed for the seven content
  sections; hero always printed; leadership and ecosystem automatic and hidden
  only when their source is empty; empty sections auto-hide; ordering forbidden
  for two reasons (the colour cadence dark/light/green/red, and the scroll-scene
  sequence); hiding means not rendering; ADR-0075 still governs every other page.
- [ ] **Step 2** Add the cross-reference line to ADR-0075's own file **only if**
  that file has a "superseded/amended by" section already; otherwise leave
  ADR-0075 untouched and say so in the report.

## Tasks 10–11 — Dashboard

**Files:** as the File Structure table lists.

- [ ] **Step 1** `lib/admin/about-readiness.ts` + spec first: given a draft,
  return per-section `{ status: 'complete'|'translation'|'images', count }` and
  the ordered notice list at three levels. A missing English half of a required
  field is `required`; a null image is `warning`; an auto-hidden milestone is
  `info`. Submission is blocked iff any `required` notice exists.
- [ ] **Step 2** Run — FAIL, implement, PASS.
- [ ] **Step 3** Build `section-list.tsx`: ten numbered rows, `role="switch"` +
  `aria-checked` on the seven, a locked badge on hero, an "تلقائي" badge on
  leadership and ecosystem, no drag affordance anywhere.
- [ ] **Step 4** Build `active-bar.tsx`: the strip, the confirm dialog, and
  **absent entirely** without `Publish`. Escape handling on the dialog follows
  `reference_dialog_search_escape`.
- [ ] **Step 5** Build the section editors from `BilingualField` (side-by-side —
  confirmed available, no `EditorShell` change needed), `MediaPicker`, and
  `BlockListField` for the three lists.
- [ ] **Step 6** Run the dashboard suite for the touched files only.

## Tasks 12–14 — Web page and motion

- [ ] **Step 1** `rich-text.tsx` + spec: `**x**` → `<strong>`; an unmatched `**`
  stays literal; no HTML is ever parsed from the string.
- [ ] **Step 2** Sections, each a separate file, each owning its own
  `useScroll({ target: ref })`. `about-screen.tsx` renders a fixed array of
  section components and skips those absent from the response — **the hooks are
  never conditional** (Review Focus #1).
- [ ] **Step 3** Timeline alternation from the filtered index (Review Focus #3).
- [ ] **Step 4** Achievements: measure the visible cards; when their total
  inline size fits the container, render a plain row with **no** pin wrapper
  (Review Focus #2). Mobile and reduced-motion always use `scroll-snap`.
- [ ] **Step 5** Hero scroll cue targets the id of the first section still
  present after the hero.
- [ ] **Step 6** `generateMetadata`, `hreflang`, `SportsOrganization` with
  `foundingDate: '1976-01-15'` and both `memberOf` bodies, `BreadcrumbList`.
- [ ] **Step 7** Move `about` from `PREPARING_PAGES` to `PUBLIC_PAGES`.
- [ ] **Step 8** Run `motion-budget.spec.ts` and the web suite for touched files.

## Task 15 — `/simplify`, then Task 16 — browser verification

Per brief §5 المرحلة 5 and 6. The verification scenarios are the brief's list,
run on a real browser at 1440/768/390, in both languages, with and without
`prefers-reduced-motion`.
