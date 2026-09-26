# The tabbed editor shell, and switching a page off

Two changes that landed together on 2026-09-26, recorded as **ADR-0102**. Read
this before touching either the page editors or anything to do with whether a
public page is being served.

---

## 1. Why it exists

**The editor was too narrow to write in.** `EditorShell` put the status and
version panels in a fixed 340px column beside the form, and the About screen
then put its section list in another 290px. With the signed-in shell's own 240px
sidebar and three gutters, a 1360px screen left the fields between 170 and 350px
wide: labels wrapped, inputs were clipped, and the description field scrolled
inside itself. The panels are content a reader **consults**; the fields are
content they **work in**. So the fields got the width and the panels got tabs.

**Only one page could be taken off the site.** About had an `isActive` switch;
the other fifteen public pages had no state between "published" and "deleted".
The `page-visibility` module that would have covered them was removed by owner
decision, and the replacement it named — a field on each page — was never built.
This builds it.

### What was rejected

- **Widening the columns instead of tabbing.** The arithmetic does not close;
  see the numbers above.
- **Accordions in the same column.** Keeps the page long, which was the whole
  complaint.
- **A route per panel** (`/about/versions`). A route boundary throws the draft
  away, and "switching views does not lose the draft" is the load-bearing
  requirement.
- **Restoring the visibility module.** A module that owns one boolean for records
  living in fifteen other collections is a second source of truth for that
  boolean.
- **`isMaintenanceMode` as a substitute.** It exists, it is `[RESTRICTED]`, and
  it is enforced nowhere in the web app — and "the About page is not ready" is
  not "the federation's site is down".

---

## 2. The file map, in the order the work flows

### The API

| File | What it holds |
| --- | --- |
| `common/schemas/hero-page.schema.ts` | `isActive`, `default: true`, `select: false`. Fifteen collections extend this. |
| `common/repositories/base.repository.ts` | `findOneWithActivation` / `findByIdWithActivation` / `findAllWithActivation` — the only reads that can see the field. |
| `common/services/singleton-page.service.ts` | `ActivatableSingletonPageService`: `get()` and `setActive()` for the twelve hero pages. |
| `common/dto/toggle-active.dto.ts` | One field. The body of all sixteen routes. |
| `common/dto/withheld-page.dto.ts` | `{ isActive: false }` — what a withheld page answers, and nothing else. |
| `bootstrap/backfill-page-activation.ts` | Makes existing rows explicitly served. **Not optional** — see §6. |
| twelve `*-page.controller.ts` | `PATCH /<page>-page/active`, gated on `<resource>:Publish`. |
| three governance modules | `PATCH /<page>/:id/active`, the About pattern, plus the withheld gate in the public read. |
| `common/constants/permission-catalogue.ts` | Twelve new `Publish` rows. |

### The dashboard

| File | What it holds |
| --- | --- |
| `lib/admin/editor-tab.ts` | The four tab names, their order, and how `?tab=` is read. |
| `components/admin/editorial-editor/editor-tabs.tsx` | The strip: ARIA, the RTL-aware keyboard, the count badges. |
| `components/admin/editorial-editor/editor-shell.tsx` | The sticky header, the activation slot, the four panels, the save. |
| `components/admin/editorial-editor/seo-panel.tsx` | The SEO tab: `SeoFields` at a readable measure. Adds no preview — `SeoFields` already ends with one. |
| `components/admin/activation/page-activation-bar.tsx` | The bar. One component, six screens. |
| `lib/admin/activatable-pages.ts` | Which pages may be switched, and how each is addressed upstream. |
| `lib/admin/page-activation-state.ts` | The server read for the two screens that are not page editors. |
| `app/api/admin/page-activation/[entity]/route.ts` | One BFF route for all sixteen. |
| `components/admin/about-federation/section-list.tsx` | The ten sections as a vertical tablist. |

### The public site

| File | What it holds |
| --- | --- |
| `lib/pages/activation.ts` | `isServed` and `withheldMessage`. The two readings, made once. |
| `components/pages/page-inactive-screen.tsx` | The in-preparation page, and `withheldPage` — the one-line gate each route calls. |
| `lib/pages/indexability.ts` | The switch checked ahead of every per-page rule, which is also what keeps the sitemap honest. |

---

## 3. One real example, traced: taking the Athletes page off the site

1. An editor with `athletesPage:Publish` opens **`/pages`** and selects «الرياضيون».
   The screen read the row with `fetchAsUser("/athletes-page")`, which reaches
   `AthletesPageService.get()` → `findOneWithActivation()` → the row **with**
   `isActive`, because a plain `findOne` cannot see it.
2. `PageWorkbench` resolves `findActivatablePage("athletesPage")` and draws
   `PageActivationBar` in the selected page's header, with `recordId={null}` —
   this collection is a singleton.
3. They press «إيقاف الصفحة…». Nothing is sent: the dialog opens first, because
   the effect is immediate and public.
4. They confirm. `PATCH /api/admin/page-activation/athletesPage` with
   `{ isActive: false }` — the `!isActive` is read **at the press**, not captured
   when the dialog opened (CLAUDE.md §31).
5. The BFF resolves the registry, sees `shape: "singleton"`, and forwards to
   `PATCH /athletes-page/active`. A `recordId` in the body would have been
   refused here.
6. Upstream, `@RequirePermission('athletesPage', 'Publish')` passes,
   `ToggleActiveDto` accepts the one field, `setActive` writes
   `{ isActive: false, updatedBy }` and answers the document — with `_id`, which
   the audit-log interceptor needs to record the write at all.
7. The bar shows a toast and calls `router.refresh()`.
8. Within **60 seconds** — `fetchPublic`'s cache window — a visitor to
   `/ar/athletes` is answered by `withheldPage("athletes", locale)`:
   HTTP **200**, the page's hero and name, and one line from
   `siteSettings.maintenanceMessage`.
9. `generateMetadata` marks it `noindex`, and `sitemap.ts` drops it — both
   through `isIndexable`, which checks the switch before anything else.

---

## 4. The decisions that are not obvious

**`select: false`, and why it is on the shared field.** `RevisionsService.snapshotOf`
freezes whatever a plain `.lean()` read returns, and `PublishingService.restore`
writes a snapshot straight back over the row. A selectable `isActive` would mean
restoring last month's wording also restored last month's live state — taking a
published page off the site with nobody asking. Three of the fifteen collections
extending `HeroPageSchema` are workflow-governed, so the exclusion is declared
once on the shared field: a field that is safe on twelve subclasses and unsafe on
three is a field whose safety depends on which subclass you happen to open.

**`default: true`, with a backfill in the same change.** Mongoose applies a
default when it *creates* a document, never to one already stored. Without the
backfill, fifteen live pages read back `undefined` and go dark on deploy.

**`ActivatableSingletonPageService`, not two more methods on the base.**
`siteSettings` shares `SingletonPageService` and is not a page — it is maintenance
mode, analytics ids and session timeouts, it has no URL, and it carries no
`isActive`. The split follows the schema.

**One panel mounted at a time, not four with `hidden`.** Every field is controlled
from state the *page* holds, above the shell, so unmounting a panel cannot lose a
value. Four mounted panels would put four copies of the controls in the
accessibility tree and would make the versions table fetch on every page open.

**The header's primary button is a signpost, not a second publish control.** It
selects the review tab. The decisions stay in the status panel; two publish
buttons in two places would leave an author unsure which one their unsaved work
belongs to.

**Absolute times, not "two minutes ago".** `relativeTime` needs a `now` the server
cannot have, and a string that is right only for the second it rendered in is a
hydration mismatch waiting to happen.

**SEO sits second.** Owner decision 2026-09-26, amending the canvas: content and
SEO are both the author's own writing, so they are adjacent; review and history
are consulted, so they follow.

---

## 5. How to edit it

**To give a new page a switch:** extend `HeroPageSchema` (or declare the field the
way About does), add a `PATCH active` route gated on `<resource>:Publish`, add the
catalogue row, add the page to `ACTIVATABLE_PAGES` and to
`ACTIVATABLE_COLLECTIONS`, draw `PageActivationBar` on its screen, and call
`withheldPage(KEY, locale)` at the top of its public route.
`page-activation-routes.spec.ts` checks the first four against each other.

**To add a tab:** `EDITOR_TABS` in `lib/admin/editor-tab.ts`, a label under
`EditorialEditor.tab*`, a branch in the shell's panel block, and a flag in
`availableTabs`. A tab is offered only where the page supplies its content.

**To change what a withheld page says:** `siteSettings.maintenanceMessage`, in the
dashboard. Not in code, and not per page.

---

## 6. Three ways to get this wrong, and how you would notice

1. **Shipping the field without the backfill.** Fifteen live pages go dark at
   once. You would notice because every public page shows the in-preparation
   screen and the sitemap empties. `backfill-page-activation.spec.ts` pins the
   exact condition; running `npm run backfill:page-activation -- --apply` fixes it.
2. **Adding the route and forgetting the catalogue row.** Every operator gets 403
   on the switch, including the admin. `permission-catalogue.spec.ts` fails before
   you get that far — and after adding the row, `npm run bootstrap:admin` has to
   run before the grant exists on anybody's role.
3. **Holding a draft inside the shell's render prop.** It looks correct and loses
   the author's work on every tab press. `editor-shell.spec.tsx`'s first test is
   exactly this case.

---

## 7. What guards it

| Guard | What it would catch |
| --- | --- |
| `api/.../backfill-page-activation.spec.ts` | A row written before the field reading back as withheld. |
| `api/.../singleton-page.service.spec.ts` | The switch written through the wrong read, or writing more than itself. |
| `api/.../page-activation-routes.spec.ts` | A page with the field and no route, a route with no page, or one gated on `Update`. |
| `api/.../governance-page-activation.spec.ts` | `select: false` lost on any of the four workflow pages — the restore case. |
| `api/.../permission-catalogue.spec.ts` | A guarded route with no grant, or a grant that gates nothing. |
| `dashboard/.../editor-shell.spec.tsx` | A draft lost across a tab switch; a tab offered with nothing behind it; two `h1`s. |
| `dashboard/.../editor-tabs.spec.tsx` | The RTL arrows reversed; more than one tab stop; a count invisible to a screen reader. |
| `dashboard/.../section-list.spec.tsx` | The switch swallowing the tab's click; a switch appearing on one of the three sections that must not have one. |
| `dashboard/.../page-activation-bar.spec.tsx` | A control offered without the grant; a record id sent to a singleton route; a failed request reported as success. |
| `dashboard/.../editor-tab.spec.ts` | A stale `?tab=` opening an empty frame. |
| `web/.../activation.spec.ts` | An absent field read as withheld; an unreachable API leaving the page with no sentence. |
| `web/.../activation-seo.spec.ts` | A withheld page still indexable or still in the sitemap — for **every** switchable page. |

---

## 8. What was deliberately not built

- **The homepage.** `pages.status` is not a public routing source and already
  means two other things (ADR-0102 §D6). Owner decision: out of scope.
- **`revalidatePath` on the switch.** The dashboard and the site are separate Next
  applications; the call would invalidate the wrong cache. The contract is the
  60-second public cache window (§D7).
- **A per-page withheld message.** §D5.
- **A switch for `/about/governance/policies`.** It has no dashboard screen and no
  record of its own; each governance document already governs its own visibility.
- **The album detail page, the homepage albums section, and the dashboard albums
  screen.** Their `TODO(isActive)` comments still stand: those files belong to the
  albums work and were out of scope here (brief §9).

---

## 8b. The secondary button’s hover, fixed on the way (2026-09-26)

Reported by the owner against this work, diagnosed and fixed in
`packages/brand-ui/controls/controls.css`.

**The symptom.** The middle of every secondary button’s label vanished on hover
and on focus — in dark mode.

**The cause.** The variant filled its whole face with `--brand-tricolor` on
hover and recoloured the label to `--surface-tricolor-ink` to suit. The ramp’s
middle stop is `--color-tricolor-mid`, which is **`#000000` in light and
`#FFFFFF` in dark**, while the ink stays white. White on white.

**Why recolouring the ink was not the fix**, though it was the obvious one.
Measured against the three stops on the dark canvas:

| ink | on green | on the middle | on red |
| --- | --- | --- | --- |
| white | 4.60:1 | **1.00:1** | 7.44:1 |
| black | 4.57:1 | 21.0:1 | **2.82:1** |

Every candidate fails on one of the three. A ramp containing both extremes
cannot carry text at all.

**The fix.** The hover fill is no longer a face — it is a band along the
block-end edge, `--border-width-ring` tall. The identity still arrives on hover,
nothing lands behind the words, and the label keeps the ink it was measured
with at rest: **17.91:1**, in both states, on every secondary button.

This is a `packages/brand-ui` change, which root `CLAUDE.md` §7 reserves for
owner approval. It was made on the owner’s explicit instruction to fix the
defect, and it changes the hover of the secondary Button everywhere —
`FilterChip` and `SearchField`, which share `.brand-ring`, are untouched
because the ring itself was not changed.

---

## 9. The words

| Term | What it means here |
| --- | --- |
| **Served / withheld** | Whether visitors get the page's content. Operational, immediate, outside the review cycle. |
| **Published / Live** | Whether a version has been approved and put on the site. Editorial, and unrelated to the switch — a Live page can be withheld, and switching one on publishes nothing. |
| **In preparation** | What a visitor sees at a withheld page's address: its name, its trail, and one sentence. HTTP 200. |
| **Singleton page** | One of the twelve hero wrappers: one row, no id in its routes. |
| **Activatable page** | Any of the sixteen in `ACTIVATABLE_PAGES`. |
| **Tab** | One of four panels in the editor: content, SEO, review, history. In the URL as `?tab=`. |
| **Section** | One of the About page's ten parts, in the URL as `?section=`. Not a tab in the shell's sense. |
