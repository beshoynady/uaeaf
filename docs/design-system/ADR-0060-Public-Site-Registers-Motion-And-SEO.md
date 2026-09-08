# ADR-0060 — The Public Site: Colour Registers, Ascent Motion, and the Chapter 14 Layer

**Status:** Accepted (implementation), with four items classified `DESIGN DECISION REQUIRED`
**Date:** 2026-09-08
**Supersedes:** nothing. **Extends:** ADR-0059 (registers, ascent angle), ADR-0005 (Brand Pattern component)
**Scope:** `apps/web` — the twelve singleton content pages, the site shell, and the token/motion work they required

---

## 1. Context

ADR-0059 defined three colour registers, measured the identity's ascent angle, and
established that colour is assigned by context rather than by proportion. It applied
none of it: the registers existed as tokens and as a passing test, and the public site
was a header, a footer and a placeholder.

This ADR records what applying them actually required, and — more usefully — the four
places where the design system, the IA and the API disagree with each other in ways that
only became visible once real pages existed.

Every rule below was verified in a running browser against a production build: 112
combinations (7 widths × 2 locales × 2 themes × 4 pages) plus a per-page SEO pass.
Numbers quoted are measured, not derived.

---

## 2. D1 — Register assignment comes from the guide's own captions

ADR-0059 §D1 retired the 70–80/15–20/≤5 budget and replaced it with the guide's logic:
colour marks *what a region is*. That logic is stated in the guide's page captions and
repeated across the document — §2.3 referees wear **red**, §3.3 administrators wear
**green**, §1.3 athletes in international context wear **white**, and every local
championship garment from §4.3 onward is **red**.

Read onto the twelve pages:

| Register | Pages | Guide basis |
| --- | --- | --- |
| green | board-members, committees | §3.3 administrators; §3.34.2 files both under Quiet/Institutional, "White + Green only" |
| red | records, results-rankings | §2.3 officiating; §3.34.1 gives Red "competitive/results emphasis" |
| black | contact-us, plus the site footer | §3.34.2's one row naming a flat dark hero acceptable "for this category specifically" |
| neutral | news, athletes, clubs, coaches, disciplines, albums, videos | §1.3 athletes; §3.34.2 gives News/Media a neutral background in as many words |

**Seven of twelve staying neutral is the correct outcome, not a shortfall.** §3.34.3's
binding rule is that the identity MUST NOT be applied "in the same way or proportion on
all pages". What changed from the state ADR-0059 diagnosed is that green no longer wins
by default: it has two pages, red has two, black has one plus every page's footer.

**Alternative rejected:** giving each of the twelve a coloured band so the site "looks
colourful". That is the numeric-budget thinking ADR-0059 retired, wearing different
clothes — it assigns colour by quantity rather than by meaning, and §3.34.2 explicitly
assigns News/Media a neutral ground.

### D1.1 — The adjacency rule is a component, not a sentence

ADR-0059 §D2 measured Federation Green against Federation Red at **1.15:1** and made a
separator mandatory between them. `SectionStack` inserts it by walking its children's
registers, so the omission is impossible rather than merely discouraged. Two bands at
1.15:1 do not look wrong in review — they look like one band, which is exactly the class
of defect a reviewer cannot be relied on to catch.

The separator is `--space-2` (8px). Derived from Chapter 3 §3.14's 8pt scale ("no free
value outside this list"); `--space-1` at 4px reads as a rendering artefact of the border
above it, which is the opposite of the point.

---

## 3. D2 — Motion is derived from the mark, and its tokens are measured

ADR-0059 §D7 fixed the ascent angle at 45° from a measured mean of 44.46°. Four primitive
tokens now carry it into CSS:

| Token | Value | Basis |
| --- | --- | --- |
| `--motion-ascent-angle` | `45deg` | ADR-0059 §D7 |
| `--motion-ascent-offset` | `{space.4}` = 16px | Equal on both axes — the equality *is* the angle |
| `--motion-ascent-stagger` | `60ms` | Chapter 5 §5.7: 40–80ms; 60 is the midpoint |
| `--motion-ascent-stagger-steps` | `10` | §5.7 caps total stagger at 600ms; 10 × 60 is exactly that ceiling |

Three rules shape the implementation, and two of them are not obvious:

**Scroll reveal animates `transform` only, never `opacity`.** A scroll-driven animation is
the one kind whose end state a static render — a crawler, a print, a screenshot — is not
guaranteed to reach. Chapter 14 makes indexability a hard requirement, and an element
parked at `opacity: 0` waiting for a scroll that never comes is content that may not be
seen. Moving an already-opaque element costs nothing if the animation never runs.

**`prefers-reduced-motion` has to be checked at the query, not at the token.**
`animation-timeline` ignores `animation-duration`, so neither the global
`* { animation-duration: 0.01ms }` reset nor the zeroed duration tokens stop a
scroll-driven animation. The whole `@supports (animation-timeline: view())` block sits
inside `@media (prefers-reduced-motion: no-preference)`. Verified in the browser with the
media feature emulated: `animation-name` resolves to `none`, `transform` to `none`,
`opacity` to `1`.

**The ascent does not mirror under RTL** (ADR-0059 §D7.1). CSS `transform` is physical and
never mirrors, so this is correct by construction — but it is stated in the stylesheet so
a future reader does not "fix" it into a logical property.

`--motion-transition-celebratory` — built, never consumed — now has one sanctioned home:
`.rise-celebratory`, reserved for the National Records page per Chapter 5 §5.6's
"record/medal celebratory moments only".

---

## 4. D3 — Chapter 14 is implemented as a layer, not per page

Chapter 20's Shared Rule is absolute: every public template "MUST fully implement Chapter
14", with "no exceptions for any public-facing page". Implemented once in
`lib/seo/metadata.ts` and `lib/seo/json-ld.tsx`, and enforced by `seo-contract.spec.ts`,
which fails if a route hand-rolls its own `Metadata` object — because a hand-rolled object
gets a title and silently loses the canonical (§5) and the hreflang (§10).

Measured on the running build, all 13 routes × 2 locales: one `<h1>` each, zero
heading-level skips, canonical on every page, three `hreflang` links plus `x-default`,
Open Graph and Twitter Card present, JSON-LD parsing to the type Chapter 14 §4 prescribes.

### D3.1 — §11 decides indexability, and it decides it once

Chapter 14 §11: a page that does not meet the minimum content threshold "MAY exist
internally within the platform but SHOULD remain temporarily `noindex` until the required
content is complete."

Nine of the twelve have no public list endpoint upstream, so they are hero-and-nothing-else
and carry `noindex, follow` — *follow*, not *nofollow*, because their internal links are
still worth crawling. The rule lives in one function (`lib/pages/indexability.ts`) because
it has two consumers that must never disagree: the page's own `robots` directive and §13's
sitemap ("Content in any state other than `Published` MUST NOT appear in any Sitemap").

Verified: the sitemap contains exactly 6 URLs — the three pages with content, in both
locales — and every other page's head carries `noindex`.

**Alternative rejected:** indexing all twelve because a listing page "will have content
soon". That is what §11 exists to prevent, and an indexed thin page is harder to recover
from than an unindexed one.

### D3.2 — The homepage ships `noindex`, deliberately

`/` is the site's most important URL and shipping it `noindex` looks wrong. What is
currently at `/` is one heading and one sentence saying the page is under construction —
§11's "MUST NOT rely solely on empty fields, placeholders" describes exactly that, and
PR-010 forbids showing "Coming Soon" to the public at all. An indexed placeholder homepage
is what search engines would cache as the federation's front door. It flips in the change
that lands the approved sections.

---

## 5. D4 — The brand mark is bound to tokens, and the binding is tested

ADR-0059 §D7.2 recorded that the committed artwork used three colours that are not the
federation's. The audit widened once real components consumed it: **ten files** across
`apps/web/public/brand`, `apps/dashboard/public/brand` and `docs/design-system/brand-assets`
carried `#008542` for Federation Green (`#00843D`), `#c8202f` for Federation Red
(`#C8102E`), or `#1b1718` for Black (`#000000`) — the **logo itself**, not only the ribbon
motif §D7.2 named.

All ten corrected, and `brand-asset-contract.spec.ts` now reads the official values out of
the token build and fails on anything else. Two further guide §9.1 prohibitions are
enforced by the same test:

- **Stretching.** The exported files carried `preserveAspectRatio="none"`, which makes
  stretching the *default* rather than a mistake someone has to make. Removed; the test
  rejects it.
- **Outlining and drop shadows.** `UaeafLogo` takes no border, ring or shadow prop.

The mark and the motif are now React components with `var(--color-brand-*)` fills —
ADR-0059 §D7.2's stated root-cause fix, and ADR-0005's still-unbuilt Brand Pattern
component, closed together.

> **A defect this ADR exists partly to record.** The first generated `UaeafLogo` shipped
> with `d="Vector"` on all nine paths: the extraction regex accepted the `d="` at the tail
> of `id="`. Types passed, the build passed, 138 tests passed — and the logo rendered as
> **nothing at all** while Chrome logged nine SVG parse errors on every page load. It was
> found by opening the page in a browser, not by any check. The guard added afterwards is
> exact: every SVG path begins with a moveto, so a `d` that does not start with `M` or `m`
> is not path data.

---

## 6. Deviations, each measured

### D5 — The navigation row starts at `xl`, not at the documented 1024px

**IA §8.1 behaviour note:** "below 1024px the whole bar collapses into a drawer with the
same tree."

**Measured:** at a 1024px viewport the nine Arabic labels need **1066px** of intrinsic
width on their own, before the 120px logo and the 158px utility cluster. The row
overflowed the document by 360px — reported by the browser, invisible to every test.

**Reconciliation:** §8.1's 1024 predates §8.1 itself. It describes the header *as built*,
which carried **seven** items; the Product Owner ruling in that same section raised it to
**nine** and nobody re-derived the width. `xl` (1280px) is the first Chapter 5 §5.2 band
where the row measurably fits — a documented breakpoint, not an invented one
(CLAUDE.md §1a.2).

**`DESIGN DECISION REQUIRED`:** nine items in a 96px bar need either this threshold or a
shorter label set. That is the owner's call, not an implementation detail.

**Alternative rejected:** shrinking the type or the logo to force the row in at 1024.
Chapter 4 governs the type scale and guide §4.1 governs the mark; neither yields to a
layout convenience.

### D6 — Below 1024px there had been no navigation at all

Not a reduced navigation — none. The nav was `hidden lg:block` and nothing replaced it, on
the layer PR-006 calls mobile-priority. It is now one list that lays out as a row at `xl`
and as a disclosure panel below it: **one** set of links, so the tab order is not doubled
and a defect has one place to be fixed. `hidden` when collapsed, so the links leave the tab
order rather than staying reachable behind a closed panel.

### D7 — The footer used one 64px gutter at every width

`px-16` at 320px left 192px of content for a `whitespace-nowrap` copyright line that needs
324px; the footer's own `overflow-hidden` then clipped it, so the text was simply cut off
and nothing reported it. Replaced with Chapter 5 §5.2's margin column read straight down —
16 · 24 · 32 · 48 · 64 — and the copyright now wraps.

### D8 — The 404 screen did not exist

IA §4.5 files it **P0** ("platform is not launchable without these"). The site had Next.js's
unstyled default, outside the app shell, in one language. It is reached often today: the
approved navigation points at nine destinations with no page yet, and Next prefetches every
link that enters the viewport — **451 prefetch 404s across a 112-page sweep**, roughly ten
per page load.

Now a designed page inside the shell, in the reader's language, listing the pages that do
exist. Prefetching is switched off for unbuilt destinations, derived from the page registry
so a route becomes prefetchable the day its page is registered. The links themselves stay:
IA §8.1 is the approved navigation and removing an item would be an IA change.

---

## 7. Blocked — API gaps the presentation layer must not paper over

None of these is fixable in `apps/web`, and the owner's standing boundary is that any need
for a field or data structure goes through the backend and the admin panel first.

| # | Gap | Effect | Evidence |
| --- | --- | --- | --- |
| 1 | **No public read of media.** `GET /media-assets/:id` carries `@RequirePermission('mediaAssets','Read')`; there is no `@Public()` route. | All twelve pages carry `heroImageId`, the admin panel offers a picker for it, and the public site cannot resolve it to a URL. Every hero is typography-led whether or not an editor set an image. | `api/src/modules/media-center/media-assets/media-assets.controller.ts` |
| 2 | **No public list for nine content types** — articles, clubs, coaches, disciplines, records, results, videos; albums exposes `public/:slug` only, committees `:id/public` only. | Nine listing pages have nothing to list, and stay `noindex` under Chapter 14 §11. | `@Public()` audit across `api/src/modules` |
| 3 | **Board photos unreachable.** `federation-personnel/public` returns `photoId`, blocked by gap 1. | The board grid is name + biography + contact. | same as 1 |
| 4 | **Athlete directory cannot show disciplines.** `athletes/public` returns `nationalityId` and `disciplineIds` as raw references; neither collection has a public read. | Name and federation only. Showing an unresolved ObjectId would be worse than showing nothing. | `athlete-public-response.dto.ts` |

---

## 8. The 174 exported design assets

`apps/web/public/design-assets` holds 174 files (~98 MB) committed from Figma and
referenced by **zero** components. Classified rather than shoehorned:

| Group | n | What it is | Blocker |
| --- | --- | --- | --- |
| pages | 43 | Full-page exports of the president's message, policies and strategic plan, plus their photography | Those three pages are workflow-governed and the API exposes **no update path** for them (`static-pages.ts`) |
| videos | 22 | 11 thumbnails + 11 icons | Gap 2 — no public video read |
| athletes | 20 | 5 card photos carrying mockup names, plus icons | Names are mockup content; real athletes come from `athletes/public`, which has no photo |
| albums | 17 | 15 cover photographs | Gap 2 — no public album list |
| sponsors | 15 | 6 sponsor logos + marquee art | Homepage sections — deferred by the owner |
| memberships | 14 | 4 affiliation logos at two sizes | **See below** |
| news | 13 | Photography + icons | Gap 2, and the photographs are mockup content |
| hero | 11 | Homepage hero slides + 4 brand vectors | Homepage — deferred |
| media | 10 | Media-centre section mockup | Homepage section |
| clubs | 9 | **8 real emirate club crests** | Gap 2 — no public clubs read to attach them to |

**The memberships group is the one with an available consumer today**, and it is blocked on
a documented conflict rather than a technical one. IA §8.3 lists an "Affiliations strip" as
part of the footer *as built*; the approved footer redesign that supersedes the old master
(recorded in project memory, 2026-09) describes a location map and five social icons and
does not mention it. Adding the strip would also require Arabic names for four
international bodies, which is content.

**`DESIGN DECISION REQUIRED`:** does the approved footer include the affiliations strip? If
yes, the four logos and their bilingual captions come through the CMS like any other
content.

The honest summary is that these assets are overwhelmingly homepage material and
CMS-content stand-ins. Using the athlete cards or news photographs on a live federation
site would present mockup people and mockup stories as real, which no amount of "the
assets were going unused" justifies.

---

## 9. Other items requiring an owner decision

| # | Item | Why it cannot be decided here |
| --- | --- | --- |
| 1 | **Production hostname.** Canonical and hreflang URLs are absolute by definition; `NEXT_PUBLIC_SITE_ORIGIN` currently falls back to `localhost:3001`. | Configuration, but it must be set before launch or every canonical points at localhost. |
| 2 | **Cache freshness.** No caching, ISR or staleness policy exists anywhere in the design system — Chapter 21 does not mention revalidation. 60s is a placeholder balancing Chapter 14 §7 (Core Web Vitals) against Chapter 13's editorial expectations. | A product decision about how fast an editor's change should appear. |
| 3 | **`/records` and `/results-rankings` URL depth.** IA §3.1's tree puts them under Events; §8.1's resolved navigation — which supersedes the older description — lists neither. Flat is the reading that does not invent a parent. | `PENDING FIGMA BACK-SYNC` (CLAUDE.md §1a.3). |
| 4 | **Footer link touch targets.** IA §12 states ≥44px on every small screen as a KPI. The approved footer composition's links measure 15–17px tall and its social buttons 32×32; CLAUDE.md §3 protects that composition. | The KPI and the approved composition disagree. Raising the links to 44px changes the footer's vertical rhythm materially. |

---

## 10. Verification

Production build, live browser, nothing asserted from source.

| Gate | Method | Result |
| --- | --- | --- |
| Responsive | 7 widths (320 + all six §5.2 bands) × 2 locales × 2 themes × 4 register pages = **112 loads** | `scrollWidth == clientWidth` in **112/112**; `dir` correct in all; exactly one `<h1>` in all |
| Contrast | Computed from the colours the browser painted, not from the token file | Worst measured heading contrast **8.14:1** against its own register (AA needs 4.5) |
| Focus | Real `Tab` keypresses dispatched over CDP — `.focus()` does not satisfy `:focus-visible` | Painted on all four registers in both themes; best ring/ground ratio **21:1** light, **9.04:1** dark |
| Motion | `prefers-reduced-motion` emulated | `animation-name: none`, `transform: none`, `opacity: 1` — content visible, motion gone. Without it: `uaeaf-rise-track` on `view()`, 45deg, 16px, second item delayed exactly 60ms |
| SEO | 13 routes × 2 locales | 0 heading-level skips · 0 missing canonicals · hreflang + `x-default` on all · sitemap carries exactly the 6 indexable URLs |
| Console | Every load | **0 errors** across 112 loads (from 2507, then 451) |
| Suites | `apps/web` | 139 tests, 10 files — up from 41 |
| Build | `next build`, `tsc --noEmit`, `eslint` | all clean; the pre-existing `react-hooks/set-state-in-effect` error is closed (`useSyncExternalStore`) |

---

## 11. Registry

```text
DT-MOTION-002 · motion.ascent.* (angle/offset/stagger/stagger-steps) · Status: Active · v1.0 · References: [ADR-0060, ADR-0059 §D7] · Applies to: every public entrance and reveal
DT-GOVERNANCE-005 · Register assignment by guide caption · Status: Active · v1.0 · References: [ADR-0060 §D1, ADR-0059 §D1] · Applies to: every public page template
DT-BRAND-001 · Brand artwork bound to tokens, guarded · Status: Active · v1.0 · References: [ADR-0060 §D4, ADR-0059 §D7.2, ADR-0005] · Applies to: every use of the mark or motif
DT-SEO-001 · Chapter 14 as one layer, guarded · Status: Active · v1.0 · References: [ADR-0060 §D3, Chapter 14, Chapter 20 Shared Rule] · Applies to: every public route
```
