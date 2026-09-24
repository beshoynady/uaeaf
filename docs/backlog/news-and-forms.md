# Backlog — Newsroom and Forms

Everything found while the newsroom redesign (Tasks 1–4) and ADR-0097 were
built, and deliberately **not** built with them. Each item names what it is,
the files it touches, why it was left, and whether it should land before the
public launch or after it.

Nothing here is a decision. An item marked "before launch" is a
recommendation, not an approval, and several need an owner or a Design System
decision before anyone writes code. Items that need a new design-system rule
say so and name what is missing, per §16 and §24 of the project governance.

Opened 2026-09-23, at the close of the ADR-0097 correction batch.

---

## Before launch

### 1. Text search on `/news`

**What.** The listing filters by topic, by tag and by date range, and cannot be
searched by words. The API already answers a `search` term.

**Files.** `apps/web/src/lib/news/feed-query.ts` (the query object and
`feedHref`), `apps/web/src/lib/api/articles.ts` (`fetchArticles` does not pass
the term), `apps/web/src/app/[locale]/news/page.tsx`, a new search control
beside `NewsTopicFilter`.

**Why it was left.** It is a new control, not a wiring change: it needs a
placeholder and a label in both languages, an empty-result state that says
what was searched, and a decision about whether the term survives a topic
change. That is a design decision, not an implementation detail.

**Evidence the API is ready.**
`api/src/modules/public-communication/articles/articles.controller.ts:52` passes
`query.search` through, and `articles.service.spec.ts:614` proves the term is
escaped before it reaches the database — so a regular expression typed into the
box cannot reach Mongo.

**Priority.** Before launch. A newsroom that cannot be searched is the
complaint readers make first.

---

### 2. A result count the reader is told about

**Status: mostly BUILT, 2026-09-23** (owner decision). What this item asked
for has landed, except its accessibility half:

- ~~a **"Custom" chip** that opens the two date fields~~ — built, as the last
  option of the time list; the date fields now appear only when it is chosen.
- ~~**no Apply button**~~ — built for the presets, which navigate on change.
  Apply stays on the custom range, and deliberately: two dates a reader is
  still typing are not a filter until they say so, and a half-typed range
  (`from` set, `to` empty) would otherwise narrow the feed mid-keystroke.
- **a result count** in an `aria-live="polite"` region — **still open.** A
  filter that narrows the list to three stories says nothing to a reader who
  cannot see the column reflow, and now that a preset applies on change
  without any button press, there is even less to notice.

**Files.** `apps/web/src/app/[locale]/news/page.tsx`,
`apps/web/messages/{ar,en}.json`.

**Priority.** Before launch. WCAG 4.1.3, and it is a few lines.

---

### 2b. The shelf tabs, and what they left behind

**Built 2026-09-23** (owner decision): `/news` now carries a row of shelf
tabs — الكل / أخبار الاتحاد / الاتحاد في الإعلام — writing `?category=…`,
independent of the topic chips beneath them.

Two things it leaves for later:

- **The tabs are links, not `CMP-TABS-001`.** That component is an ARIA tab
  widget with a roving tabindex, which describes panels swapped inside one
  page; these navigate between addresses, so they take the topic filter's
  `nav` + `aria-current` shape instead. The reasoning is written in
  `category-tabs.tsx`, but the chapter itself says nothing about the
  navigational case — **it should gain a line**, or the next person meets the
  same fork with no guidance.
- **PENDING FIGMA BACK-SYNC.** The approved canvas `NewsListing.dc.html`
  (2026-09-22) has neither the tab row nor the time list. Two new visual
  states with no Figma frame.

**Priority.** After launch, both.

---

### 3. A neutral fallback for a story with no cover

**What.** An article with no cover is drawn on a green gradient with the
federation motif. Down a two-column listing, several coverless stories make a
page that reads as a green-and-black pattern rather than a newsroom.

**Files.** `apps/web/src/components/pages/news/cover.tsx:71` (the `register`
branch), `apps/web/src/lib/news/cover-placeholder.ts`.

**Why it was left.** ADR-0050 governs how much green the site may carry
(~70–80% neutral, ~15–20% green, ≤5% red). A neutral placeholder is almost
certainly right by that rule — but "almost certainly" is not a citation, and
picking the neutral ground, its motif strength and whether the register
survives anywhere is a **DESIGN DECISION REQUIRED**, not a token swap.

**Priority.** Before launch, as a decision. The listing is the page most
affected by it.

---

### 4. The share row: brand icons, and a confirmation

**What.** The share buttons carry generic marks, and "copy link" gives no
answer — the reader cannot tell whether the click worked.

**Files.** `apps/web/src/components/pages/news/share-article.tsx`,
`apps/web/src/components/ui/social-channel-link.tsx` (which already holds real
channel icons, including TikTok, and is the place a shared icon set belongs
under the shared-components rule).

**Why it was left.** Each platform's mark has its own usage licence and its own
clear-space rule; using them is a brand decision. The copied-confirmation is
independent of that and is small: a polite live region saying the link was
copied, cleared after a few seconds.

**Priority.** Before launch for the confirmation (it is a feedback defect,
Chapter 11 §UX). After launch for the icons.

---

### 5. Topic-badge contrast, and the red "International" chip

**What.** Two things to measure, both on `--color-topic-*` (ADR-0094 D2):

- every `surface` / `ink` / `edge` triple against its floors, in all three
  themes — the same measurement ADR-0097 turned out to need;
- whether the **International** chip's red is far enough from Brand Red and
  from Semantic Error to not be read as an error or as a federation mark.

**Files.** `packages/design-tokens/tokens/semantic/colors.{light,dark,high-contrast}.json`
(the `topic` group, from line 378 in the light file),
`apps/web/src/components/pages/news/topic-badge.tsx`,
`packages/design-tokens/tokens/semantic/pairings.json`.

**Why it was left.** It is the same class of defect ADR-0097 just corrected —
colours recorded without every pair being measured — and it deserves its own
pass rather than being appended to a batch about form fields. The ΔE method for
"far enough from a state colour" already exists: ADR-0072 D1, ≥15 under normal,
deuteranope and protanope vision.

**Priority.** Before launch. A chip misread as an error misinforms.

---

### 6. The newsroom hero photograph

**What.** The `/news` hero shows a football pitch. UAEAF is an athletics
federation; the picture contradicts the page.

**Why nothing was changed.** Three separate blocks, and all three hold:

1. The hero image is a `mediaAssets` record referenced by
   `newsPage.heroImageId`. Pointing it somewhere else is a **database write**,
   which this batch was not permitted to make. The dev seed
   (`api/seed/dev/newsPage.json`) carries `heroImageId: null`, so the football
   pitch is a record in the running database, not in the repository.
2. Downloading a picture was forbidden, and no new AI image may be generated
   (owner policy, recorded 2026-09-22).
3. A track photograph **does** exist in the repository —
   `apps/web/public/design-assets/hero/hero-slide-1-photo-1-2374-1203.png`, a
   sprinter on a red track in UAE colours. It is the **homepage hero's own
   photograph**. Reusing it on `/news` would give two pages the same opening
   picture, which is the repeated-template failure the per-page art-direction
   rule exists to prevent.

**What a replacement needs, so it can be commissioned rather than discussed.**

| | |
| --- | --- |
| Subject | Athletics. A track, a field event, or a competition crowd — not a stadium that could be any sport. |
| Ratio | 2616 × 1382 ≈ **1.89:1**, matching `design-assets/contact/contact-hero-2616-1382.png`, the established page-hero frame. |
| Delivered size | **2616 × 1382** minimum, so the frame is exact at 2× on a 1312px container. |
| Format | AVIF and WebP, JPEG fallback. Next's image pipeline serves whichever the reader accepts. |
| Weight | **≤ 250 KB** for the served AVIF at 1312px wide. This picture is the page's Largest Contentful Paint. |
| Composition | Subject off-centre, with a quiet region for the heading that works **mirrored** — the page runs RTL in Arabic and LTR in English from the same file. |
| Contrast | The heading stands on it: the scrim recipe in `cover-scrim.spec.ts` is the measurement to pass, not a judgement. |
| Provenance | Real photography, or an image whose provenance the owner has approved. Seven of eight existing library assets carry Google C2PA `trainedAlgorithmicMedia`; a hero is the wrong place to add an eighth. |

**Priority.** Before launch. It is the first thing on the page and it says the
wrong sport.

---

### 7. The article page's four small finishes

**What.** Four separate observations on `/news/[slug]`, kept as one item
because they are one screen and one pass:

- **The breadcrumb's last crumb is the whole headline.** A long Arabic title
  wraps the trail onto three lines. It wants a truncation — a character or
  character-ish cap with an ellipsis, the full title still reachable as the
  element's accessible name.
- **Reading time is not shown here.** The listing's cover card shows it
  (`featured-article-card.tsx`, via `readingMinutes`); the article itself does
  not. The number already exists; where it belongs in the byline row is a
  composition decision.
- **An article with no cover leaves the cover's space empty** rather than
  closing it, so the byline and the first paragraph sit further apart than on
  an article that has one.
- **The breadcrumb and the "More news" heading do not align** with the
  article column. The article is `max-w-[72ch]` and centred; the trail above
  it and the related row below it take the full container, so three left
  edges disagree down the page.

**Files.** `apps/web/src/components/pages/news/article-screen.tsx`,
`apps/web/src/app/[locale]/news/[slug]/page.tsx`,
`apps/web/src/components/ui/breadcrumb.tsx`.

**Why it was left.** The last one is the only one that is plainly a defect,
and it is the one with a real question behind it: whether the related row is
*meant* to break the measure — a full-width row under a narrow column is a
deliberate device in editorial layouts, and the approved canvas has to say so.
The other three are each a small composition decision.

**Priority.** Before launch for the breadcrumb truncation and the empty cover
space; after launch for the alignment and the reading time, which need the
canvas re-read first.

---

## After launch

### 8. The footer map in dark mode

**What.** Google's embed is always light. In the dark theme it is a white
rectangle in a dark footer.

**Files.** `apps/web/src/components/pages/contact/location-map.tsx`,
`apps/web/src/components/layout/site-footer.tsx`.

**The usual remedy** is `filter: invert(1) hue-rotate(180deg)` applied only in
dark. Two things to measure before it ships, not after:

- **Cost.** A filter on an iframe forces the compositor to rasterise every
  frame of a map the reader can pan. Measure paint time on the footer, on a
  mid-range phone, before and after.
- **Truthfulness.** Inverting a map inverts its legend: water, parks and roads
  swap into colours that mean something else. Confirm the result still reads
  as a map rather than as a negative of one.

**Priority.** After launch. It is a theme polish item, and a wrong fix is worse
than the white rectangle.

---

### 9. The footer's own finish

**What.** Four separate observations, kept together because they are one
surface and one review:

- the olive ground, and whether it is the intended register;
- the decorative motif crossing **over** the social icons;
- whether the TikTok icon renders at all (the channel exists in
  `social-channel-link.tsx`);
- the logo's size relative to the columns beside it.

**Files.** `apps/web/src/components/layout/site-footer.tsx`,
`apps/web/src/components/ui/social-channel-link.tsx`.

**Why it was left.** The footer was redesigned manually and that redesign is
the source of truth for it. Changing it needs that composition re-read first,
not a set of local corrections. The motif crossing the icons is the one item
that is plainly a defect rather than a question.

**Priority.** After launch, except the motif overlap if it obscures a target.

---

### 10. ADR draft — the pull-quote's ground

**What.** A `blockquote` inside an article is painted
`--color-surface-sunken`, which is `#000000` in dark: a pure-black box inside
the article column.

**Files.** `apps/web/src/components/pages/news/article-screen.tsx:129`.

**Why it is an ADR and not a fix.** `--color-surface-sunken` is used directly
across **both** applications — chips, hover states, media wells, the
source-attribution panel. Changing it restyles all of them. Giving the quote
its own token is the same move ADR-0097 made for the form field, and it should
be argued the same way. ADR-0097 already names this and says explicitly that it
does not cover it.

**Priority.** After launch. It is legible today; it is simply heavier than the
design intends.

---

### 11. "More news" by relatedness

**What.** The four stories under an article are the four most recent, minus the
one being read. Nothing connects them to it.

**Files.** `apps/web/src/app/[locale]/news/[slug]/page.tsx` (`relatedTo`, and
the pool it is given), and an API query that can filter by topic and tags.

**Why it was left.** Real relatedness needs a rule — same topic first, then
shared tags, then recency — and a fallback when the rule returns fewer than
four. Both are decisions. The current behaviour is honest and the heading now
says "More news" rather than claiming a relationship it does not compute.

**Priority.** After launch.

---

### 12. Alternative text as a first-class field

**What.** `mediaAssets` carries `altText` and the article cover renders it, but
there is no enforcement anywhere that it is filled, and no prompt in the
dashboard at the moment an image is chosen.

**Files.** API: `mediaAssets` schema and its DTOs, with the validation written
test-first. Dashboard: `MediaPicker` and the cover field. Web: the places that
render `altText` today.

**Why it was left.** It crosses the API, the dashboard and the public site, and
the API half is a schema change with a migration for existing rows. That is its
own piece of work.

**Priority.** After launch, but early: it is WCAG 1.1.1, and every image
published before it lands is a row someone has to go back and fill.

---

### 13. Dashboard editor conveniences

**What.** Three, grouped because they are the same screen:

- **drag and drop** in `MediaPicker`, alongside the existing chooser;
- **autosave** for a long article draft, so a lost tab is not a lost hour;
- `president-message/seo-section.tsx` and `editorial-editor/seo-fields.tsx` are
  **two components doing one job** and should be one, under the
  shared-components rule.

**Files.** `apps/dashboard/src/components/admin/pages/media-picker.tsx`,
`apps/dashboard/src/components/admin/editorial-editor/*`,
`apps/dashboard/src/components/admin/president-message/seo-section.tsx`.

**Why it was left.** Autosave needs a conflict rule — what happens when a draft
is saved from two tabs — which is a decision, not a feature. The SEO
consolidation is safe and small; it is here only because this batch was scoped
to the public site.

**Priority.** After launch. The SEO consolidation can be done any time.

---

## Recorded, not to be fixed

### 14. `--color-field-border` is used before it is defined, in history

Three commits on `main` are ordered so that the token is consumed before it
exists:

- `dcad367` and `2f07c64` reference `--color-field-border`;
- `9e0fe65` is the commit that defines it.

Checking out either of the first two alone gives a field with no edge colour.

**This will not be corrected.** The branch is pushed, and rewriting published
history costs more than the defect — which can only be observed by checking out
one of two specific commits. Recorded here so that a future bisect across this
range knows why the fields look wrong at those two points, and does not chase
it as a live defect.

The lesson is the transferable part: a token and its first consumer belong in
**one** commit. Each commit on its own has to build and has to render.
