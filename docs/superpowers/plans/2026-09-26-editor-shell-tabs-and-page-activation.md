# EditorShell Tabs + Site-Wide Page Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the governance page editors the full content width by moving status, review, versions and SEO into tabs, and give every public page that has a dashboard screen the same activation bar About already has, so switching a page off serves a professional "in preparation" page at the same URL.

**Architecture:** One `isActive` field on the shared `HeroPageSchema` (`default: true`, `select: false`) reaches all fifteen collections that extend it — the twelve hero pages plus the three workflow-governed governance pages — while `aboutFederationPage` keeps its own (`default: false`). `SingletonPageService` gains the activation read and write once for all twelve. On the dashboard, `PageActivationBar` moves out of About into `components/admin/activation/` and is consumed by `EditorShell`'s header slot and by the two screens that are not on the shell. `EditorShell` grows a `role="tablist"` header with up to four panels, each rendered only when the page supplies its content; every field stays controlled from state held **above** the shell, so switching tabs cannot lose a draft.

**Tech Stack:** NestJS 11 + Mongoose (api), Next.js 16 App Router + next-intl + Tailwind v4 tokens (apps/dashboard, apps/web), Vitest (dashboard/web unit), Jest (api), Playwright CLI (e2e).

**Spec:** The owner's brief of 2026-09-26 (this session's prompt) and `docs/design-specs/about/about-admin-tabs.design.html`.

## Global Constraints

- **Arrow functions** for every new function; convert `function` declarations in every file touched, except class methods, dynamic `this`, generators, overloads, `arguments`, and pre-definition calls (CLAUDE.md §30.1).
- **No new design tokens, no `packages/brand-ui` edits, no `CLAUDE.md` edits** without owner approval (brief §7). Every colour, radius, spacing and type value comes from an existing `--color-*` / `--radius-*` / `text-*` token.
- **Protected, do not touch:** `PublishingService` and workflow core, `app-shell` / `sidebar-nav` / `command-palette`, `audit-log.interceptor` (brief §8).
- **Do not touch** album or media files (brief §9).
- **Git is read-only** (CLAUDE.md §33): `status`, `diff`, `log`, `show`, `ls-files` only. Commits are written out as text for the owner.
- **Logical CSS properties only** — `padding-inline`, `margin-inline-start`, `text-start`; never `left`/`right` (RTL is the default locale).
- **Playwright `--workers=1`**, one session, no full API suite unless ≥ 3 GB RAM is free.
- **WCAG 2.1 AA, measured** — not asserted (memory: `feedback_responsive_a11y_seo_acceptance`).
- **The homepage `/` is out of scope** (owner decision 2026-09-26, recorded in ADR-0102 §D6): `pages.status` stays the dashboard's homepage anchor and gets no activation control.
- **Next ADR number is 0102.** Highest existing is ADR-0101.

## Review Focus

Five conditions the brief implies that no task's happy path exercises. Each has its test named in the owning task.

1. **A row written before the field existed.** Mongoose applies `default: true` to new documents only; an existing row has no `isActive` key at all, so `record.isActive !== true` and every one of the fifteen pages goes dark the moment the gate ships. Test: Task 2, `hero-activation-backfill.spec.ts`.
2. **A restore that also restores the live/offline state.** `PublishingService.restore` writes a snapshot straight back over the row. Without `select: false` on the shared field, restoring last month's wording takes a published page off the site with nobody asking. Test: Task 3, one restore case per workflow type.
3. **A `Publish` grant nobody holds.** The twelve hero pages carry only `<x>Page:Update` in the catalogue. A `PATCH active` gated on `Publish` is refused for every existing operator until the catalogue row is added and `bootstrap-admin` re-run. Test: Task 4, catalogue spec + a 403 case per type.
4. **A tab switch that discards typed work.** Every panel's inputs are controlled from state above the shell, but only if the shell renders panels as siblings rather than remounting the editor. Test: Task 6, `editor-shell-tabs.spec.tsx` and the e2e round trip.
5. **A switched-off page still in the sitemap, or answering 404.** The brief requires 200 + `noindex` + out of the sitemap. `isIndexable` reads the list endpoint, not the switch, so the switch has to be wired into both `generateMetadata` and `sitemap.ts`. Test: Task 8 (`activation-seo.spec.ts`) and Task 12 (e2e).

---

## File Structure

**API — new**

- `api/src/common/services/page-activation.spec.ts` — the shared activation contract, tested once.
- `api/src/common/dto/toggle-active.dto.ts` — one DTO for every `PATCH active`, replacing `ToggleAboutActiveDto`.
- `api/src/bootstrap/backfill-page-activation.ts` — sets `isActive: true` on existing rows in the fifteen collections.
- `api/src/bootstrap/backfill-page-activation.spec.ts`

**API — modified**

- `api/src/common/schemas/hero-page.schema.ts` — gains `isActive`.
- `api/src/common/services/singleton-page.service.ts` — `get()` selects `+isActive`; gains `setActive()`.
- Twelve `*-page.controller.ts` (athletes, clubs, coaches, disciplines, news, records, results-rankings, albums, videos, board-members, committees, contact-us) — gain `PATCH active`.
- Three governance controllers/services/repositories (president-message, vision-mission, strategic-plans) — gain `PATCH :id/active` on the About pattern.
- `api/src/common/constants/permission-catalogue.ts` — fifteen `Publish` rows.
- `api/src/modules/federation-governance/about-federation-page/dto/toggle-about-active.dto.ts` — deleted, re-pointed at the shared DTO.

**Dashboard — new**

- `apps/dashboard/src/components/admin/activation/page-activation-bar.tsx` — moved from `about-federation/active-bar.tsx`, generalised.
- `apps/dashboard/src/components/admin/activation/page-activation-bar.spec.tsx` — moved from `active-bar.spec.tsx`.
- `apps/dashboard/src/components/admin/editorial-editor/editor-tabs.tsx` — the tablist, its keyboard behaviour, and the `?tab=` binding.
- `apps/dashboard/src/components/admin/editorial-editor/editor-tabs.spec.tsx`
- `apps/dashboard/src/components/admin/editorial-editor/seo-panel.tsx` — `SeoFields` plus the search-result preview.
- `apps/dashboard/src/components/admin/about-federation/section-rail.tsx` — the vertical section tablist (replaces `section-list.tsx`).
- `apps/dashboard/src/lib/admin/editor-tab.ts` — the tab vocabulary and URL reader, shared by shell and tests.
- `apps/dashboard/src/lib/admin/editor-tab.spec.ts`
- `apps/dashboard/src/app/api/admin/page-activation/[entity]/route.ts` — one BFF route for every activatable page.

**Dashboard — modified**

- `editor-shell.tsx` — header, activation slot, tabs, panels.
- `about-federation/editor.tsx` — vertical rail, `?section=`, readiness moved to the review tab.
- `president-message/editor.tsx` — converted onto `EditorShell` (it holds a hand copy today).
- `vision-mission/editor.tsx`, `strategic-plan/editor.tsx`, `news/article-editor.tsx` — SEO moves to its tab.
- `pages/page-workbench.tsx` — activation bar in the selected page's header.
- `messages/ar.json`, `messages/en.json` — new keys under `Activation`, `EditorTabs`, `Seo`.

**Web — new**

- `apps/web/src/components/pages/page-inactive-screen.tsx` — the shared "in preparation" screen, taking its copy from `maintenanceMessage`.
- `apps/web/src/components/pages/page-inactive-screen.spec.tsx`
- `apps/web/src/lib/pages/activation.ts` — `isServed(record)` and the metadata/sitemap gate.
- `apps/web/src/lib/pages/activation.spec.ts`

**Web — modified**

- `components/pages/static-page-screen.tsx` — `loadStaticPage` reports `isActive`; the twelve routes gate on it.
- `components/pages/about/inactive-screen.tsx` — re-pointed at the shared screen.
- Three governance routes + `sitemap.ts` + `lib/pages/indexability.ts`.

---

## Task 1: ADR-0102

**Files:**
- Create: `docs/design-system/ADR-0102-Editor-Shell-Tabs-And-Page-Level-Activation.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the decision ids `D1`–`D7` every later task's code comments cite.

- [ ] **Step 1: Write the ADR**

Seven decisions, in the table-then-sections format of ADR-0101:

- **D1 — The shell's panels become tabs.** Amends ADR-0075's layout half only: status, review, versions and SEO leave the page's vertical flow and become sibling panels under one `role="tablist"`. The composition lock on the *public* page is untouched.
- **D2 — Page visibility is a field on the page's own record**, not a separate module. `page-visibility` was removed by owner decision; the replacement is `isActive` where the page already lives.
- **D3 — `default: true`, with a backfill.** New rows are served; existing rows are made served explicitly, because Mongoose does not apply a default to a document that already exists. About is the one exception at `default: false` — its page was never live.
- **D4 — `select: false`, and why.** `RevisionsService.snapshotOf` freezes what a plain `.lean()` returns and `PublishingService.restore` writes a snapshot back over the row. An ordinary field would make "restore last month's wording" also mean "restore last month's live state". Three of the fifteen collections carrying this field are workflow-governed, so the exclusion is on the shared field rather than special-cased.
- **D5 — The withheld-page copy comes from `siteSettings.maintenanceMessage`**, bilingual, with `Preparing.status` as the fallback. No per-page message field: a second place to write the same sentence is a second place for it to go stale.
- **D6 — The homepage is out of scope.** `pages.status` is not a public routing source: the collection holds one row (`slug: "home"`) as the anchor for `pageSections`, `Draft` renders an *empty* homepage rather than an in-preparation one, and the same `Draft` makes the dashboard's own homepage section editor report `noHomePage`. Owner decision 2026-09-26: leave both meanings alone.
- **D7 — Propagation is the public cache window, not a revalidation call.** `apps/dashboard` and `apps/web` are separate Next applications; `revalidatePath` in the dashboard invalidates the dashboard. The switch takes effect upstream at once and reaches visitors within `PUBLIC_REVALIDATE_SECONDS`.

Record **PENDING FIGMA BACK-SYNC** for: the tab header, the four panels, the vertical section rail, and the withheld-page screen — the canvas at `docs/design-specs/about/about-admin-tabs.design.html` is the approved source and no Figma frame exists for these states.

- [ ] **Step 2: Cross-reference it**

Add a line to `docs/design-system/ADR-0075-*.md`'s amendments list naming ADR-0102 §D1, and to `docs/engineering/about-federation-page.md` naming §D1 and §D2.

- [ ] **Step 3: Commit**

```bash
git add docs/design-system/ADR-0102-Editor-Shell-Tabs-And-Page-Level-Activation.md docs/design-system/ADR-0075-Page-Composition-Lock.md docs/engineering/about-federation-page.md
git commit -m "docs(adr): ADR-0102 — editor shell tabs and page-level activation"
```

---

## Task 2: `isActive` on the shared hero schema, with a backfill

**Files:**
- Modify: `api/src/common/schemas/hero-page.schema.ts`
- Create: `api/src/bootstrap/backfill-page-activation.ts`
- Test: `api/src/bootstrap/backfill-page-activation.spec.ts`

**Interfaces:**
- Produces: `HeroPageSchema.isActive: boolean`; `backfillPageActivation(connection): Promise<Record<string, number>>` returning the modified count per collection.

- [ ] **Step 1: Write the failing test**

`api/src/bootstrap/backfill-page-activation.spec.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { model, Schema, connect, connection, Types } from 'mongoose';
import { backfillPageActivation, ACTIVATABLE_COLLECTIONS } from './backfill-page-activation.js';

describe('backfillPageActivation', () => {
  it('names every collection that carries the shared activation field', () => {
    // Fifteen extend HeroPageSchema; aboutFederationPage is deliberately absent
    // (it declares its own isActive at default:false and was never live).
    expect(ACTIVATABLE_COLLECTIONS).toHaveLength(15);
    expect(ACTIVATABLE_COLLECTIONS).not.toContain('aboutFederationPage');
  });

  it('sets isActive true on a row written before the field existed', async () => {
    // A row inserted with no isActive key at all — what every existing
    // singleton looks like. Without the backfill it reads back as undefined,
    // the public gate gives false, and the page goes dark.
    const before = await connection.collection('athletesPage').insertOne({
      heroTitle: { ar: 'الرياضيون', en: 'Athletes' },
      heroSubtitle: { ar: 'س', en: 's' },
      archivedAt: null,
    });

    const counts = await backfillPageActivation(connection);

    expect(counts.athletesPage).toBe(1);
    const row = await connection.collection('athletesPage').findOne({ _id: before.insertedId });
    expect(row?.isActive).toBe(true);
  });

  it('leaves a row that already has the field alone', async () => {
    const off = await connection.collection('clubsPage').insertOne({
      heroTitle: { ar: 'الأندية', en: 'Clubs' },
      heroSubtitle: { ar: 'س', en: 's' },
      isActive: false,
      archivedAt: null,
    });

    const counts = await backfillPageActivation(connection);

    expect(counts.clubsPage).toBe(0);
    const row = await connection.collection('clubsPage').findOne({ _id: off.insertedId });
    // An editor who switched a page off must not have that undone by a migration.
    expect(row?.isActive).toBe(false);
  });

  it('does not move updatedAt', async () => {
    const stamp = new Date('2026-01-01T00:00:00.000Z');
    const created = await connection.collection('recordsPage').insertOne({
      heroTitle: { ar: 'الأرقام', en: 'Records' },
      heroSubtitle: { ar: 'س', en: 's' },
      archivedAt: null,
      updatedAt: stamp,
    });

    await backfillPageActivation(connection);

    const row = await connection.collection('recordsPage').findOne({ _id: created.insertedId });
    // `publishDirect` uses updatedAt for optimistic concurrency; a migration
    // that bumps it invalidates every open editor's expectedUpdatedAt.
    expect(row?.updatedAt).toEqual(stamp);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd api && npx jest --runInBand src/bootstrap/backfill-page-activation.spec.ts`
Expected: FAIL — `Cannot find module './backfill-page-activation.js'`.

- [ ] **Step 3: Add the field**

In `api/src/common/schemas/hero-page.schema.ts`, inside `HeroPageSchema`:

```ts
  /**
   * Whether this page is served at its URL at all. `false` shows visitors an
   * "in preparation" page in place of the content, at the same address
   * (ADR-0102 §D2).
   *
   * Operational state, not content: changed outside the review cycle, under
   * the page's `Publish` grant, and in effect at once.
   *
   * `default: true` because these pages are already live — a new row is a page
   * an editor has just filled in, and there is no state in which the correct
   * answer is "saved but withheld by default". Existing rows predate the field
   * and carry no default, which is what `backfillPageActivation` is for
   * (ADR-0102 §D3).
   *
   * `select: false` because three of the fifteen collections that extend this
   * schema are workflow-governed. `RevisionsService.snapshotOf` freezes what a
   * plain `.lean()` read returns and `PublishingService.restore` writes a
   * snapshot straight back over the row — so an ordinary field here would mean
   * restoring last month's wording also restored last month's live state,
   * taking a published page off the site with nobody asking (ADR-0102 §D4).
   * Readers that want it ask by name: `.select('+isActive')`.
   */
  @Prop({ type: Boolean, default: true, select: false })
  isActive: boolean;
```

- [ ] **Step 4: Write the backfill**

`api/src/bootstrap/backfill-page-activation.ts`:

```ts
import type { Connection } from 'mongoose';

/**
 * Every collection carrying the activation field from `HeroPageSchema`.
 *
 * Written out rather than derived from the connection's models, because this
 * runs as a migration: it must name the collections it intends to touch, and a
 * list that changes with whatever modules happen to be registered is not a
 * migration you can read before running.
 *
 * `aboutFederationPage` is absent: it declares its own `isActive` at
 * `default: false` and has never been live, so there is nothing to preserve.
 */
export const ACTIVATABLE_COLLECTIONS = [
  'athletesPage',
  'clubsPage',
  'coachesPage',
  'disciplinesPage',
  'newsPage',
  'recordsPage',
  'resultsRankingsPage',
  'albumsPage',
  'videosPage',
  'boardMembersPage',
  'committeesPage',
  'contactUsPage',
  'presidentMessagePage',
  'visionMissionPage',
  'strategicPlansPage',
] as const;

/**
 * Makes every existing page explicitly served.
 *
 * Mongoose applies `default: true` when it creates a document, never to one
 * that is already stored — so without this every page written before the field
 * reads back `undefined`, the public gate sees "not true", and fifteen live
 * pages go dark at once.
 *
 * `$set` with `isActive: { $exists: false }` rather than a blanket write: an
 * editor who has already switched a page off must not have that undone.
 * `timestamps: false` because `updatedAt` is load-bearing — `publishDirect`
 * uses it for optimistic concurrency, so a migration that moves it invalidates
 * every open editor's `expectedUpdatedAt`.
 */
export const backfillPageActivation = async (
  connection: Connection,
): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};

  for (const name of ACTIVATABLE_COLLECTIONS) {
    const result = await connection
      .collection(name)
      .updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
    counts[name] = result.modifiedCount;
  }

  return counts;
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd api && npx jest --runInBand src/bootstrap/backfill-page-activation.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Type-check**

Run: `cd api && npx tsc --noEmit`
Expected: no output. (Never `nest build` while a watch server is running — memory: `reference_nest_build_kills_watch_server`.)

- [ ] **Step 7: Commit**

```bash
git add api/src/common/schemas/hero-page.schema.ts api/src/bootstrap/backfill-page-activation.ts api/src/bootstrap/backfill-page-activation.spec.ts
git commit -m "feat(api): page activation field on the shared hero schema, with a backfill"
```

---

## Task 3: The activation read and write, once

**Files:**
- Modify: `api/src/common/services/singleton-page.service.ts`
- Create: `api/src/common/dto/toggle-active.dto.ts`
- Test: `api/src/common/services/singleton-page.service.spec.ts`

**Interfaces:**
- Consumes: `HeroPageSchema.isActive` (Task 2).
- Produces: `SingletonPageService.get(): Promise<TDoc | null>` now carrying `isActive`; `SingletonPageService.setActive(isActive: boolean, updatedBy: Types.ObjectId): Promise<TDoc>`; `ToggleActiveDto { isActive: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, jest } from '@jest/globals';
import { Types } from 'mongoose';
import { SingletonPageService } from './singleton-page.service.js';

interface Row { _id: Types.ObjectId; isActive?: boolean }

class Probe extends SingletonPageService<Row> {
  constructor(repository: never) { super(repository); }
}

const repo = (row: Row | null) => ({
  findOneWithActivation: jest.fn(async () => row),
  updateById: jest.fn(async (_id: string, update: Record<string, unknown>) => ({
    ...(row as Row),
    ...((update as { $set: Partial<Row> }).$set),
  })),
});

describe('SingletonPageService activation', () => {
  it('reads the row with the excluded field asked for by name', async () => {
    const row = { _id: new Types.ObjectId(), isActive: false };
    const repository = repo(row);
    const service = new Probe(repository as never);

    await expect(service.get()).resolves.toEqual(row);
    // `select: false` means an ordinary findOne cannot see it.
    expect(repository.findOneWithActivation).toHaveBeenCalled();
  });

  it('refuses to switch a page that has never been saved', async () => {
    const service = new Probe(repo(null) as never);
    await expect(service.setActive(true, new Types.ObjectId())).rejects.toThrow(/not been saved/i);
  });

  it('writes the switch and the actor, and nothing else', async () => {
    const row = { _id: new Types.ObjectId(), isActive: true };
    const repository = repo(row);
    const actor = new Types.ObjectId();

    const updated = await new Probe(repository as never).setActive(false, actor);

    expect(updated.isActive).toBe(false);
    expect(repository.updateById).toHaveBeenCalledWith(row._id.toString(), {
      $set: { isActive: false, updatedBy: actor },
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd api && npx jest --runInBand src/common/services/singleton-page.service.spec.ts`
Expected: FAIL — `service.setActive is not a function`.

- [ ] **Step 3: Add `findOneWithActivation` to `BaseRepository`**

In `api/src/common/repositories/base.repository.ts`:

```ts
  /** The one row, with a `select: false` field asked for by name. Separate
   *  from `findOne` so the exclusion stays the default everywhere else —
   *  widening `findOne` would put the field into every snapshot the workflow
   *  freezes (ADR-0102 §D4). */
  async findOneWithActivation(filter: QueryFilter<T> = {}): Promise<T | null> {
    return this.model
      .findOne({ ...filter, archivedAt: null } as QueryFilter<T>)
      .select('+isActive')
      .exec();
  }
```

- [ ] **Step 4: Add the service methods**

In `SingletonPageService`, replace `get()` and add `setActive()`:

```ts
  /** The single row for this collection, or `null` before it is first set.
   *  Carries `isActive`, which an ordinary read excludes. */
  async get(): Promise<TDoc | null> {
    return this.repository.findOneWithActivation();
  }

  /**
   * Switches the page on or off for visitors, at once.
   *
   * Outside the review cycle and gated on the page's `Publish` grant, not
   * `Update`: taking a live page down is an operational act that cannot wait
   * for an approval, and putting one up is a decision taken after the words
   * were already approved (ADR-0102 §D2).
   *
   * The returned document carries `_id`, which the audit-log interceptor needs
   * to record the write at all — a response without one leaves the change
   * untraceable.
   */
  async setActive(isActive: boolean, updatedBy: Types.ObjectId): Promise<TDoc> {
    const existing = await this.repository.findOneWithActivation();
    if (!existing) {
      throw new NotFoundException('This page has not been saved yet, so it cannot be switched.');
    }
    const id = (existing as unknown as { _id: Types.ObjectId })._id.toString();
    const updated = await this.repository.updateById(id, {
      $set: { isActive, updatedBy },
    } as UpdateQuery<TDoc>);
    return updated ?? existing;
  }
```

- [ ] **Step 5: Write the shared DTO**

`api/src/common/dto/toggle-active.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * The body of every `PATCH …/active` — one field, and deliberately nothing
 * else.
 *
 * Switching a page off is not an edit, and this route must not become a way to
 * smuggle one past the review the content goes through. A body with any other
 * key is refused by the global pipe's `forbidNonWhitelisted`.
 *
 * One DTO for fifteen routes rather than fifteen copies: the shape is the same
 * everywhere, and fifteen copies is fifteen chances for one of them to grow a
 * second field.
 */
export class ToggleActiveDto {
  @ApiProperty({ description: 'True serves the page; false shows visitors the "in preparation" page.' })
  @IsBoolean()
  isActive: boolean;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd api && npx jest --runInBand src/common/services/singleton-page.service.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Point About's DTO at the shared one**

Delete `api/src/modules/federation-governance/about-federation-page/dto/toggle-about-active.dto.ts` and update its one importer (`about-federation-page.controller.ts`) to `ToggleActiveDto`.

- [ ] **Step 8: Run the About suite**

Run: `cd api && npx jest --runInBand src/modules/federation-governance/about-federation-page`
Expected: PASS, unchanged count.

- [ ] **Step 9: Commit**

```bash
git add api/src/common/services/singleton-page.service.ts api/src/common/services/singleton-page.service.spec.ts api/src/common/repositories/base.repository.ts api/src/common/dto/toggle-active.dto.ts api/src/modules/federation-governance/about-federation-page
git commit -m "feat(api): shared activation read/write on SingletonPageService"
```

---

## Task 4: `PATCH active` on the twelve hero pages

**Files:**
- Modify: twelve `api/src/modules/**/[name]-page.controller.ts`
- Modify: `api/src/common/constants/permission-catalogue.ts`
- Test: `api/src/common/constants/permission-catalogue.spec.ts` (existing, re-derives from source)
- Test: `api/src/modules/cms-page-composition/athletes-page/athletes-page.activation.spec.ts`

**Interfaces:**
- Consumes: `SingletonPageService.setActive`, `ToggleActiveDto` (Task 3).
- Produces: `PATCH /<page>-page/active` on twelve paths, each gated on `<resource>Page:Publish`, each answering the document.

- [ ] **Step 1: Write the failing test**

One integration spec on `athletesPage` as the representative — the other eleven are the same three lines and are covered by the catalogue spec plus the e2e matrix:

```ts
import { describe, expect, it } from '@jest/globals';
import { AthletesPageController } from './athletes-page.controller.js';

describe('PATCH /athletes-page/active', () => {
  it('is gated on Publish, not Update', () => {
    // Read off the decorator metadata rather than asserted in prose: the
    // permission is the whole security of the route.
    const meta = Reflect.getMetadata('permission', AthletesPageController.prototype.setActive);
    expect(meta).toEqual({ resourceType: 'athletesPage', action: 'Publish' });
  });
});
```

(If `@RequirePermission` stores metadata under a different key, read `permissions.decorator.ts` and use that key — the assertion is on the stored pair, not on the key's name.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd api && npx jest --runInBand src/modules/cms-page-composition/athletes-page`
Expected: FAIL — `setActive` is undefined on the prototype.

- [ ] **Step 3: Add the route to each of the twelve controllers**

The same four additions each time. For `athletes-page.controller.ts`:

```ts
import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
// …
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { ToggleActiveDto } from '../../../common/dto/toggle-active.dto.js';
import { Types } from 'mongoose';
```

and the method:

```ts
  /** Switches the page on or off for visitors, at once. No `:id` — this
   *  collection is a singleton (decision #8), so there is one row to switch and
   *  a path parameter would be a second way to name it. Gated on `Publish`, not
   *  `Update`: deciding what the public sees is a publishing decision
   *  (ADR-0102 §D2). */
  @Patch('active')
  @RequirePermission('athletesPage', 'Publish')
  setActive(@Body() dto: ToggleActiveDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.setActive(dto.isActive, new Types.ObjectId(user.userId));
  }
```

Repeat for `clubsPage`, `coachesPage`, `disciplinesPage`, `newsPage`, `recordsPage`, `resultsRankingsPage`, `albumsPage`, `videosPage`, `boardMembersPage`, `committeesPage`, `contactUsPage`, changing only the resource string.

- [ ] **Step 4: Add the catalogue rows**

Twelve rows in `permission-catalogue.ts`, each beside that resource's existing `Update` row, in the file's existing alphabetical position:

```ts
  { resourceType: 'albumsPage', action: 'Publish' },
```

with a comment at the first one:

```ts
  // `Publish` gates the switch that takes the page on and off the site
  // (ADR-0102 §D2). It gates no other route on these twelve: they are hero
  // wrappers with no review cycle, so there is nothing else to publish.
```

- [ ] **Step 5: Run the catalogue spec and the new one**

Run: `cd api && npx jest --runInBand src/common/constants/permission-catalogue.spec.ts src/modules/cms-page-composition/athletes-page`
Expected: PASS. The catalogue spec re-derives the list from the decorators, so a missed row fails here.

- [ ] **Step 6: Re-seed the grants**

Run: `cd api && npx tsx src/bootstrap-admin.ts` (or the package script that wraps it)
Expected: the twelve new permissions created and granted to the admin role. Without this every `PATCH active` is 403 for every existing operator (Review Focus 3).

- [ ] **Step 7: Type-check and commit**

```bash
cd api && npx tsc --noEmit
```

```bash
git add api/src/modules/cms-page-composition api/src/modules/federation-governance/board-members-page api/src/modules/federation-governance/committees-page api/src/modules/federation-governance/contact-us-page api/src/modules/media-center/albums-page api/src/modules/media-center/videos-page api/src/common/constants/permission-catalogue.ts
git commit -m "feat(api): activation switch on the twelve hero pages"
```

---

## Task 5: `PATCH :id/active` on the three governance pages

**Files:**
- Modify: `president-message-page`, `vision-mission-page`, `strategic-plans-page` — controller, service, repository
- Test: one `*.activation.spec.ts` per module

**Interfaces:**
- Consumes: `ToggleActiveDto` (Task 3), `HeroPageSchema.isActive` (Task 2).
- Produces: `PATCH /<page>/:id/active` on three paths, gated on `<entity>:Publish`, answering the document; `findByIdWithActivation` on each repository; `setActive(id, isActive, updatedBy)` on each service.

These three are workflow-governed and do **not** extend `SingletonPageService`, so they follow About's shape exactly.

- [ ] **Step 1: Write the failing test** (per module; `president-message-page` shown)

```ts
import { describe, expect, it, jest } from '@jest/globals';
import { Types } from 'mongoose';
import { PresidentMessagePagesService } from './president-message-page.service.js';

describe('PresidentMessagePagesService.setActive', () => {
  it('writes only the switch and the actor', async () => {
    const id = new Types.ObjectId();
    const actor = new Types.ObjectId();
    const repository = {
      updateById: jest.fn(async () => ({ _id: id, isActive: false })),
    };
    const service = new PresidentMessagePagesService(repository as never, {} as never, {} as never);

    const updated = await service.setActive(id.toString(), false, actor);

    expect(updated).toEqual({ _id: id, isActive: false });
    expect(repository.updateById).toHaveBeenCalledWith(id.toString(), {
      $set: { isActive: false, updatedBy: actor },
    });
  });
});
```

(Match the real constructor arity when writing this — read the service first.)

- [ ] **Step 2: Add the restore test — the load-bearing one**

Per module, in the same file:

```ts
  it('is not restored by restoring an old revision', async () => {
    // The whole reason the field is `select: false` (ADR-0102 §D4).
    // `RevisionsService.snapshotOf` reads through the model with no explicit
    // select, so a snapshot cannot contain the field, so `restore` cannot
    // write it back.
    const { PresidentMessagePageSchema } = await import('./schemas/president-message-page.schema.js');
    expect(PresidentMessagePageSchema.path('isActive').options.select).toBe(false);
  });
```

- [ ] **Step 3: Run to verify both fail**

Run: `cd api && npx jest --runInBand src/modules/federation-governance/president-message-page`
Expected: FAIL — `setActive` undefined.

- [ ] **Step 4: Add the repository read**

Per repository, copied from About's (which is the precedent this generalises):

```ts
  /** The row with the activation field asked for by name. `select: false`
   *  keeps it out of every other read, including the one the workflow's
   *  snapshot goes through (ADR-0102 §D4); the two callers that genuinely need
   *  it — the public read, which must know whether to serve the page, and the
   *  dashboard, which draws the switch — ask for it here. */
  async findByIdWithActivation(id: string): Promise<PresidentMessagePageDocument | null> {
    return this.model.findOne({ _id: id, archivedAt: null }).select('+isActive').exec();
  }
```

- [ ] **Step 5: Add the service method and wire the public read**

```ts
  /** Switches the page on or off for visitors, at once — outside the review
   *  cycle, under `Publish`. See the controller's note for the three ways this
   *  route is deliberately unlike every other write here. */
  async setActive(id: string, isActive: boolean, updatedBy: Types.ObjectId) {
    const updated = await this.repository.updateById(id, {
      $set: { isActive, updatedBy },
    } as UpdateQuery<PresidentMessagePageDocument>);
    if (!updated) {
      throw new NotFoundException('Page not found.');
    }
    return updated;
  }
```

and in the public projection, ahead of any content — the shape About already uses, so the withheld page leaks no draft:

```ts
    const record = await this.repository.findByIdWithActivation(entityId.toString());
    if (record?.isActive !== true) {
      return { isActive: false };
    }
```

- [ ] **Step 6: Add the controller route**

```ts
  /** Switches the finished page on or off for visitors, at once.
   *
   * Three things make this route unlike every other write here: it does not go
   * through the review cycle, it is gated on `Publish` rather than `Update`,
   * and it is allowed while a review holds the draft — the switch governs the
   * version already live, and a page must not be un-takeable-down because
   * someone happens to be editing it. See ADR-0102 §D2.
   *
   * The response carries the document, and so `_id`: the audit-log interceptor
   * records a write only when it can name the record. */
  @Patch(':id/active')
  @RequirePermission('presidentMessagePage', 'Publish')
  setActive(
    @Param('id') id: string,
    @Body() dto: ToggleActiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setActive(id, dto.isActive, new Types.ObjectId(user.userId));
  }
```

- [ ] **Step 7: Add three catalogue rows**

`presidentMessagePage:Publish` already exists (it publishes). Verify with:

Run: `cd api && grep -n "presidentMessagePage\|visionMissionPage\|strategicPlansPage" src/common/constants/permission-catalogue.ts`
Add only the rows that are missing.

- [ ] **Step 8: Run the three module suites**

Run: `cd api && npx jest --runInBand src/modules/federation-governance/president-message-page src/modules/federation-governance/vision-mission-page src/modules/federation-governance/strategic-plans-page`
Expected: PASS.

- [ ] **Step 9: Type-check and commit**

```bash
cd api && npx tsc --noEmit
```

```bash
git add api/src/modules/federation-governance/president-message-page api/src/modules/federation-governance/vision-mission-page api/src/modules/federation-governance/strategic-plans-page api/src/common/constants/permission-catalogue.ts
git commit -m "feat(api): activation switch on the three workflow governance pages"
```

---

## Task 6: `PageActivationBar` — one component, every screen

**Files:**
- Create: `apps/dashboard/src/components/admin/activation/page-activation-bar.tsx`
- Create: `apps/dashboard/src/components/admin/activation/page-activation-bar.spec.tsx`
- Create: `apps/dashboard/src/app/api/admin/page-activation/[entity]/route.ts`
- Create: `apps/dashboard/src/lib/admin/activatable-pages.ts`
- Delete: `apps/dashboard/src/components/admin/about-federation/active-bar.tsx`, `active-bar.spec.tsx`
- Modify: `messages/ar.json`, `messages/en.json`

**Interfaces:**
- Consumes: the API routes from Tasks 4 and 5.
- Produces:

```ts
export interface PageActivationBarProps {
  /** The registry key in `ACTIVATABLE_PAGES`. */
  entity: string;
  /** Null for a singleton page; the row id for a workflow-governed one. */
  recordId: string | null;
  isActive: boolean;
  /** `<entity>:Publish`. Without it the bar states the condition and offers
   *  no control. */
  canPublish: boolean;
  /** False before the page has ever been saved — there is nothing to switch. */
  saved?: boolean;
}
export const PageActivationBar: (props: PageActivationBarProps) => JSX.Element;
```

- [ ] **Step 1: Write the failing test**

Move `active-bar.spec.tsx` to the new path and rename its subject, then add the two cases the generalisation introduces:

```tsx
  it("offers no control, and no explanation of a control, without the grant", () => {
    render(<Bar entity="athletesPage" recordId={null} isActive canPublish={false} />);
    // A disabled control is an invitation to find out why (the reason the
    // About bar states the condition instead).
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(/نشطة/);
  });

  it("sends the singleton path when there is no record id", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Bar entity="athletesPage" recordId={null} isActive canPublish />);

    await userEvent.click(screen.getByRole("button", { name: /إيقاف/ }));
    await userEvent.click(screen.getByRole("button", { name: /تأكيد|إيقاف الصفحة/ }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/page-activation/athletesPage",
      expect.objectContaining({ method: "PATCH" }),
    );
    // Read at the moment of the request, not captured when the dialog opened
    // (CLAUDE.md §31).
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ isActive: false });
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/dashboard && npx vitest run src/components/admin/activation --pool=threads`
Expected: FAIL — module not found. (`--pool=threads` — forks time out under this machine's RAM; memory `reference_vitest_forks_timeout_memory`.)

- [ ] **Step 3: Move and generalise the component**

Copy `about-federation/active-bar.tsx` to `activation/page-activation-bar.tsx` verbatim, then make exactly these changes and no others — the visual result must be identical for About:

1. `ActiveBar` → `PageActivationBar`; props as in **Interfaces** above.
2. `useTranslations("AboutFederation")` → `useTranslations("Activation")`, and every `t("active.x")` → `t("x")`.
3. The request target becomes `/api/admin/page-activation/${entity}` with body `{ recordId, isActive: !isActive }` — `recordId` omitted when null.
4. `dedupeKey: "aboutFederationPage:active"` → `` `${entity}:active` ``.
5. When `saved === false`, render the status line and the sentence `t("notSavedYet")` in place of the button.

Keep the whole comment block: the three reasons (not part of the form, absent rather than disabled, why there is a dialog) are the component's rationale and they generalise unchanged.

- [ ] **Step 4: Write the registry**

`apps/dashboard/src/lib/admin/activatable-pages.ts`:

```ts
/**
 * Which pages the activation route may switch, and how each one is addressed
 * upstream.
 *
 * This registry is the security boundary of the generic activation route, in
 * the same sense `editorial-entities.ts` is for the editorial one: the route's
 * URL carries an entity name, and without a closed list to resolve it against
 * the caller would be choosing which upstream endpoint their body reaches.
 *
 * `shape` is the difference between the two families. A hero page is a
 * singleton — one row, no `:id`, `PATCH /<path>/active`. A workflow-governed
 * page has many rows and takes the id — `PATCH /<path>/:id/active`.
 */
export type ActivationShape = "singleton" | "byId";

export interface ActivatablePage {
  /** Also the `resourceType` whose `Publish` grant gates the switch. */
  entity: string;
  apiPath: string;
  shape: ActivationShape;
}

export const ACTIVATABLE_PAGES: readonly ActivatablePage[] = [
  { entity: "newsPage", apiPath: "/news-page", shape: "singleton" },
  { entity: "athletesPage", apiPath: "/athletes-page", shape: "singleton" },
  { entity: "clubsPage", apiPath: "/clubs-page", shape: "singleton" },
  { entity: "coachesPage", apiPath: "/coaches-page", shape: "singleton" },
  { entity: "disciplinesPage", apiPath: "/disciplines-page", shape: "singleton" },
  { entity: "recordsPage", apiPath: "/records-page", shape: "singleton" },
  { entity: "resultsRankingsPage", apiPath: "/results-rankings-page", shape: "singleton" },
  { entity: "albumsPage", apiPath: "/albums-page", shape: "singleton" },
  { entity: "videosPage", apiPath: "/videos-page", shape: "singleton" },
  { entity: "boardMembersPage", apiPath: "/board-members-page", shape: "singleton" },
  { entity: "committeesPage", apiPath: "/committees-page", shape: "singleton" },
  { entity: "contactUsPage", apiPath: "/contact-us-page", shape: "singleton" },
  { entity: "presidentMessagePage", apiPath: "/president-message-page", shape: "byId" },
  { entity: "visionMissionPage", apiPath: "/vision-mission-page", shape: "byId" },
  { entity: "strategicPlansPage", apiPath: "/strategic-plans-page", shape: "byId" },
  { entity: "aboutFederationPage", apiPath: "/about-federation-page", shape: "byId" },
];

export const findActivatablePage = (entity: string): ActivatablePage | undefined =>
  ACTIVATABLE_PAGES.find((page) => page.entity === entity);
```

- [ ] **Step 5: Write the BFF route**

`apps/dashboard/src/app/api/admin/page-activation/[entity]/route.ts` — the shape of the existing `about-federation/active/route.ts`, resolving through the registry:

```ts
import { NextResponse } from "next/server";
import { forwardWrite } from "@/lib/api/admin-write";
import { findActivatablePage } from "@/lib/admin/activatable-pages";

/**
 * Switches one page on or off for visitors.
 *
 * A route of its own rather than an editorial action, because it is not one:
 * the editorial handler forwards saves and review decisions, and this touches
 * no draft, opens and closes no review, and takes effect the moment it lands.
 *
 * The body is rebuilt here from one boolean rather than forwarded as sent.
 * Upstream refuses the whole request over a single unexpected key
 * (`forbidNonWhitelisted`), and a handler that passes a caller's object
 * through is a handler whose contract is whatever the caller types.
 */
export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) => {
  const page = findActivatablePage((await params).entity);
  if (!page) {
    return NextResponse.json({ code: "notFound" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  const { recordId, isActive } = (body ?? {}) as { recordId?: unknown; isActive?: unknown };
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }

  if (page.shape === "singleton") {
    return forwardWrite(`${page.apiPath}/active`, { method: "PATCH", body: { isActive } });
  }

  if (typeof recordId !== "string" || recordId.length === 0) {
    return NextResponse.json({ code: "invalidRequest" }, { status: 400 });
  }
  return forwardWrite(`${page.apiPath}/${encodeURIComponent(recordId)}/active`, {
    method: "PATCH",
    body: { isActive },
  });
};
```

Delete `apps/dashboard/src/app/api/admin/about-federation/active/route.ts` and point About at the shared one.

- [ ] **Step 6: Move the copy**

Move the ten `AboutFederation.active.*` keys in `messages/ar.json` and `messages/en.json` to a top-level `Activation` namespace, dropping the `active.` prefix, and add `notSavedYet`:

```json
"Activation": {
  "onTitle": "الصفحة نشطة على الموقع",
  "offTitle": "الصفحة موقوفة",
  "onNote": "الزوار يشاهدون آخر نسخة منشورة. الإيقاف فوري ولا يمر على الموافقة.",
  "offNote": "الزوار يشاهدون صفحة «قيد الإعداد» على نفس الرابط.",
  "notSavedYet": "لم تُحفظ هذه الصفحة بعد، فلا شيء يمكن تشغيله.",
  …
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd apps/dashboard && npx vitest run src/components/admin/activation src/lib/admin/activatable-pages --pool=threads`
Expected: PASS.

- [ ] **Step 8: Run the whole dashboard suite and type-check**

Run: `cd apps/dashboard && npx vitest run --pool=threads && npx tsc --noEmit`
Expected: PASS, no type errors. The About screen's own tests will name `ActiveBar` — update the selectors, never weaken an assertion.

- [ ] **Step 9: Commit**

```bash
git add apps/dashboard/src/components/admin/activation apps/dashboard/src/lib/admin/activatable-pages.ts apps/dashboard/src/app/api/admin/page-activation apps/dashboard/src/components/admin/about-federation apps/dashboard/messages
git rm -r apps/dashboard/src/app/api/admin/about-federation/active
git commit -m "refactor(dashboard): one PageActivationBar for every page screen"
```

---

## Task 7: `EditorShell` — header and four tabs

**Files:**
- Modify: `apps/dashboard/src/components/admin/editorial-editor/editor-shell.tsx`
- Create: `apps/dashboard/src/components/admin/editorial-editor/editor-tabs.tsx`
- Create: `apps/dashboard/src/components/admin/editorial-editor/editor-tabs.spec.tsx`
- Create: `apps/dashboard/src/components/admin/editorial-editor/seo-panel.tsx`
- Create: `apps/dashboard/src/lib/admin/editor-tab.ts`
- Create: `apps/dashboard/src/lib/admin/editor-tab.spec.ts`

**Interfaces:**
- Consumes: `PageActivationBar` (Task 6); the existing `EditorialStatusPanel`, `EditorialRevisionsPanel`, `SeoFields`.
- Produces:

```ts
export const EDITOR_TABS = ["content", "review", "history", "seo"] as const;
export type EditorTab = (typeof EDITOR_TABS)[number];
/** The tab named in `?tab=`, or "content" for an absent or unknown value. */
export const readEditorTab: (value: string | null, available: readonly EditorTab[]) => EditorTab;
```

and on `EditorShell`, in addition to today's props:

```ts
  /** Drawn in the header, under the title row. Absent where the page has no
   *  activation switch. */
  activation?: ReactNode;
  /** The breadcrumb trail and the page's own title, for the sticky header. */
  heading: { trail: { label: string; href?: string }[]; title: string };
  /** The content tab. Same signature as today's `children`. */
  children: (state: EditorShellState) => ReactNode;
  /** The SEO tab. Absent where the page has no SEO fields. */
  seo?: (state: EditorShellState) => ReactNode;
  /** Notices the review tab lists under "before submitting". Selecting one
   *  calls `onGoToField`, which the page uses to open and focus the field. */
  notices?: readonly EditorNotice[];
  onGoToField?: (field: string) => void;
```

- [ ] **Step 1: Write the failing test for the tab vocabulary**

`editor-tab.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readEditorTab } from "./editor-tab";

describe("readEditorTab", () => {
  it("opens the tab named in the URL", () => {
    expect(readEditorTab("history", ["content", "review", "history", "seo"])).toBe("history");
  });

  it("falls back to content for an unknown name", () => {
    // A stale bookmark must open the editor, not an empty frame.
    expect(readEditorTab("versions", ["content", "review"])).toBe("content");
  });

  it("falls back to content for a tab this page does not offer", () => {
    // `?tab=seo` on a page with no SEO fields.
    expect(readEditorTab("seo", ["content", "review"])).toBe("content");
  });

  it("falls back to content for an absent value", () => {
    expect(readEditorTab(null, ["content"])).toBe("content");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/dashboard && npx vitest run src/lib/admin/editor-tab --pool=threads`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the vocabulary**

```ts
/**
 * The four panels a page editor can offer, in the order the tablist draws
 * them (`docs/design-specs/about/about-admin-tabs.design.html`).
 *
 * `content` is always present; the other three appear only where the page
 * supplies what they show. A tab that is present and empty is worse than an
 * absent one — it tells a reader something is there.
 */
export const EDITOR_TABS = ["content", "review", "history", "seo"] as const;
export type EditorTab = (typeof EDITOR_TABS)[number];

/**
 * The tab `?tab=` names, or `content`.
 *
 * Checked against what this page actually offers, not just against the
 * vocabulary: `?tab=seo` on a page with no SEO fields would otherwise open an
 * empty frame, and a stale bookmark is the ordinary way that happens.
 */
export const readEditorTab = (value: string | null, available: readonly EditorTab[]): EditorTab => {
  const named = EDITOR_TABS.find((tab) => tab === value);
  return named && available.includes(named) ? named : "content";
};
```

- [ ] **Step 4: Write the failing test for the tablist**

`editor-tabs.spec.tsx` — the keyboard contract is the part worth pinning, and the RTL arrow direction is the part that gets it wrong:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditorTabs } from "./editor-tabs";

const tabs = [
  { id: "content", label: "المحتوى" },
  { id: "review", label: "المراجعة والنشر", count: 5 },
  { id: "history", label: "الإصدارات والسجل", count: 21 },
] as const;

const setup = (selected = "content") => {
  const onSelect = vi.fn();
  render(<EditorTabs tabs={tabs} selected={selected} onSelect={onSelect} label="أقسام الإدارة" />);
  return onSelect;
};

describe("EditorTabs", () => {
  it("moves to the NEXT tab on ArrowLeft in RTL", async () => {
    // The whole reason this is tested: in RTL the next tab is to the left, and
    // `element.dir` reads "" so the direction has to be resolved from the
    // computed style (memory: reference_rtl_scroll_and_inline_block).
    const onSelect = setup("content");
    screen.getByRole("tab", { name: "المحتوى" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onSelect).toHaveBeenCalledWith("review");
  });

  it("moves to the PREVIOUS tab on ArrowRight in RTL", async () => {
    const onSelect = setup("review");
    screen.getByRole("tab", { name: "المراجعة والنشر" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenCalledWith("content");
  });

  it("wraps at both ends, and honours Home and End", async () => {
    const onSelect = setup("content");
    screen.getByRole("tab", { name: "المحتوى" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenCalledWith("history");
    await userEvent.keyboard("{End}");
    expect(onSelect).toHaveBeenCalledWith("history");
    await userEvent.keyboard("{Home}");
    expect(onSelect).toHaveBeenCalledWith("content");
  });

  it("keeps exactly one tab in the tab order", () => {
    setup("review");
    const stops = screen.getAllByRole("tab").filter((tab) => tab.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAccessibleName("المراجعة والنشر");
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `cd apps/dashboard && npx vitest run src/components/admin/editorial-editor/editor-tabs --pool=threads`
Expected: FAIL — module not found.

- [ ] **Step 6: Write the tablist**

Implement `EditorTabs` with:
- `role="tablist"`, `aria-label` from the prop.
- Each button `role="tab"`, `aria-selected`, `aria-controls` pointing at its panel's id, `id` the panel's `aria-labelledby`.
- `tabIndex={selected ? 0 : -1}` — one tab stop for the whole list (WAI-ARIA tabs pattern).
- `onKeyDown`: `ArrowLeft`/`ArrowRight` resolved through `getComputedStyle(list).direction === "rtl"` so RTL moves forward on `ArrowLeft`; `Home`/`End`; wrapping at both ends.
- The count badge only when `count` is given, with the warning tone for `review` and the muted tone for `history`, both from existing semantic tokens.
- Horizontal scroll on narrow viewports: `overflow-x-auto` on the list with `scrollbar-width: thin`, and `flex-shrink-0` on each tab — the design spec's mobile behaviour.

- [ ] **Step 7: Write the failing test for the shell**

`editor-shell.spec.tsx` — the draft-survives-a-tab-switch case (Review Focus 4):

```tsx
  it("keeps a typed value across a tab switch and back", async () => {
    render(<Harness />);

    await userEvent.type(screen.getByLabelText("العنوان"), "محطات");
    await userEvent.click(screen.getByRole("tab", { name: /الإصدارات/ }));
    await userEvent.click(screen.getByRole("tab", { name: /المحتوى/ }));

    // The draft lives above the shell, so the panel unmounting cannot take it.
    expect(screen.getByLabelText("العنوان")).toHaveValue("محطات");
  });

  it("offers no tab whose content the page did not supply", () => {
    render(<Harness seo={undefined} editorial={null} />);
    expect(screen.queryByRole("tab", { name: /SEO/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /المراجعة/ })).toBeNull();
  });
```

- [ ] **Step 8: Rebuild the shell**

Replace the two-column grid with:

1. **A sticky header** (`sticky top-0 z-20`), holding: the breadcrumb `<nav><ol>`; an `<h1>` with the title; the two state chips (`Live · الإصدار N` from `editorial.publicationState` and the revision count, `مسودة · N تغييرات` from `dirty` and the blocker count); the "حُفظت منذ…" relative time from `editorial.updatedAt` via `useFormatter().relativeTime`; and the action group — preview link, Save, and the primary action with its notice count.
2. **The activation slot**, directly under the title row: `{activation}`.
3. **`EditorTabs`**, with `available` computed as `["content", ...(editorial ? ["review"] : []), ...(entityId ? ["history"] : []), ...(seo ? ["seo"] : [])]`.
4. **Four panels**, each `role="tabpanel"` with `aria-labelledby` its tab's id, rendered conditionally — **not** with `hidden`.

   Conditional rendering, and the reason belongs in the file:

   ```tsx
   /*
     One panel in the DOM at a time, rather than four with `hidden`.
     Every field on every panel is controlled from state the *page* holds,
     above this component — so unmounting a panel cannot lose a value, and
     the test above pins that. Four mounted panels would instead put four
     copies of the page's controls in the accessibility tree and in the tab
     order, which `hidden` mitigates but does not make free: the versions
     table would fetch on every page open whether or not anyone looked at it.
   */
   ```
5. **The tab in the URL**: `useSearchParams()` to read, `router.replace(…, { scroll: false })` to write. `replace`, not `push` — a tab is a view of one record, and filling the back stack with four of them makes Back stop meaning "leave this record".

- [ ] **Step 9: Write the SEO panel**

`seo-panel.tsx` — the existing `SeoFields` in the left column, and the search-result preview on the right, at `1.4fr / 1fr` from `lg`. The preview is a white card with the URL, the title in `#1A0DAB`, and the description — the three lines a result actually shows, taken from the draft. Character counts (`45 / 60`) under each field, from the design spec.

- [ ] **Step 10: Run the tests and type-check**

Run: `cd apps/dashboard && npx vitest run src/components/admin/editorial-editor src/lib/admin/editor-tab --pool=threads && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/dashboard/src/components/admin/editorial-editor apps/dashboard/src/lib/admin/editor-tab.ts apps/dashboard/src/lib/admin/editor-tab.spec.ts apps/dashboard/messages
git commit -m "feat(dashboard): tabbed EditorShell with a sticky header and an activation slot"
```

---

## Task 8: About — the vertical section rail

**Files:**
- Create: `apps/dashboard/src/components/admin/about-federation/section-rail.tsx`
- Delete: `apps/dashboard/src/components/admin/about-federation/section-list.tsx`
- Modify: `apps/dashboard/src/components/admin/about-federation/editor.tsx`

**Interfaces:**
- Consumes: `EditorShell`'s new props (Task 7), `readinessOf` (existing).
- Produces: `SectionRail` with `role="tablist" aria-orientation="vertical"`, and `?section=` on the About screen.

- [ ] **Step 1: Write the failing test**

```tsx
  it("changes the switch without changing the selection", async () => {
    const onSelect = vi.fn();
    const onToggle = vi.fn();
    render(<SectionRail … onSelect={onSelect} onToggle={onToggle} selected="hero" />);

    await userEvent.click(screen.getByRole("switch", { name: /إظهار القصة/ }));

    // The switch is a sibling of the tab, not inside it — clicking it must not
    // navigate the reader away from the section they are editing.
    expect(onToggle).toHaveBeenCalledWith("story", false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks the rail as a vertical tablist", () => {
    render(<SectionRail … />);
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("gives the two automatic sections and the hero no switch", () => {
    render(<SectionRail … />);
    for (const name of [/الهيرو/, /القيادة/, /المنظومة/]) {
      const row = screen.getByRole("tab", { name }).closest("[data-section]")!;
      expect(row.querySelector('[role="switch"]')).toBeNull();
    }
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/dashboard && npx vitest run src/components/admin/about-federation --pool=threads`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the rail**

A `~290px` sticky column. Each row a flex line holding: a numbered square; a `role="tab"` button carrying the name and the state line (dot + word — colour alone fails Chapter 6 §6.2); and one of a `role="switch"`, a "تلقائي" chip, or a "دائمًا" chip. `aria-orientation="vertical"`, with `ArrowUp`/`ArrowDown` + `Home`/`End`, and `tabIndex` on the selected row only.

The switch is a **sibling** of the tab button, never a descendant — a control inside a control is one click with two meanings.

- [ ] **Step 4: Rewire the About editor**

- `selected` comes from `?section=`, validated against `ABOUT_SECTION_KEYS`, falling back to `hero`.
- `<PageActivationBar>` moves into `EditorShell`'s `activation` slot.
- `<ReadinessPanel>` and the "blocks submission" notice move out of the rail column into the shell's `notices` prop; `onGoToField` sets `?section=` **and** focuses the field.
- `<SeoFields>` moves out of the content column into the shell's `seo` slot.
- The content column becomes `290px minmax(0,1fr)` with no third column — the panels are gone from the page's flow.

- [ ] **Step 5: Run the tests and type-check**

Run: `cd apps/dashboard && npx vitest run src/components/admin/about-federation --pool=threads && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/components/admin/about-federation
git rm apps/dashboard/src/components/admin/about-federation/section-list.tsx
git commit -m "feat(dashboard): About sections as a vertical rail, with the section in the URL"
```

---

## Task 9: Migrate the other four shell screens

**Files:**
- Modify: `president-message/editor.tsx` (+ `hero-section.tsx`…`seo-section.tsx`), `vision-mission/editor.tsx`, `strategic-plan/editor.tsx`, `news/article-editor.tsx`
- Modify: `pages/page-workbench.tsx`

**Interfaces:** consumes Tasks 6 and 7 only. **No logic changes.**

- [ ] **Step 1: Convert President's Message onto the shell**

It keeps a hand copy of the shell today — its own `save`, its own panels block, its own grid at line 206. Replace all three with `<EditorShell>`, keeping its `save` semantics identical (it must still resolve `true`/`false` for the version panel's guard). This is the shared-components rule (owner 2026-09-22): a part used in five places is one component.

- [ ] **Step 2: Move each screen's SEO into the slot**

For all four: delete the `<section aria-labelledby="…-seo-title">` wrapper from the content tree and pass the same `<SeoFields …>` through `seo={…}`. The props are unchanged; only the parent moves.

- [ ] **Step 3: Add the activation bar to the two off-shell screens**

- `page-workbench.tsx`: `<PageActivationBar entity={resourceType} recordId={null} isActive={…} canPublish={…} saved={entry.record != null} />` in the selected page's `<header>`, under the API path line. The screen's loader must read `canPublish` per page and `isActive` off each record.
- `/news` and `/videos` listing screens: the same bar in the page header, governing that listing page's hero record (`newsPage` / `videosPage`).

- [ ] **Step 4: Run the whole dashboard suite and type-check**

Run: `cd apps/dashboard && npx vitest run --pool=threads && npx tsc --noEmit`
Expected: PASS. Selector updates are allowed; weakening an assertion is not.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src
git commit -m "refactor(dashboard): migrate the remaining editors onto the tabbed shell"
```

---

## Task 10: The web gate — one withheld-page screen

**Files:**
- Create: `apps/web/src/components/pages/page-inactive-screen.tsx`, `.spec.tsx`
- Create: `apps/web/src/lib/pages/activation.ts`, `.spec.ts`
- Modify: `components/pages/static-page-screen.tsx`, `components/pages/about/inactive-screen.tsx`, the three governance routes, `app/sitemap.ts`, `lib/pages/indexability.ts`

**Interfaces:**
- Produces:

```ts
/** False only when the record says so. An absent record is "never saved",
 *  which is not the same state and is not this function's business. */
export const isServed: (record: { isActive?: boolean } | null) => boolean;
/** The withheld-page copy: `maintenanceMessage` for this locale, or the
 *  `Preparing.status` fallback. */
export const withheldMessage: (locale: AppLocale) => Promise<string>;
```

- [ ] **Step 1: Write the failing test**

```ts
describe("isServed", () => {
  it("serves a record that says nothing about it", () => {
    // Belt and braces with the backfill: if a row somehow reaches the gate
    // without the field, a live federation page must not go dark.
    expect(isServed({})).toBe(true);
  });
  it("withholds only on an explicit false", () => {
    expect(isServed({ isActive: false })).toBe(false);
    expect(isServed({ isActive: true })).toBe(true);
  });
  it("treats an absent record as served, leaving the 404 to the route", () => {
    expect(isServed(null)).toBe(true);
  });
});

describe("withheldMessage", () => {
  it("prefers the federation's own maintenance message", async () => {
    // One sentence, written once, in site settings (ADR-0102 §D5).
    expect(await withheldMessage("ar")).toBe("نعود قريبًا");
  });
  it("falls back to Preparing.status when none is set", async () => {
    expect(await withheldMessage("ar")).toMatch(/قيد الإعداد|الإعداد/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && npx vitest run src/lib/pages/activation --pool=threads`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the gate and the screen**

`page-inactive-screen.tsx` is `AboutInactiveScreen` generalised over a `PublicPage`: hero with the page's register and its registry name, breadcrumb (structured-data only under `/about`, per the existing `isInstitutional` rule), and one band carrying `withheldMessage(locale)`. `AboutInactiveScreen` becomes a three-line call to it.

- [ ] **Step 4: Gate the twelve listing pages in one place**

`loadStaticPage` returns `isActive: isServed(record)`. Each of the twelve routes gains, before rendering its screen:

```tsx
  if (!loaded.isActive) return <PageInactiveScreen page={loaded.page} locale={locale} />;
```

and its `generateMetadata` passes `indexable: loaded.isActive && …`.

- [ ] **Step 5: Gate the three governance pages**

They already answer `{ isActive: false }` and nothing else when withheld (Task 5), so each route follows About's existing shape exactly.

- [ ] **Step 6: Keep withheld pages out of the sitemap**

In `app/sitemap.ts`, the per-page filter gains the switch. It already reads each page's record for `isIndexable`; extend that read rather than adding a second one.

- [ ] **Step 7: Write the SEO regression test**

`apps/web/src/lib/design-system/activation-seo.spec.ts`: for every page in `PUBLIC_PAGES` that has an activation switch, a withheld record produces `robots: { index: false }` and no sitemap entry (Review Focus 5).

- [ ] **Step 8: Run the web suite and type-check**

Run: `cd apps/web && npx vitest run --pool=threads && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): one in-preparation page for every withheld public page"
```

---

## Task 11: `/simplify` on the changed files

- [ ] **Step 1: Run it, scoped**

Run `/simplify` over the files this branch changed and no others. CLAUDE.md §30 governs the outcome: arrow functions and `try/catch` stay; any other stylistic pattern it proposes is raised as a proposal, not applied.

- [ ] **Step 2: Re-run the affected suites**

Run: `cd apps/dashboard && npx vitest run --pool=threads`, `cd apps/web && npx vitest run --pool=threads`, `cd api && npx jest --runInBand src/common src/bootstrap`
Expected: PASS, and the output must be visually identical — this step changes no behaviour.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: simplify the tabs and activation changes"
```

---

## Task 12: Verification

**Files:**
- Create: `e2e/editor-shell-tabs.spec.ts`, `e2e/page-activation.spec.ts`
- Modify: `.gitignore` (add `e2e/artifacts/`)

- [ ] **Step 1: Bring the servers up**

API on 3000 (`PORT=3000` — 3001 collides with web; memory `reference_shared_local_servers_sessions`), dashboard on 3002. Check `ListAgents` and ask before stopping a server another session may be using. Address the dashboard as `localhost`, never `127.0.0.1` (memory `reference_dev_origin_localhost_hydration`).

- [ ] **Step 2: Write the shell e2e**

```ts
test("a typed value survives a tab switch", async ({ page }) => { … });
test("?tab= and ?section= open the named state", async ({ page }) => { … });
test("the tablist is keyboard-operable in RTL", async ({ page }) => { … });
test("a notice opens and focuses its field", async ({ page }) => { … });
test("no input is narrower than 320px at 1280", async ({ page }) => { … });
test("no horizontal page scroll at 390", async ({ page }) => { … });
```

The last two are measurements, not assertions about CSS: read `getBoundingClientRect().width` on every visible `input`/`textarea`, and compare `documentElement.scrollWidth` with `clientWidth`. Set the viewport to 390 **without** a CDP mobile override, and remember a 15px scrollbar makes a 390 viewport 375 wide (memory `reference_live_measurement_pitfalls`).

- [ ] **Step 3: Write the activation e2e, per type**

For each of the sixteen: switch off → the public URL answers 200, shows the withheld copy, carries `noindex`, and is absent from `/sitemap.xml`; switch on → the page returns. Wait 65 s or bust the cache between the write and the read — public reads are cached 60 s (memory `reference_public_cache_live_checks`).

Plus: restore an old revision on each of the four workflow types → `isActive` unchanged.

- [ ] **Step 4: Capture the screenshots**

`/ar` at 1440 / 1024 / 390, every migrated screen × every tab, into `e2e/artifacts/editor-shell/`. That directory is gitignored — review captures never enter the repo (memory `feedback_review_screenshots_scratchpad`).

Run: `npx playwright test --workers=1 e2e/editor-shell-tabs.spec.ts e2e/page-activation.spec.ts`

- [ ] **Step 5: Measure contrast and focus**

Every new surface: text ≥ 4.5:1, the tab underline and the state chips ≥ 3:1, every tab and switch with a visible focus ring. Composite alpha in channel space before computing luminance (memory `reference_scrim_contrast_measurement`).

- [ ] **Step 6: Full regression**

Run: `cd apps/dashboard && npx vitest run --pool=threads`, `cd apps/web && npx vitest run --pool=threads`, `cd api && npx jest --runInBand src/common src/bootstrap src/modules/federation-governance src/modules/cms-page-composition`, and `npx tsc --noEmit` in all three.
Expected: PASS everywhere, zero type errors.

- [ ] **Step 7: Stop the servers and clean up**

Stop the tasks, then confirm no orphaned `node` process holds 3000 or 3002 (CLAUDE.md §32.1). Never filter processes on `start-server` alone — it kills the sibling app.

---

## Task 13: Documentation

- [ ] **Step 1: Update `docs/engineering/about-federation-page.md`**

The screen section: the rail, the tabs, `?tab=`/`?section=`, and the activation bar's move out of the page and into the shell.

- [ ] **Step 2: Write the nine-item explainer**

`docs/engineering/editor-shell-and-page-activation.md`, in the owner's agreed nine-item format (memory `feedback_nine_item_report`): why · file map · one traced example · decisions · how to edit · where it breaks · guarding tests · not built · terms.

- [ ] **Step 3: Commit**

```bash
git add docs/engineering
git commit -m "docs: the tabbed editor shell and page activation, end to end"
```
