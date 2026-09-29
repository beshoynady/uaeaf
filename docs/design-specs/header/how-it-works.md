# The site header and search

The public header is one navigation tree, rendered twice (a row and a modal drawer) from
the same data, plus a server-fed set of promotional cards and a site-wide search dialog.
This document explains the header and the search system as they exist in the code today.

---

## Part 1 — The header

### 1. Why it was built this way, and what was rejected

The header's structure is data, not markup: `PRIMARY_NAV` in
`apps/web/src/lib/navigation.ts` is a plain tree of `NavItem` objects with no JSX in it,
consumed identically by the desktop row, the mobile drawer, and the footer's quick-links
column. The alternative — a component tree that happens to also produce a link list for the
footer — was rejected because it would mean the row, the drawer and the footer could each
drift into disagreeing about what the site's navigation actually is; a single tree with three
renderers cannot disagree with itself.

Panels are **disclosure buttons**, not a `role="menu"` application menu. A `<button
aria-expanded aria-controls>` revealing a plain `<ul>` of ordinary links was chosen over
WAI-ARIA's menu pattern because these are links to pages: `role="menu"`/`menuitem` strips
link semantics from a screen reader's link list and announces "menu item" for something that
navigates. This was an explicit, earlier decision (carried into this rewrite, not revisited)
and is guarded by a test that fails if `role="menu"`, `menuitem` or `menubar` ever appears
in the header.

The mobile drawer is a **modal**: focus-trapped, scroll-locked, `aria-modal`. An earlier
version of this header deliberately kept the drawer non-modal, reasoning that a full-screen
overlay with no hover affordance already had enough problems without adding a focus trap.
That reasoning held for a flatter, shallower tree. It stopped holding once the tree grew to
six top-level items with two-level columns under each: a drawer that visually and
structurally covers the entire page for as long as it is open, with nothing stopping a
keyboard user from tabbing into the page underneath it, is a barrier in fact regardless of
what its accessibility contract calls it.

The tools capsule's language switcher shows only the destination's own script — `EN` on the
Arabic page, `ع` on the English page — with the full name moved to `aria-label` and a
tooltip. A version that spelled the destination out in full ("English" / "العربية") was
rejected for space: three controls (search, language, theme) now share one capsule at the
row's tightest margin (1280px, 40px side padding), and the full name was the widest of the
three.

Card data — the President's-Message excerpt, the latest article, the latest video, the
active live stream — is read **once per request, on the server**, and passed down as plain
data. An alternative where each panel fetches its own card on open was rejected because it
would mean the first open of any panel pays a network round trip the reader can see, and
because a panel's card would then need its own loading and error states independent of the
page around it.

### 2. File map, in the order data flows through them

| Order | File | Role |
| --- | --- | --- |
| 1 | `apps/web/src/lib/navigation.ts` | The tree (`PRIMARY_NAV`), its types (`NavItem`, `NavLeaf`), and its derived views (`navDestinations`, `isWithin`, `containsPath`, `pagePart`). No JSX. |
| 2 | `apps/web/messages/{ar,en}.json` (`Nav` namespace) | Display text keyed by `NavItem.key`/`descriptionKey`. |
| 3 | `apps/web/src/lib/header/features.ts` | `getHeaderFeatures(locale)` — the one server-side read for every panel's card, four independent sources plus three explicit `null`s. |
| 4 | `apps/web/src/components/layout/site-header.tsx` | Async server component: calls `getHeaderFeatures`, hands the result to `HeaderShell`. Zero client code. |
| 5 | `apps/web/src/app/[locale]/layout.tsx` | Mounts `<SiteHeader locale={locale} />` once per request. |
| 6 | `apps/web/src/components/layout/header-shell.tsx` | Client: owns `openKey`, `drawerOpen`, `searchOpen`, `scrolled`; the Ctrl/Cmd+K listener; the drawer's focus trap and scroll lock; renders `PrimaryNav`, `HeaderToolsCapsule` (twice — row and drawer copies) and `SearchDialog`. |
| 7 | `apps/web/src/components/layout/primary-nav.tsx` | Renders `PRIMARY_NAV` as a row (≥1280px) or a stack; all keyboard handling (`Escape`, arrows, `Home`/`End`, hover-open with `(hover: hover)`); renders `TricolorIndicator` and `MegaPanel` per group. |
| 8 | `apps/web/src/components/layout/mega/mega-panel.tsx` | One panel: its columns, an optional "middle" content track, and a feature card — closes the grid up when either optional track is absent. |
| 9 | `apps/web/src/components/layout/mega/mega-column.tsx` | One column: a visible `<h2>` heading plus its links; filters the one conditional item (the live-stream link) out of the DOM entirely when no broadcast is live. |
| 10 | `apps/web/src/components/layout/mega/mega-link.tsx` | One destination: icon tile (or a static live dot), title, optional description or live caption, optional `soon` badge. |
| 11 | `apps/web/src/components/layout/mega/tricolor-indicator.tsx` | The 3px tricolour underline, shared by the leaf-link and group-trigger renderers in `primary-nav.tsx`. |
| 12 | `apps/web/src/components/layout/mega/nav-icon.tsx` | `key → <svg>` map for every nav leaf, with a fallback glyph for anything unmapped. |
| 13 | `apps/web/src/components/layout/cards/index.tsx` | `panelFeature(key, features)` / `panelMiddle(key, features)` — the single switch mapping a panel's key to its live card, its standing fallback, or `null`. |
| 14 | `apps/web/src/components/layout/header-tools-capsule.tsx`, `language-switch.tsx`, `theme-switch.tsx` | The three-control capsule shared, unchanged in structure, between the row and the drawer. |
| 15 | `apps/web/src/components/layout/use-focus-trap.ts` | The `useFocusTrap` hook — shared by the drawer here and by the search dialog (Part 2). |
| 16 | `apps/web/src/components/shared/countdown.tsx` | Shared countdown logic, used by a header event card and the homepage hero alike. |

### 3. One real example, traced end to end: the live-stream item

`PRIMARY_NAV`'s `media` panel has one column (`contentColumn`) whose last child is
`{ key: "liveStream", href: "/media/videos#live" }` (`navigation.ts:156`). Tracing it from
data to pixels:

1. **`features.ts:87–97`**, `readActiveLiveStream(locale)` calls `loadActiveLiveStream()`. If
   a broadcast is running, it returns `{ title, href: "/media/videos#live" }`; otherwise
   `null`. The call is wrapped in its own `try/catch` — a failure here becomes `null`, not a
   thrown error.
2. **`features.ts:112–135`**, `getHeaderFeatures` runs this alongside three other reads
   inside `Promise.allSettled`, and assigns the settled value to
   `HeaderFeatures.activeLiveStream`.
3. **`site-header.tsx:25–26`** awaits `getHeaderFeatures(locale)` and passes the whole
   object as the `features` prop to `HeaderShell` — this is the only place in the app that
   calls `getHeaderFeatures`.
4. **`header-shell.tsx:235`** forwards `live={data.activeLiveStream}` into `<PrimaryNav>`.
5. **`primary-nav.tsx`**'s `renderGroup`, for the `media` item, passes `live={live}` into
   `<MegaPanel>` (around line 300) alongside the item's `columns` and card slots.
6. **`mega-panel.tsx:91`** forwards the same `live` value to every `<MegaColumn>` in the
   panel (here, just the one).
7. **`mega-column.tsx:29`** filters: `visible = column.children.filter((item) => item.key
   !== "liveStream" || live !== null)`. When no broadcast is running, the live-stream `<li>`
   is not merely hidden — it is never rendered into the DOM.
8. **`mega-column.tsx:37`** passes `live` only to the one child whose key matches:
   `live={item.key === "liveStream" ? live : null}` — every sibling link receives `null` and
   is unaffected.
9. **`mega-link.tsx:48–58`**: when `live` is present, the icon tile renders a static filled
   circle instead of `NavIcon`; the caption below the title (lines 68–69) shows `live.title`
   — the broadcast's own name — instead of the item's `descriptionKey`.
10. **The destination itself** is `/media/videos#live`. `apps/web/src/components/pages/video/library-screen.tsx`
    gives the broadcast's own `<section id="live">`, rendered only while a broadcast exists —
    so the header's anchor link never points at a fragment that is not on the page.

The moment a broadcast ends, the next request's `getHeaderFeatures` resolves
`activeLiveStream` to `null`, and step 7 removes the link from the DOM on the next render —
no separate "hide the live item" code path exists; it is the same filter running with a
different input.

### 4. Non-obvious decisions and their reasons

- **`hidden` is driven by layout state, not by CSS alone.** `mega-panel.tsx:85` sets the
  `hidden` attribute from `!isOpen && !isRow`, computed in JavaScript, rather than trying to
  toggle it with a stylesheet rule. Tailwind's preflight declares `[hidden]` with
  `!important` in its `base` layer, and for `!important` declarations the cascade **reverses**
  layer order — an `!important` rule in `base` beats one in `utilities` regardless of
  specificity. A stylesheet-only attempt to override `[hidden]` at the row breakpoint cannot
  win that fight; driving the attribute itself is the only thing that works.
- **The tricolour indicator changes only on the active state, never on hover, for a
  non-active item.** `primary-nav.tsx`'s `topLevelClass` (lines 363–368) makes hover/focus
  change **text colour only** (`--color-text-link`). Two tricolour underlines lit at once —
  the current page's permanent one and a hovered item's temporary one — would hide which
  page the reader is actually on.
- **`keepsCardInDrawer` and `badge` are typed fields on `NavItem`, not string comparisons
  against `item.key`.** `item.key` is a plain `string`; comparing it directly
  (`item.key === "athletics"`) compiles cleanly even with a typo and fails silently. A typed,
  optional boolean field cannot silently drift the same way.
- **`pagePart()` strips `#fragment` and `?query` before any route is registered, matched, or
  listed in the footer.** `/athletics#disciplines` is a position inside a page, not a
  separate page; `isWithin`, `navDestinations` and the built-routes check all compare the
  page part, never the raw `href`. Skipping this is the single most likely way to introduce a
  broken link or a duplicated footer entry (see Mistake 1 below).
- **The middle content track exists as a general `MegaPanel` mechanism, not a Media-only
  special case.** The design spec names a "links column, a links-or-content column, and a
  feature card" generically for three different panels (Championships, Events & Seasons,
  Media); only Media has a live reader for it today (the latest article), but the slot itself
  is shared plumbing (`middleFor` in `primary-nav.tsx`, `panelMiddle` in `cards/index.tsx`),
  not bespoke Media code.
- **State changes that must happen before the next paint are applied during render, not in an
  `useEffect`.** `header-shell.tsx:97–113` closes an open panel or the drawer when the route
  changes, and closes the drawer if the row layout appears mid-session, using React's
  "adjust state while rendering" pattern (comparing a derived `renderedPath`/`wasRow` against
  the live value) rather than an effect. An effect would paint one frame with the stale state
  still visible — the new page with the old panel open, or the row appearing with the drawer's
  scroll lock still held — before correcting itself.

### 5. How to extend it

**Adding a nav item:**
1. Add the entry to the right column's `children` array in `PRIMARY_NAV`
   (`navigation.ts`) — a leaf needs `key` and `href` at minimum; add `descriptionKey` if the
   design calls for a supporting line.
2. Add the matching `key` (and `descriptionKey`, if any) to **both**
   `apps/web/messages/ar.json` and `apps/web/messages/en.json` under `Nav`, in the same
   position in both files. `message-parity.spec.ts` fails if a key exists in one language and
   not the other, or is unused (orphaned) in both.
3. If the destination's page does not exist yet, register its route in `PREPARING_PAGES`
   (`apps/web/src/lib/pages/public-pages.ts`) so `isBuilt()` and the sitemap/`noindex`
   machinery know about it; once built, move it to `PUBLIC_PAGES`.
4. Add an icon mapping for the new `key` in `nav-icon.tsx`'s `ICONS` map — if you skip this,
   the item still renders (the fallback glyph), so this step is a polish step, not a
   correctness one.
5. Run `cd apps/web && npx vitest run src/lib/navigation.spec.ts src/lib/i18n/message-parity.spec.ts && npx tsc --noEmit`.

**Adding a new HeaderFeatures card source:** add a reader function in `features.ts` following
the existing four (own `try/catch`, added to the `Promise.allSettled` array in
`getHeaderFeatures`, an explicit `null` case documented if the source does not exist yet);
wire its result through `panelFeature`/`panelMiddle` in `cards/index.tsx` for the panel that
should show it.

### 6. Three mistakes someone will make

1. **Registering a route with its `#fragment` or `?query` still attached**, instead of its
   page part. `/events?view=calendar` must be registered (in `PUBLIC_PAGES`/`PREPARING_PAGES`)
   as `/events`, because `pagePart()` strips the query before `isBuilt`/footer matching ever
   sees it. Register the raw string instead and `navigation.spec.ts`'s "every href resolves to
   a registered page" test fails immediately — a fast, loud failure, not a silent one.
2. **Adding a new server-fetched field to `HeaderFeatures` without its own `try/catch`
   inside the reader function**, relying only on the outer `Promise.allSettled`.
   `Promise.allSettled` only catches a promise that **rejects**. A reader that resolves
   successfully with a malformed or `undefined` value (for example, forgetting a null check on
   an empty API response) will hand a panel a broken shape instead of the standing fallback
   card — no rejection occurs, so nothing is caught. Every existing reader in `features.ts`
   wraps its own body in `try/catch` for exactly this reason; a new one should too, and should
   have its own isolation test modelled on `features.spec.ts`'s existing "a failing source
   resolves to null for its own field, leaving the others intact" case.
3. **Forgetting that the drawer and the search dialog share one focus-trap contract and
   must never both be open at once.** Opening search from inside an open drawer, without
   first closing the drawer, would stack two independent Tab traps, each cycling focus through
   only its own subtree — a keyboard user could never reach the other's controls. The existing
   code closes the drawer before opening search (`header-shell.tsx`'s `onOpenSearch` for the
   drawer's own tools row); a new modal surface added to the header needs the same discipline.

### 7. Tests that guard it

- `apps/web/src/lib/navigation.spec.ts` — the tree matches the spec (item order, panel/column
  shape, badge placement); every `href` resolves to a registered page; anchors/queries are
  stripped before matching; the footer never lists a destination twice.
- `apps/web/src/lib/i18n/message-parity.spec.ts` — no `Nav` key exists in one locale without
  the other; no orphaned key.
- `apps/web/src/lib/design-system/direction-and-logo-contract.spec.ts` — the row/drawer
  breakpoint constant agrees across `matchMedia`, the Tailwind variant and the token; the
  tricolour indicator's source contains the gradient/width tokens and no hex literal or
  `--color-brand-primary`; the CSS carries no `:hover`/`:focus-visible` rule on
  `.nav-indicator` outside an open panel.
- `apps/web/src/components/layout/site-header.test.tsx` — the largest suite (500+ cases across
  many `describe` blocks): drawer accordion behaviour, the drawer's modal contract (dialog
  role, Tab containment across many presses, Escape-returns-focus), scroll lock and its
  restore value, the row-appearing-mid-session close, card rendering from server data with no
  client fetch, the live-stream item's appearance/disappearance, Ctrl/Cmd+K.
- `apps/web/src/components/layout/use-focus-trap.spec.tsx` — the trap restores focus only to a
  still-connected, still-rendered element; skips restoration when the trigger has vanished
  (crossed the breakpoint while open).
- `apps/web/src/components/layout/mega/mega-column.spec.tsx`,
  `mega-link-prefetch.spec.tsx`, `nav-icon.spec.tsx` — column/link rendering, the
  live-stream item's conditional visibility, prefetch computed from the page part (not the raw
  href), icon fallback behaviour.
- `apps/web/src/lib/header/features.spec.ts` — each source's isolation (one failing source
  never affects the others), the function never rejects, explicit-null fields stay `null`.

### 8. What was deliberately not built, and why

- **A `/search` results page.** The dialog alone — five results per group, "show more" up to
  the endpoint's ten-item ceiling — is the whole search surface; a standalone page was in an
  earlier draft of the spec and was withdrawn by the owner.
- **A pulsing live-stream indicator.** No motion token on the design system's scale licenses
  a continuous, above-the-fold pulse (every candidate token is restricted to a different,
  already-spoken-for use). The dot is static; its title caption carries the "this is live"
  meaning instead.
- **A season picker inside the Events & Seasons panel, and a season summary inside the
  Championships panel.** Both are named in the design spec as a "middle" track occupant, and
  both have no reader today — no season/championship collection exists yet. The mechanism
  (the middle slot) is built and shared; the specific readers are explicitly deferred to a
  later project in the same series.
- **A detail page for an individual athlete, club or coach.** Search links to these as
  same-page anchors (`/athletes#slug`, `/clubs#slug`, `/coaches#slug`) because no `[slug]`
  detail route exists under any of the three directory pages.

### 9. Vocabulary

- **`NavItem`** — one node in the navigation tree: either a destination (`href` set) or a
  group (`children` set); never both.
- **`NavLeaf`** — a `NavItem` narrowed to guarantee `href` is present and `children` is not;
  the type the footer and sitemap consume.
- **Panel** — a top-level `NavItem` with `children`; disclosed by a button, rendered by
  `MegaPanel`.
- **Column** — a panel's child: itself a `NavItem` with no `href`, laid out by `MegaColumn`
  under a visible heading.
- **Feature slot / "middle" slot** — the two promotional tracks a panel can carry alongside
  its columns: `feature` (a fixed-width card) and `middle` (a second links-or-content track).
  Both are omitted from the drawer unless the panel sets `keepsCardInDrawer`.
- **Disclosure Navigation** — the WAI-ARIA APG pattern this header uses: a button that
  reveals a plain list of links, distinct from an application `role="menu"`.
- **`isBuilt` / page part** — `isBuilt(pagePart(href))` decides whether a link should
  prefetch; `pagePart` is the address before any `#`/`?`.

---

## Part 2 — Search

### 1. Why it was built this way, and what was rejected

Search did not exist before this batch — the design spec's earlier sections assumed an
existing search surface that turned out not to exist, and §15 replaced that assumption with a
full build: a new public NestJS endpoint plus a client-side dialog.

**`$text` over Atlas Search.** Atlas Search (which would stem Arabic properly through a
`lucene.arabic` analyzer) was rejected outright, not deferred: the project's database is a
local, self-hosted MongoDB instance with no Atlas cluster to run it on. Building against
infrastructure the project does not have would be speculative; `$text` with spelling
normalisation is what the actual deployment can do.

**A same-origin relay route, not a direct client call to the API.** The NestJS API has no
`app.enableCors()` call anywhere. A browser `fetch` from the search dialog cannot reach the
API's own origin directly in any environment where the two run on different origins (true in
local development: web on :3002/:3000, API on :3000). `apps/web/src/app/api/search/route.ts`
exists for exactly this reason, mirroring the same pattern the project already uses for
`/api/contact` — forwarding a named allow-list of query parameters rather than the whole
request, so a caller cannot smuggle an extra parameter through.

**A dialog, not a dedicated results page.** See Part 1 §8 — this was withdrawn from the
original spec by the owner in favour of the dialog alone.

**A plain `role="dialog"` element, not a native `<dialog>`.** The same choice the existing
video-player modal made: a native `<dialog>`'s built-in Escape handling clears a `type="search"`
input's value on the first press in Chromium before the app's own handler ever runs. Using
`type="text"` (never `type="search"`) and handling `Escape` explicitly on the dialog element
sidesteps that browser behaviour entirely, and keeps every overlay's keyboard handling the
same shape.

### 2. File map, in the order data flows through them

| Order | File | Role |
| --- | --- | --- |
| 1 | `apps/web/src/components/layout/header-shell.tsx` | The Ctrl/Cmd+K listener (ignored while a text field has focus) and the `<SearchDialog>` mount point. |
| 2 | `apps/web/src/components/search/search-dialog.tsx` | The dialog shell: combobox input, type tabs, keyboard handling (`Escape`/arrows/`Enter`), focus trap, scroll lock. |
| 3 | `apps/web/src/lib/search/client.ts` | `useSearch(term, locale)` — 200ms debounce, `AbortController`-based cancellation, `idle`/`loading`/`ready`/`error` state, `requestMore`. |
| 4 | `apps/web/src/app/api/search/route.ts` | Same-origin GET relay to the API, with its own 4s timeout and abort-forwarding. |
| 5 | `api/src/modules/platform-administration/search/search.controller.ts` | `GET /search/public` — `@Public()`, `@RateLimit(60, 60)`. |
| 6 | `api/src/modules/platform-administration/search/dto/query-search.dto.ts` | Request validation: `q` a required, length-bounded string; `limit` clamped, never rejected; unknown fields rejected by the global `ValidationPipe`. |
| 7 | `api/src/modules/platform-administration/search/search.service.ts` | Orchestrates every registered source in parallel (`Promise.allSettled`), normalises the term, builds each `SearchHit`. |
| 8 | `api/src/modules/platform-administration/search/arabic-normalize.ts` | Folds alif forms, ta marbuta/ha, alif maqsura/ya, hamza carriers, diacritics, tatweel. |
| 9 | `api/src/modules/platform-administration/search/search-sources.ts` | `buildSearchSources(models)` — the six registered sources, each with its own real public-visibility filter and `hrefOf`. |
| 10 | Six schema files (`article`, `album`, `video`, `club`, `athlete`, `coach`) | Each carries one `search_text` index, `default_language: 'none'`, added at the bottom of the file — no `@Prop` touched. |
| 11 | `apps/web/src/components/search/search-results.tsx` | Pure rendering: idle/loading/error/empty states, the grouped listbox, "show more" per group. |

### 3. One real example, traced end to end: searching for a club

A reader presses Ctrl/Cmd+K anywhere on the site (outside a text field) and types "نادي":

1. **`header-shell.tsx:124–141`** — the `keydown` listener checks the key is `k` with
   `ctrlKey`/`metaKey`, confirms `document.activeElement` is not a text field, then calls
   `setSearchOpen(true)`.
2. **`search-dialog.tsx:135–142`** — an effect fires on `open` becoming `true` and focuses
   the input (`inputRef.current?.focus()`) in the same commit, no extra frame.
3. The reader types "نادي" into the `<input role="combobox">` (`search-dialog.tsx:223–237`),
   updating local `term` state on every keystroke.
4. **`lib/search/client.ts:101–140`**, `useSearch`: after the term stabilises for 200ms, it
   calls `fetchSearchGroups`, which builds `/api/search?q=نادي&locale=ar&limit=5`
   (`buildSearchUrl`, lines 48–57).
5. **`app/api/search/route.ts:18–49`** relays the request to
   `${UAEAF_API_URL}/api/v1/search/public?q=نادي&locale=ar&limit=5`, forwarding only the
   four named parameters (`q`, `locale`, `types`, `limit`), with a 4-second timeout and the
   browser's own abort chained through.
6. **`search.controller.ts:19–25`**, `GET /search/public` (`@Public()`, `@RateLimit(60, 60)`)
   calls `service.search(q, locale, types, limit)`.
7. **`search.service.ts:103–128`**, `search()`: `normalizeArabic(q)` runs first; then, since
   `types` is undefined, every one of the six registered sources is read in parallel via
   `Promise.allSettled(wanted.map((source) => this.readSource(...)))`.
8. For the `clubs` source (`search-sources.ts:141–152`): the query filter is `{ status:
   'Active', archivedAt: null, $text: { $search: '<normalised term>' } }`, run against the
   `Club` model, matched via the `search_text` index on `name.ar`/`name.en`.
9. **`search.service.ts:165–177`**, `readSource` (the non-`resolvePublicRows` branch used by
   `clubs`): runs the `find` and a `countDocuments` on the identical filter in parallel, so
   `total` and `items` can never diverge for this source.
10. **`search.service.ts:180–201`**, `toHit`: builds one `SearchHit` per matched row — title
    from `name.ar`/`name.en` (falling back to the other language if the requested one is
    empty), `href` from `hrefOf` (`/clubs#${slug}`), never a bare `_id`.
11. **`search.service.ts:120–127`** — only groups with at least one item are included in the
    response; a source with zero matches (or one that threw) is simply absent, not an empty
    array.
12. The relay returns the JSON body verbatim; `fetchSearchGroups` (`client.ts:63–77`) parses
    it, and `useSearch` sets state to `"ready"` with the new `groups`.
13. **`search-results.tsx`** renders the grouped listbox. The reader presses `ArrowDown` then
    `Enter`; **`search-dialog.tsx:171–194`**'s `onDialogKeyDown` moves
    `aria-activedescendant` on `ArrowDown` and, on `Enter`, calls `router.push(active.href)`
    then `onClose()`.

### 4. Non-obvious decisions and their reasons

- **The search term reaches Mongo only inside `$text.$search`, never spread into a filter
  object.** `readSource` (`search.service.ts:136`) always builds
  `{ ...source.publicFilter, $text: { $search: term } }` — `term` is always the `string`
  `normalizeArabic` returns. A payload like `{"$ne": null}` or a query-string shape like
  `?q[$ne]=1` (which Express turns into an object) is rejected before it ever reaches the
  service, because `QuerySearchDto.q` is `@IsString()` with the global `ValidationPipe`'s
  `forbidNonWhitelisted: true`.
- **`total` is counted differently depending on whether a source needs a cross-collection
  join.** For five of the six sources, the model queried **is** the public row, so
  `countDocuments(filter)` on the same filter `find` uses can never disagree with `items`. For
  `athletes` — the one source whose text index (`Athlete.name`) lives in a different
  collection from its public identity (`AthleteProfile`) — `total` is deliberately counted
  **after** the profile join, from the same resolved array `items` is sliced from. Counting
  before the join would let a caller learn, from the number alone, that a non-public athlete
  (no live profile) exists by that name, without ever seeing one of their fields.
- **Athlete, club and coach results link to a same-page anchor
  (`/athletes#slug`), not a detail route.** No `[slug]` page exists under any of the three
  directories yet; the anchor form matches the one these directory pages already support.
- **A new search source is one array entry, not a service change.** `SEARCH_SOURCES` is not a
  bare exported constant — it is `buildSearchSources(models)`, called once in
  `SearchService`'s constructor — because every Mongoose model in this codebase is reached
  through `@InjectModel` in a constructor, never held as a module-level singleton. Adding a
  seventh source is exactly one object literal in the array plus one schema index; nothing in
  `SearchService` or `SearchController` needs to change.
- **"Show more" issues a second, narrower request rather than paging.** It re-queries with
  `types=<thatType>&limit=10` and merges only that group's `items`/`total` back in, leaving
  every other visible group untouched. The button disappears once a group reaches ten items
  even if `total` is larger, because the endpoint clamps `limit` at 10 and there is no further
  page to request — showing the button anyway would promise a page the endpoint cannot serve.
- **A superseded keystroke's response can never overwrite a newer one.** Both the success and
  error branches of the debounced fetch in `useSearch` check `controller.signal.aborted`
  before touching state, and each new term's effect aborts the previous term's in-flight
  request in its cleanup. This is structural (the abort happens before the next request
  starts), not a flag checked after the fact.

### 5. How to extend it

**Adding a search source:**
1. Confirm the collection's real public-visibility filter by reading its existing public
   service method (e.g. `ClubsService.findAllPublic`) — never assume `archivedAt: null` alone
   is sufficient; check whether a `status`/`publicationState` gate also applies.
2. Add a `Schema.index({ '<field>.ar': 'text', '<field>.en': 'text' }, { default_language:
   'none' })` to the collection's schema file, next to its existing indexes — never touch an
   `@Prop`.
3. Add one entry to the array `buildSearchSources` returns in `search-sources.ts`: `key`
   (add it to `SEARCH_SOURCE_KEYS` too), `model`, `titlePath`, `subtitlePath`, `thumbnailPath`,
   the confirmed `publicFilter`, and `hrefOf`. Only set `resolvePublicRows` if the text index's
   collection differs from the collection that defines public visibility (the `athletes`
   pattern).
4. Mirror the new key in `apps/web/src/lib/search/client.ts`'s `SEARCH_SOURCE_KEYS` array and
   in `search-dialog.tsx`'s `TAB_LABEL_KEYS` map (reusing an existing `Pages.*` label if one
   already names this noun elsewhere in the site, rather than adding a second string for the
   same concept under `Search`).
5. Write a `search.service.spec.ts` case that asserts the new source's `publicFilter` matches
   what you confirmed in step 1, and a case proving a source-level failure still lets every
   other source's group return.

### 6. Three mistakes someone will make

1. **Adding a text index without `default_language: 'none'`.** MongoDB's default text-index
   language applies English stemming and stopword removal, which behaves unpredictably against
   Arabic content and silently degrades matches — the field will "work" against English test
   data and quietly fail against the Arabic rows the endpoint exists to search. No automated
   test currently catches a missing option on a brand-new index; verify with `mongosh`'s
   `db.<collection>.getIndexes()` before considering the index done, the way the original
   build's own pre-check did.
2. **Assuming a resource's public filter is just `archivedAt: null`.** Two of the six sources
   in this codebase needed a second condition (`status: 'Active'` for `clubs`/`coaches`) that
   the collection's own soft-delete scope alone does not provide; copying only the archive
   check would surface an inactive club or coach in public search results.
3. **Counting `total` from the same query `items` is capped by, for a source that needs a
   cross-collection join.** If a future source resolves matches through a second collection
   the way `athletes` does, counting the raw first-collection matches (rather than the
   resolved, joined set) leaks the existence of a non-public row through the number alone —
   this was an actual, fixed defect in this exact code (see the ADR's D8 security-review
   note). Any join-shaped source must count from the same resolved array its `items` slice
   comes from.

### 7. Tests that guard it

- `api/.../search/arabic-normalize.spec.ts` — every normalisation rule (alif forms, ta
  marbuta/ha, alif maqsura/ya, hamza carriers, diacritics, tatweel).
- `api/.../search/search.service.spec.ts` — per-source filter correctness; the term never
  reaches Mongo as an operator; a failing source drops only its own group; `athletes`' `total`
  matches its resolved, joined item count, never the raw pre-join match count.
- `api/.../search/search.controller.spec.ts` — bounds (`q` under 2 chars, `limit` clamped at
  10, unknown `types` ignored silently), the object-injection shape (`?q[$ne]=1`) rejected at
  the `ValidationPipe` boundary, `q` over 80 characters rejected.
- `apps/web/src/components/search/search-dialog.spec.tsx` — arrow-key movement of
  `aria-activedescendant`, `Escape` closing from inside the field, Ctrl/Cmd+K ignored while a
  text field has focus.
- `apps/web/src/components/search/search-results.spec.tsx` — "show more" disappearing once
  the ten-item ceiling is reached even though `total` is larger; a superseded response never
  overwriting a newer one already on screen.

### 8. What was deliberately not built, and why

- **Atlas Search / Arabic stemming.** The deployment has no Atlas cluster; `$text` with
  spelling normalisation is what it can do. A search for "الأندية" will not find "نادي" — this
  is a stated, accepted limitation, not an oversight.
- **A standalone `/search?q=` results page.** Withdrawn by the owner in favour of the dialog
  alone (Part 1 §8).
- **A retry control for the error state.** `Search.retry` exists as a translated string but is
  not wired to a button; re-running a failed debounced request is not currently exposed as a
  callback from `useSearch`.
- **Unlimited pagination.** "Show more" raises a group's limit to the endpoint's fixed ceiling
  of 10 and stops; a true paging control was rejected because the endpoint intentionally caps
  `limit` there for cost reasons, and a control that implied more pages exist would be
  dishonest about what the endpoint can return.
- **A detail page for a matched athlete, club or coach.** See Part 1 §8 — results link to the
  existing directory page's anchor instead.

### 9. Vocabulary

- **Source** — one registered collection (`articles`, `albums`, `videos`, `clubs`,
  `athletes`, `coaches`) `SearchService` can query, described by a `SearchSource` object in
  `search-sources.ts`.
- **`SearchGroup`** — one source's results: `{ type, total, items }`. Absent entirely from the
  response if it matched nothing.
- **`SearchHit`** — one result row: `{ id, title, subtitle, href, thumbnailId }` — never a raw
  document.
- **`resolvePublicRows`** — the optional cross-collection join a source uses when the
  collection carrying its text index is not the collection that defines public visibility
  (only `athletes` needs this today).
- **Relay route** — `app/api/search/route.ts`, the same-origin proxy the dialog actually
  calls, which forwards to the real API endpoint the browser cannot reach directly.
