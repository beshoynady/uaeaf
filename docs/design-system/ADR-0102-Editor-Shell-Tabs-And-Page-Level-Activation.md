# ADR-0102 — The editor shell becomes tabbed, and page visibility becomes a field on the page

| Field | Details |
| --- | --- |
| **Status** | Accepted. Recorded 2026-09-26, ahead of the screens it governs (ADR-0056 §2 — document-first: the record is written before the change is implemented). |
| **Authority** | Product Owner brief, 2026-09-26, with three assumptions approved in it (a, b, c) and two answered in this session's inventory — the homepage exclusion (D6) and the propagation mechanism (D7). |
| **Amends** | **ADR-0075** — the *dashboard layout* half of the editorial editor only: the status, review, versions and SEO panels leave the page's vertical flow and become sibling panels under one tablist. Nothing about the **public** page's composition lock is touched. · **ADR-0070** — the shell it defined gains a header and a tab strip; its save semantics, its leave guard and its failure-beside-the-control rule are unchanged. |
| **Does not amend** | **ADR-0075's ordering prohibition** and its rule for the public composition. · **ADR-0101** — About's seven section switches keep their meaning exactly; only the control they live in moves. · **ADR-0091** — the activation switch is *not* a switch-in-a-form: it sends its own request and takes effect at once, which is the case ADR-0091 explicitly carves out. · **The workflow core** — `PublishingService`, `RevisionsService`, the workflow definitions, instances and policies are untouched. · **Chapter 6 §6.2** colour is never the only signal. · **WCAG 2.1 AA** as the acceptance floor. |
| **Context** | Two problems, one screen. **The layout.** The shell put the status and versions panels in a fixed 340px column and About then put its section list in another 290px column, so at 1360px the field column was 170–350px wide: labels wrapped, inputs were clipped, and the description field scrolled inside itself. The same squeeze is on the President's Message screen, which keeps a hand copy of the shell. **The visibility.** Only About can be switched off. The `page-visibility` module that would have done this for every page was removed by owner decision, and the replacement it named — a field on each page — was never built. So fifteen public pages cannot be taken off the site at all, and a page that is not ready has no state between "published" and "deleted". |
| **Decision** | Seven decisions, D1–D7. In summary: (D1) the shell's panels become four tabs under a sticky header; (D2) visibility is an `isActive` field on the page's own record, switched outside the review cycle under that page's `Publish` grant; (D3) the field defaults to **true**, with a backfill, because these pages are already live; (D4) the field is `select: false`, because three of the fifteen collections carrying it are workflow-governed and a restore would otherwise restore the live state too; (D5) the withheld page's copy is `siteSettings.maintenanceMessage`, with no per-page message field; (D6) the homepage is out of scope, because `pages.status` already means two other things; (D7) propagation is the public cache window, not a revalidation call. |
| **Alternatives Considered** | **(A) Widen the shell's columns instead of tabbing them.** Rejected: the arithmetic does not close. The signed-in shell takes 240px, the panels 340, About's rail 290, and three gutters — 1360px leaves under 400 for the fields, and the panels are content a reader consults occasionally while the fields are content they work in continuously. **(B) Collapse the panels into accordions in the same column.** Rejected: it keeps the page long — the whole complaint — and an accordion that is open by default reproduces the original height while one closed by default hides the review state a reviewer opened the screen for. **(C) A separate route per panel (`/about/versions`).** Rejected: a route boundary throws the draft away, and the brief's load-bearing requirement is that switching views does not. **(D) Keep the visibility module, restored.** Rejected — it was removed by owner decision, and the reason generalises: a module that owns "is this page visible" for pages whose records live in fifteen other collections is a second source of truth for one boolean. **(E) A single site-wide switch (`isMaintenanceMode`).** Rejected as a substitute: it exists, it is `[RESTRICTED]`, and it is not enforced anywhere in the web app — and in any case "the About page is not ready" is not "the federation's site is down". **(F) `default: false` for consistency with About.** Rejected, and this is the rejection that would have caused an outage: see D3. **(G) A `message` field per page.** Rejected: a second place to write the same sentence is a second place for it to go stale, and no page has ever needed a different one. |
| **Why This Decision** | Both halves follow the same principle: put the state where the thing it describes already lives, and let one implementation serve every case. The tabs are one component consuming panels that already exist — the status panel, the versions panel and the SEO fields are unchanged and simply rendered somewhere else, which is why a layout change this large adds almost no behaviour. The visibility field is one `@Prop` on the schema fifteen collections already extend, one method on the service twelve of them already share, and one screen component that already existed for About — so "every page can be switched off" costs roughly what "one page can be switched off" cost, and there is no per-page copy to drift. |
| **Risks** | **The backfill is forgotten and fifteen live pages go dark.** Mongoose applies a default to new documents only. **Mitigation:** D3 makes the backfill part of the same change as the field, and `backfill-page-activation.spec.ts` pins the exact failure — a row written before the field reads back served. **A restore silently takes a page off the site.** **Mitigation:** D4, `select: false` on the shared field, plus one schema assertion per workflow-governed collection. It is asserted on the field's options rather than on a restore's outcome because the exclusion is what makes the outcome impossible. **Every existing operator gets 403 on the new switch.** The twelve hero pages carry only `Update` in the permission catalogue. **Mitigation:** twelve `Publish` rows and a re-seed, with `permission-catalogue.spec.ts` re-deriving the list from the decorators so a missing row fails a test rather than a click. **A tab switch loses a draft.** **Mitigation:** every field stays controlled from state held above the shell, which makes unmounting a panel harmless; pinned by a unit test and again by a browser round trip. **A withheld page stays in the index or in the sitemap.** **Mitigation:** the switch is wired into `generateMetadata` and `sitemap.ts`, and `activation-seo.spec.ts` checks every switchable page in `PUBLIC_PAGES`. **The tab strip does not fit a phone.** **Mitigation:** the strip scrolls horizontally, measured at 390 rather than assumed. |
| **Consequences** | `HeroPageSchema` gains one `isActive` prop, reaching fifteen collections. `SingletonPageService` gains `setActive` and its `get` widens to the excluded field. Twelve controllers gain `PATCH active`; three gain `PATCH :id/active`; About's is unchanged. The permission catalogue grows twelve rows. `apps/dashboard` gains `PageActivationBar`, `EditorTabs`, `SeoPanel`, a `page-activation` BFF route and an `ACTIVATABLE_PAGES` registry, and loses About's private `ActiveBar` and its route. `apps/web` gains `PageInactiveScreen` and an activation gate inside `loadStaticPage`, and `AboutInactiveScreen` becomes a call to the shared one. Recorded **PENDING FIGMA BACK-SYNC**: the tab header, the four panels, the vertical section rail and the withheld-page screen — the canvas at `docs/design-specs/about/about-admin-tabs.design.html` is the approved source and no Figma frame exists for these states. |

---

## D1 — The shell's panels become four tabs under a sticky header

`EditorShell` draws a sticky header and a `role="tablist"` with up to four panels.

**The header** carries the breadcrumb, the page's `<h1>`, two state chips (what is live and at which version; whether there is an unpublished draft and how many changes it holds), when the draft was last saved, and the actions — preview, save, and the one primary action with its outstanding-notice count. The activation bar (D2) sits directly under that row.

**The four tabs**, in this order:

| Tab | Content | Present when |
| --- | --- | --- |
| المحتوى | the page's own fields | always |
| المراجعة والنشر | the publishing path, the "before submitting" notices, the recent decisions | the page is workflow-governed |
| الإصدارات والسجل | the versions table, full width, with restore and "load more" | the record has revisions |
| SEO والمشاركة | the SEO fields and a search-result preview | the page has SEO fields |

A tab that is present and empty is worse than an absent one — it tells a reader something is there — so each appears only where the page supplies its content.

**Three properties are load-bearing**, not decoration:

1. **The tab is in the URL** (`?tab=`), by `replace` rather than `push`. A colleague can be sent to the versions table, and Back still means "leave this record" rather than "go back one tab".
2. **The keyboard follows the WAI-ARIA tabs pattern**: one tab stop for the whole strip, arrows to move between tabs, `Home`/`End` to the ends, and — because the dashboard's default locale is Arabic — the arrows are resolved from the list's computed direction, so `ArrowLeft` moves *forward* in RTL.
3. **A draft survives a tab switch.** Every field is controlled from state the *page* holds, above the shell, so a panel unmounting cannot take a value with it. Panels are therefore rendered one at a time rather than four-with-`hidden`: four mounted panels would put four copies of the controls in the accessibility tree and would make the versions table fetch on every open whether anyone looked at it.

**About's sections become a vertical rail** (`aria-orientation="vertical"`), one section shown at a time, with the section in the URL (`?section=`). The rail is ~290px and sticky. Each row carries a number, the name, a state line (dot **and** word — Chapter 6 §6.2), and one of: the ADR-0101 visibility switch, a "تلقائي" chip, or a "دائمًا" chip. **The switch is a sibling of the tab, never inside it**: a control inside a control is one click with two meanings, and an editor toggling a section's visibility must not be navigated away from the section they are editing.

## D2 — Page visibility is a field on the page's own record

Every public page that has a dashboard screen carries `isActive` on its own record, and one control changes it: `PageActivationBar`, the component About already had, moved out of About and consumed by the shell's header slot and by the two screens that are not on the shell.

Three properties, each inherited from About's route and each deliberate:

- **Outside the review cycle.** Taking a live page down is an operational act that cannot wait for an approval, and putting one up is a decision taken after the words were already approved.
- **Gated on `Publish`, not `Update`.** Deciding what the public sees is a publishing decision; an editor who may rewrite the page still may not decide the moment it appears. Without the grant the bar **states the page's condition and offers no control** — a disabled control is an invitation to find out why.
- **Allowed while a review holds the draft.** The switch governs the version already live; a review in progress concerns the next one, and blocking the switch on it would mean a page could not be taken down because someone happened to be editing it.

Two upstream shapes, because there are two families. A hero page is a singleton — one row, no path parameter: `PATCH /<page>-page/active`. A workflow-governed page has many rows and takes the id: `PATCH /<page>/:id/active`. Both answer the document, and so `_id`: the audit-log interceptor records a write only when it can name the record.

**Switched off, the public endpoint returns `{ isActive: false }` and nothing else.** There is then no draft in the response to leak, which is the same reason About's does it.

## D3 — The field defaults to **true**, and existing rows are backfilled

`default: true` on the shared field. `aboutFederationPage` is the one exception at `default: false`, because its page had never been live when the field was added and "saved but not yet shown" was the correct state for it.

For the other fifteen the correct state is served: a new row is a page an editor has just filled in, and there is no situation in which the right answer is "withheld by default".

**The backfill is not optional and not a follow-up.** Mongoose applies a default when it creates a document, never to one already stored — so without it every page written before the field reads back `undefined`, the public gate sees "not true", and fifteen live pages go dark the moment the gate ships. `backfillPageActivation` sets the field only where it is absent (an editor who has already switched a page off must not have that undone) and leaves `updatedAt` alone (`publishDirect` uses it for optimistic concurrency, so a migration that moves it invalidates every open editor's `expectedUpdatedAt`).

## D4 — The field is `select: false`, and this is the decision that prevents an outage

`RevisionsService.snapshotOf` freezes whatever a plain `.lean()` read returns, and `PublishingService.restore` writes a snapshot straight back over the row. An ordinary field would therefore mean that **restoring last month's wording also restored last month's live state** — taking a published page off the site with nobody having asked.

Both of those are shared workflow core and not ours to special-case, so the exclusion lives on the field: readers that genuinely need it ask by name (`.select('+isActive')`), and there are exactly two — the public read, which must know whether to serve the page, and the dashboard, which draws the switch.

The exclusion is on the **shared** field rather than case-by-case because three of the fifteen collections that extend `HeroPageSchema` are workflow-governed — `presidentMessagePage`, `visionMissionPage`, `strategicPlansPage`. A field that was safe on twelve and unsafe on three, declared once, is a field whose safety depends on which subclass a later reader happens to look at.

## D5 — The withheld page's copy comes from site settings

A switched-off page shows the composition `PreparingPageScreen` draws — the page's hero with its registry name, its breadcrumb, and one line of copy — because to a visitor the two situations are the same situation: the address works, the page is named, and its content is not ready.

The line is `siteSettings.maintenanceMessage` for the reader's locale, with `Preparing.status` as the fallback. **No per-page message field.** The sentence is the same sentence on every page, and a field per page is fifteen places for it to go stale.

The page answers **200, not 404** — the address is real — and is marked `noindex` and kept out of the sitemap: Chapter 14 §11 puts a title and a status line below the threshold for indexing, whatever the registry says about the page.

## D6 — The homepage is out of scope

The brief's approved assumption was that pages in the `pages` collection would use the `status` they already carry. The inventory found that `status` is not a public routing source and already means two other things:

- **On the web**, `pages` holds one row (`slug: "home"`) as the anchor for `pageSections`. `status: 'Draft'` makes `loadHomepage` return an empty composition, so `/` renders with **no hero and no sections** — an empty frame, not an in-preparation page, and not a 404.
- **On the dashboard**, the same `Draft` makes the homepage section editor report `noHomePage`, so switching the homepage "off" would also switch off the screen that manages it.

Owner decision 2026-09-26: **leave both meanings alone.** `/` gets no activation control in this change, and `status` keeps its two jobs. The homepage's screen is a section-composition editor rather than a page editor, so the activation bar has no natural place in it either. Any future homepage withholding is its own decision and its own ADR.

## D7 — Propagation is the public cache window, not a revalidation call

The brief asked for `revalidatePath`/`revalidateTag` on the switch, "by the same mechanism About uses". About has none, and the mechanism is not available: `apps/dashboard` and `apps/web` are separate Next applications, so `revalidatePath` called in the dashboard invalidates the dashboard's cache and not the site's.

So the contract is stated rather than engineered: the switch takes effect **upstream immediately**, and reaches visitors within `PUBLIC_REVALIDATE_SECONDS` (60). The activation bar says so, and any check of a switch against the live site waits out that window before concluding anything (the pitfall recorded in `reference_public_cache_live_checks`).
