# The video & live-stream system

Built 2026-09-23. The brief and every ruling taken while building are in
`docs/engineering/plans/2026-09-23-video-brief.md`; the plan is
`docs/engineering/plans/2026-09-23-video-system.md` (Revision 2). This file is
the working reference for anyone who has to change the system.

---

## 1. Why it exists

The federation publishes on five platforms — YouTube, Instagram, TikTok, X and
Facebook — and had nowhere on its own site to show any of it. The homepage had
a video section in the approved inventory with no data behind it, and
`/media/videos` was a hero and nothing else, shipped `noindex` under Chapter 14
§11 because it had no list.

What it had to do: let an editor add a video by pasting a link, put a broadcast
on the site and take it off again within a minute, and render both on a public
page that meets WCAG 2.1 AA and does not cost the homepage its LCP.

### Rejected, and why

**YouTube Data API for live detection.** It would have made "is the federation
live?" a question the platform answers, rather than a claim an editor makes.
Rejected by the brief: it needs a Google Cloud project, a quota, a key in the
deployment, and polling — and the failure mode is a homepage that says LIVE
because a quota was exhausted. The editor states it and states when it ends,
and the clock closes it. No polling, no key, no cron.

**One `videos` collection with an `isLive` flag.** The existing schema was
written for this (`page-sections.schema.ts:11` says so). It was rejected
because a broadcast stored in `videos` is in the public library from the moment
it is created — and "no automatic archiving" is explicit — while `venue`,
`expectedEndAt` and `endedAt` mean nothing on a library video. Two shapes in
one collection, with half the fields null on every row. `liveStreams` is
separate. The old `isLive` field, its partial index and its `pre('save')` hook
are still on `videos`, unused, because removing a unique index is a migration
this work had no mandate for. **That is recorded debt, not an oversight.**

**Third-party embeds at rest.** A homepage carrying eight YouTube iframes pays
for eight third-party waterfalls, cookie writes and script evaluations for
visitors who mostly never press play. Every player here is a facade: the still
and the play button are ours, and the press is what buys the embed.

**A `duration` and a view count on each card.** The design's early drafts had
them. oEmbed returns neither, so the only way to show them is to invent them.
They are absent from the cards, the modal and the structured data.

**Manual ordering in the library.** Removed by the owner. The library and the
public list are `publishedAt` descending, always, so what an editor sees in the
dashboard table is the order a visitor gets. The approved design's drag handle
(PDF p. 9) is therefore not built — a deliberate deviation.

**A CSP.** None exists in `apps/web`, and authoring one governs every page and
must account for the Google Maps embeds already shipped. Out of scope by
ruling; the origin list is in the backlog below.

---

## The design-system exception, and its withdrawal

This system was taken out of the design system's colour rules by owner
decision on 2026-09-23, without an ADR. It held its own dark register in
`video-system.css` — a `#0A0C0B` ground, three surfaces, three inks, a green
and a live red, all scoped to `.video-system` — and nine animation durations
that matched no rung on the motion scale.

**That exception was withdrawn on 2026-09-24.** ADR-0098 gives the system a
fifth surface, `ink`, and the video system is now one of its users. Every
colour resolves through `[data-surface="ink"]`; every duration is a token rung.

**The one exception that remains** is the five platform logos in
`platform-badge.tsx` (and `platform-mark.tsx` on the dashboard). Those are
other organisations' registered identities, published in their own brand
guidelines: a YouTube mark in federation green is not YouTube's mark, and
tokenising them would imply this system may change them. They are literals on
purpose, marked as such where they are drawn, and they are the only literals
anywhere in the system.

### What the change moved, and what it could not

| Was | Is | Why |
|---|---|---|
| `--vs-bg` `#0A0C0B` | `--surface-bg` on `[data-surface="ink"]`, `#0B0B0B` | ADR-0098 §8.4 |
| `--vs-text` / `-secondary` / `-muted` | `--surface-text`, `--surface-text-muted` | The surface publishes two inks, not three; secondary and muted were within 1 step of each other |
| `--vs-green` `#2bd46e` as a label colour | `--surface-text` | The kit's green is a button plate: it measures **4.09:1** on this ground, a boundary and not readable text. The green survives where something legible is printed on it |
| `--vs-live` `#d11a27` | `--color-brand-secondary` `#C8102E` | A broadcast is brand red, not `semantic-error` — and the error red is themed, dropping to **1.89:1** on ink in high contrast |
| `--vs-surface` / `-raised` | `.vs-fill` / `.vs-fill-strong`, mixed from the surface's own ink | DESIGN SYSTEM GAP: the kit publishes no raised step on ink |
| a green-to-red eyebrow ramp | `var(--brand-tricolor)` | ADR-0098 D3 forbids blending the two identity colours directly; the token also resolves its middle step per surface and its angle from `dir` |
| scrims mixed from the ground | `--color-surface-overlay`, the scrim role | ADR-0071 D5; a scrim's darkness should not follow whatever the ground happens to be |
| a per-call-site focus ring in the plate green | the shared `FOCUS` (ADR-0051's two-tone) | 21 hand-written copies, painted with the button role rather than the a11y one |
| 16s / 2.8s / 1.8s / 1.6s / 0.7s / 0.6s durations | `orbit`, `entrance`, `instant` rungs | See "Two rungs this system may not use" in `video-system.css` |

Three things could not move, and are open in the backlog: there is no long
motion rung a general consumer may use, no raised-on-ink token, and no accent
ink on ink — which is why the category label is white rather than green.

### The two classes that carry state

`video-system.css` also holds `.vs-ghost` (the hover and active tints) and
`.vs-edge` (the 1px edge **and** the focus ring). They are classes rather than
Tailwind utilities for two measured reasons:

1. **An arbitrary value may not contain a space.** `hover:bg-[color-mix(in srgb,
   …)]` splits on its spaces into junk class names, so the rule is never
   generated — silently, with the hover simply absent.
2. **An inline `box-shadow` beats the ring.** Tailwind draws the focus ring with
   `box-shadow` too, so `style={{ boxShadow: "inset 0 0 0 1px …" }}` removed the
   indicator from every pill, chip and arrow in this system. The edge and the
   ring are one declaration now, and they cannot be separated by a call site.

---

## 2. The files, in the order work flows through them

### An editor adds a video

| File | Does what | Read by |
|---|---|---|
| `apps/dashboard/src/app/[locale]/(app)/videos/page.tsx` | The screen. Reads grants and the list on the server. | The router |
| `apps/dashboard/src/lib/admin/videos/videos-screen.ts` | The read: refuses without `videos:Read`, shapes rows, decides which write affordances to offer. | The page |
| `apps/dashboard/src/components/admin/videos/videos-board.tsx` | The list's behaviour: filters, paging, publish/unpublish, delete, end broadcast. | The page |
| `.../videos/videos-actions.tsx` | The two "add" links, shared by the page header and the empty state. | Both |
| `.../videos/video-table.tsx` | The list, `publishedAt` descending: still, title link, status, date, row menu. | The board |
| `apps/dashboard/src/app/[locale]/(app)/videos/new/page.tsx` | Adding a video. A static segment, so it is never read as an id. | The router |
| `apps/dashboard/src/app/[locale]/(app)/videos/[id]/edit/page.tsx` | Changing one. Four outcomes: refused, unreachable, gone, the form. | The router |
| `.../videos/video-form.tsx` | Both of those screens. One component: they ask the same questions. | Both routes |
| `apps/dashboard/src/lib/admin/videos/editor-screen.ts` | What each editor reads before it draws, and which state it is in. | The four routes |
| `apps/dashboard/src/lib/admin/use-admin-write.ts` | One write, its busy flag, and the sentence for every way it can fail. | The board and both forms |
| `apps/dashboard/src/lib/admin/videos/requests.ts` | Body guards. Splits a create from the publish that follows it. | The route handlers |
| `apps/dashboard/src/app/api/admin/videos/route.ts` | `POST` — creates, then publishes if that is what was pressed. | The browser |
| `api/src/modules/media-center/videos/resolve/` | The allowlist, the oEmbed client, the resolver. | `videos.service.ts` |
| `api/src/modules/media-center/videos/videos.service.ts` | Creates as a draft; stamps `publishedAt` on the draft→published move. | The controller |
| `api/src/bootstrap/seed-video-section.ts` | Creates the homepage's `VIDEO_LIBRARY` row if it is absent, so every environment has one. | `bootstrap-admin.ts` |

### A broadcast goes on and comes off

| File | Does what |
|---|---|
| `apps/dashboard/src/app/[locale]/(app)/videos/live/new/page.tsx` | Starting one. `?from=<id>` fills the form from a broadcast that has finished. |
| `apps/dashboard/src/app/[locale]/(app)/videos/live/[id]/edit/page.tsx` | Correcting the running one — or reporting that it is over. |
| `.../videos/live-form.tsx` | Both. Title and venue are bilingual pairs, so a save never erases a language. |
| `.../videos/live-finished.tsx` | Ran past its time, or ended by hand. Offers "start another with these details". |
| `.../videos/live-banner.tsx` | Shown only while one is running; the remaining time re-reads the clock each minute. |
| `apps/dashboard/src/lib/admin/videos/dubai-time.ts` | Wall-clock ⇄ instant at UTC+4, in one place rather than in the form and the banner. |
| `apps/dashboard/src/app/api/admin/live-streams/**` | `POST` to start, `PATCH` to correct, `POST :id/end` to stop. |
| `api/src/modules/media-center/live-streams/` | `isActive` + a partial unique index; `start()` ends the previous one. |
| `.../live-streams/dto/live-stream-admin-response.dto.ts` | `GET /live-streams/:id` — the only read that can see an expired broadcast, and the `state` verdict every screen reads. |
| `api/.../videos/resolve/store-thumbnail.ts` | Copies the platform's still into the library when a broadcast starts. Best effort: every failure answers `null`. |
| `apps/dashboard/.../videos/video-still.tsx` | A still, or the placeholder. The dashboard's answer to "there is no picture". |
| `apps/dashboard/.../videos/video-row-parts.tsx` | One row's cells, drawn by both the table and the phone-width cards. |

### A visitor watches

| File | Does what | Read by |
|---|---|---|
| `apps/web/src/lib/video/load.ts` | The three public reads, their cache tags, and the multi-page walk behind "show more". | The two pages |
| `apps/web/src/lib/video/library-query.ts` | The library's filters, as one URL. | The library page and screen |
| `apps/web/src/app/[locale]/page.tsx` | Renders the homepage section when the composition has a `VIDEO_LIBRARY` row. | — |
| `apps/web/src/components/pages/home/video-section.tsx` | The section, in its two states. | The homepage |
| `apps/web/src/app/[locale]/media/videos/page.tsx` | Reads the URL, fetches, splits reels from videos, emits JSON-LD. | — |
| `apps/web/src/components/pages/video/library-screen.tsx` | The library's behaviour: tabs, search, filters, "show more", the modal. | The library page |
| `apps/web/src/components/pages/video/embed-frame.tsx` | **The zero-iframe promise.** No `<iframe>` exists until a press. | Every player |
| `apps/web/src/components/pages/video/video-player-modal.tsx` | Focus trap, Escape, focus return, previous/next. | Both surfaces |
| `apps/web/src/styles/video-system.css` | The keyframes, the two fills the kit has no token for, and the ghost/edge state classes. The ground is ADR-0098's `ink` surface. | `globals.css` |

---

## 3. One real example, traced

An editor pastes `https://www.youtube.com/watch?v=abc123` into `/videos/new`.

1. **`use-resolved-video.ts`** debounces 400ms and calls `resolveUrl`, dropping
   stale answers via a request counter so a slow reply for an old URL cannot
   overwrite a fast one for the URL on screen.
2. **`app/api/admin/videos/resolve/route.ts`** reads the httpOnly token and
   forwards. Nothing here inspects the URL — the allowlist lives in one place.
3. **`resolve.service.ts`** runs `parseVideoUrl`: host must be in the exact-set
   allowlist, `https:` only, no userinfo. It returns platform `youtube`,
   `externalId` `abc123`, `kind` `video`.
4. It asks YouTube's public oEmbed endpoint, refuses a body over the size cap
   (checked on `content-length` *before* `.text()`), and takes `title` and
   `thumbnail_url`.
5. **`safeThumbnailUrl()`** re-validates `thumbnail_url` — the oEmbed response
   chose it, so it is as untrusted as the editor's input: `https:` only, a CDN
   suffix allowlist, `redirect: 'manual'`, and a refusal for any host that
   resolves to a private or link-local address.
6. The still is **downloaded and stored** through the project's own upload
   pipeline. Instagram's and TikTok's still URLs expire; a hotlink would be a
   broken card in six weeks.
7. The form seeds the fetched title into **both** language fields and draws
   the card on `#0A0C0B` — the public site's ground, not the dashboard's.
8. The editor presses **نشر**. `videos-board.tsx` POSTs to
   `/api/admin/videos`.
9. **`route.ts`** calls `POST /videos` (which creates a **draft** — the API's
   `CreateVideoDto` has no `status` and refuses one), then `PATCH /videos/:id`
   with `status: 'published'`. `videos.service.ts:79-81` stamps `publishedAt`
   on that transition.
10. Within 60 seconds `fetchPublic`'s window expires. `GET /video-section/public`
    now answers with the new video as `featured` (mode `latest`), and
    `HomeVideoSection` draws it: the still with a Ken Burns push-in, the
    pulsing play button, the platform mark, and the carousel beneath.
11. A visitor presses play. `EmbedFrame` sets `playing`, and **only now** does
    one `<iframe>` appear, pointed at `youtube-nocookie.com/embed/abc123`.
12. The address becomes `/ar/media/videos?video=<id>` via `history.replaceState`
    — no navigation, no new history entry, and every filter the visitor had set
    is still in it. Share sends that address; closing the player takes the
    `video` parameter back out.

---

## 4. The decisions that are not the obvious ones

**Create and publish are two upstream calls.** Not because two is nicer, but
because the API refuses `status` on `POST /videos` — verified against a running
API, which answered `400 "property status should not exist"`. Publishing is a
transition. If the second call fails the first is kept: the video exists as a
draft, the editor is told so, and publishing it again is one press. Deleting
the draft to make it atomic would throw away their work.

**`videos:Update` had to be added to the permission catalogue.** It did not
exist, while `PATCH /videos/:id` and all three live-stream routes required it —
so nobody could publish a video or end a broadcast, ever. The repo's own
`permission-catalogue.spec.ts` was already red on it. Adding the entry is the
fix; `bootstrap:admin` seeds the row.

**`revalidateTag` is not called anywhere.** The dashboard and the public site
are two Next applications in two processes, so a tag revalidated in one cannot
reach the other's cache. A bridge between them is infrastructure this work had
no mandate to build, and the freshness requirement it would serve (≤60 seconds)
is already met by `PUBLIC_REVALIDATE_SECONDS`. The tags are applied to the
reads anyway, so the bridge is one call when someone builds it. **This is a
documented deviation from the plan's ت٧.**

**The carousel's scroll sign is read from the computed direction.** In an RTL
overflow container `scrollLeft` runs from 0 down to negative, and
`scrollBy({left: +x})` therefore moves *backwards*. Measured in Chromium on
this project's own rail: `+800` moved nothing, `-800` advanced one page. The
`dir` IDL property is **not** usable for this — it reflects the element's own
`dir` attribute, which the rail does not have, and measured as `""`.

**The modal's keydown listener is on `document`.** Clicking the dialog's title
— which is not focusable — leaves `document.activeElement` as `<body>`, and a
handler bound to the panel never fires again: Escape would stop working. The
same happens after any click into the platform's iframe, whose keys never reach
this document.

**The play triangle is not mirrored in Arabic.** It is a transport control —
the way tape runs — not a directional arrow. The library CTA's arrow *is*
mirrored, because that one points where the reader is being sent.

**The resting play disc is dark, not a white wash.** A translucent white disc
with a white triangle is invisible over a pale still, measured on the homepage
against a light image. The thumbnail is an uncontrolled photograph.

**A word-reveal heading puts the space between the spans, never inside one.** A
trailing space inside an `inline-block` is collapsed by the layout: "من قلب"
rendered as "منقلب" before this was caught in a browser.

**Reels are a separate component, not a variant.** A 9:16 still cannot be
cropped to 16:9 without losing the subject; its title sits on the image rather
than under it; and it never appears in the landscape carousel. One component
branching on `kind` would put all three differences inside conditionals.

**The dashboard's filters are component state; the library's are the URL.** A
visitor shares a filtered library page. An editor narrows a working list they
are about to act on. Nobody links a colleague to "drafts on TikTok".

**`getAssociationOptions()` returns `[]` and every consumer draws nothing.** No
championship or event entity exists. A select with no options is a dead
affordance; one offering invented names would let someone link a video to
nothing and believe it worked.

**The tab strips are not `role="tab"`.** That role promises a tabpanel,
`aria-controls` and arrow-key movement with a roving tabindex. None of that
exists here and none should — these navigate. Announced as "tab 1 of 3", a
screen-reader user would press arrow keys and get nothing.

---

## 5. Adding a platform

Say Twitch. In this order:

1. **`api/.../videos/schemas/video.schema.ts`** — add `twitch` to
   `VIDEO_EXTERNAL_PLATFORMS`. *Skip it and the API rejects every Twitch URL at
   the DTO with a 400 that names the enum.*
2. **`api/.../videos/resolve/url-allowlist.ts`** — add the exact hosts and the
   id patterns. *Skip it and `parseVideoUrl` refuses the link as an unsupported
   domain, which is the allowlist working correctly.*
3. **`api/.../videos/resolve/oembed-client.ts`** — add the endpoint, or return
   the manual fallback if the platform has none. *Skip it and the resolver
   answers `fallback: true`, which the form already handles: the editor types
   the title and picks a still.*
4. **`api/.../videos/resolve/thumbnail-guard.ts`** — add the CDN hosts. *Skip it
   and the video still saves, without a still — the guard fails closed, and
   `VideoThumbnail` draws the motif placeholder.*
5. **`apps/dashboard/src/lib/admin/videos/types.ts`** and
   **`apps/web/src/lib/video/types.ts`** — add `twitch` to both
   `VIDEO_PLATFORMS`. *Skip either and TypeScript fails the build at the
   `MARKS` record, which is exhaustive over the union.*
6. **`platform-badge.tsx`** — add the brand colour and the SVG path to `MARKS`.
   *This is where the build fails if you skipped step 5.*
7. **`embed-frame.tsx`** — add the case to `embedSrc`, or return `null` and let
   it become a link out. *Skip it and TypeScript fails: the switch is
   exhaustive.*
8. **`messages/ar.json` and `messages/en.json`, both apps** — add
   `platform_twitch`. *Skip it and the card's screen-reader name renders as the
   key.*

The type system catches 5, 6 and 7. Nothing catches 8 but a person looking.

---

## 6. Where it breaks

**"The editor published a video and the site does not show it."**
Three causes, in the order to check them. *Is it actually published?* The
dashboard's status column says. A create alone leaves a draft. *Has 60 seconds
passed?* `PUBLIC_REVALIDATE_SECONDS` is the whole freshness mechanism; load the
page twice. *Does `GET /api/v1/videos/public?limit=1` return it?* If the API
has it and the page does not, it is the cache; if the API does not, it was
never published.

**"The broadcast will not start / the publish button does nothing."**
A 403 on `videos:Update`. The permission exists in `PERMISSION_CATALOGUE` but
the row has to be in the database and granted to the role — that is what
`npm run bootstrap:admin` does. The symptom is an error message naming a
missing permission; before the boards reported failures, the symptom was
nothing at all.

**"The homepage section is missing entirely."**
`GET /api/v1/video-section/public` returns `enabled: false` when the homepage
has no `VIDEO_LIBRARY` row in `pageSections`, or the row is off. Since
`bootstrap:admin` seeds that row, the usual cause is that the bootstrap has not
been run on this environment — or that it ran before the `pages` row for `home`
existed, in which case it logged `no homepage page row yet` and running it
again creates the section.

**Nothing breaks without the row.** The homepage checks its composition for a
`VIDEO_LIBRARY` section before it reads anything, so a page without one makes
neither of the two requests and renders exactly as it did before this feature;
`HomeVideoSection` also returns `null` for a section that is off or has nothing
to show. Both are held by `deep-link.spec.tsx`. The library page does not depend
on the row at all. The dashboard's editor reports `sectionMissing` rather than
failing.

---

## 7. The guarding tests

| Test | Holds | If it went |
|---|---|---|
| `video-components.spec.tsx` — iframe count 0 then 1 | The zero-iframe facade | A refactor that renders the iframe eagerly would put five third-party players on the homepage and nobody would notice until a Lighthouse run |
| Same file — nocookie vs youtube.com | A library video does not write a tracking cookie before playback | Silent privacy regression |
| Same file — Escape from `<body>`, Tab from outside | The modal's focus behaviour **after a click on non-focusable content** | The trap regresses to "works only if you never click the title", which is how it originally shipped. Mutation-verified: reverting the fix turns both red |
| Same file — 16:9 vs 9:16 | Reels never enter the landscape shell | Reels get cropped or letterboxed |
| `video-register-contrast.spec.ts` | Every colour pair, read out of the CSS itself | A colour edited in the stylesheet would stop being measured; the test restates nothing, so it cannot drift |
| `library-query.spec.ts` | Changing one filter keeps the others | A control silently drops someone's filter and they are looking at a library they did not ask for |
| `permission-catalogue.spec.ts` | Every `@RequirePermission` pair exists | Exactly the bug this work found: a guarded route nobody can ever satisfy |
| API `live-streams` race test (`Promise.allSettled`) | Exactly one active broadcast | Two broadcasts, and the homepage picks one arbitrarily |
| API `findForEditor` — expired row, unknown id, malformed id | A broadcast that ran past its time is *over*, not *missing* | An editor whose championship ran long is told the record does not exist and goes looking for something nothing deleted. Mutation-verified: removing the ObjectId guard turns the malformed-id case red |
| `editor-screen.spec.ts` — `finished` vs `notFound` | The same distinction, on the screen side, plus both languages surviving the copy | "Start another with these details" silently empties the English title |
| `live-form.spec.tsx` — edit one language, both are sent | A save never erases a language | The defect the one-field dialog shipped: fixing an Arabic typo overwrote the English title |
| API `liveStreamState` — running, expired, ended, **replaced** | One rule for "is it over?", in the place that owns the clock | The dashboard's first version read `endedAt` and concluded "an editor ended this", which is wrong every time a newer broadcast replaced it — `end()` and the sweep write the same two fields |
| `editor-screen.spec.ts` — the API's verdict is taken, and derived only when absent | The rule does not live in two places that can drift | Two clocks (Next's and the API's) disagreeing at the boundary |
| `live-form.spec.tsx` — PATCH not POST, and no `url` in the body | Correcting a typo does not take the broadcast off the air | `start()` ends the running stream and inserts a new record; it would look like it worked |
| API `start` — a past end time is refused and the running broadcast survives | The order of the guard against `deactivateAll` | Validating after the sweep leaves the site with NO broadcast: the old one ended, the new one hidden by `findActive` from the moment it was written |
| API `update` — 409 on a broadcast that is over | The rule lives where it can be enforced | The screen already redirects a finished one; the screen is the layer that cannot stop a direct call |
| `video-still.spec.tsx` — no picture draws a ground and a mark | "There is no still" is a state, not a hole | The banner drew nothing and the preview drew an empty frame, for the ordinary case of a platform that names none |
| API `start` — a lost race uploads nothing | The still is captured after the record exists | Capturing first left an orphaned asset behind every 409, and put four seconds of oEmbed and CDN in front of going on air |
| API `update` — a corrected link clears the still | A picture of the old video must not sit under the new one's title | `videoId` moved with the link and the picture did not |
| `store-thumbnail.spec.ts` — five failure paths, all `null` | A missing picture never stops a broadcast going on air | A CDN timeout or a bad minute at the storage provider would take a live event off the air |
| `video-screen.spec.tsx` — the same rows as cards at phone width | Both layouts carry the same facts and the same actions | A column that exists only in the table is a control a phone user cannot reach at all |
| `video-screen.spec.tsx` — the banner after 31 minutes | The remaining time re-reads the clock | "2h 30m left" painted once is an hour wrong by the end of a session |

---

## 8. Deliberately not built

- **The dashboard table's drag handle** (PDF p. 9). The owner removed manual
  ordering; the library is `publishedAt` descending.
- **A table narrower than `xl`.** Below 1280 each row is a card carrying the
  still, the title, the platform, the state, the date and the same `⋯` menu;
  from `xl` up it is the table the design draws, laid out `fixed` so it can
  never push past its container. The breakpoint is measured, not chosen: at
  1024 the title column was squeezed to 39px — the table fitted and was
  unreadable. Owner decision 2026-09-24 —
  this is the approved mobile composition for this screen, and it closes the
  §13 gap that had been reported as `DESIGN DECISION REQUIRED`. Both layouts
  are built from `video-row-parts.tsx`, so neither can drift from the other.
- **The championship / event control** on both forms, the section editor and
  the library filter. Built and wired, drawn only when
  `getAssociationOptions()` returns rows — which is never, today.
- **A CSP.** See the backlog.
- **Automatic archiving of a finished broadcast** into the library. Explicitly
  out of scope: a broadcast and a library video are different records.
- **A pin/star in the video list.** The featured video is chosen on the section
  editor and nowhere else, so there is one answer to "what is featured".
- **A route per video** (`/media/videos/<slug>`). `?video=<id>` on the library
  is the address instead: playback is a dialog over the list, and a real route
  would mean a second page that renders the same player with no list behind it.
  The query parameter carries the filters with it, which a route could not.
- **View counts and durations.** oEmbed returns neither.
- **Removal of `videos.isLive`.** Dropping a unique index is a migration.

---

## 9. The words this system uses

| Term | Means |
|---|---|
| **video** | A record in `videos`: a link to something on a platform, plus the title, category and still the federation chose for it. Never the media file — we host none. |
| **reel** | `kind: 'reel'`. A vertical 9:16 short: an Instagram Reel, a TikTok, a YouTube Short. A shape, not a platform. |
| **live stream** / **broadcast** | A record in `liveStreams`. Separate from `videos`, and never archived into it. |
| **active** | `isActive: true` **and** `expectedEndAt > now`. Evaluated on every read, which is why nothing polls. A broadcast whose time has passed is inactive while its row still says `isActive: true` — harmless, because reads filter by the clock. |
| **facade** | The still, the play button and the badges drawn in place of a player. The embed replaces it on the press. |
| **the featured video** | What the homepage stage shows at rest. `latest` or a specific id, set on the section editor only. A running broadcast replaces it and it returns by itself afterwards. |
| **the chrome module** | `pages/video/chrome.ts` — the ghost pill, its edge and the wide focus ring, defined once for the eleven call sites that used to paste them. |
| **the ink surface** | ADR-0098's fifth surface, `[data-surface="ink"]` — the institutional dark ground this system paints on. It replaced the private `--vs-*` register on 2026-09-24. Its `#0B0B0B` is fixed in every theme, so it draws no edge of its own and every ink surface carries an accent bar or the mesh instead. |
| **season** | Computed from `publishedAt`, never stored. `SEASON_START_MONTH = 9`, so September–August, shown as `2025-2026`. |
| **association** | A `{ownerType, ownerId}` link to a championship, sports event or public event. The API filters by it; nothing produces one yet. |
| **resolve** | Asking a platform's public oEmbed endpoint what a pasted link is. Requires `videos:Create`, because it makes an outbound request on caller input. |
| **the deep link** | `/media/videos?video=<id>`. Opens the library with the player already on that video, carrying whatever filters the address also holds. Written with `replaceState`, so it never adds a history entry. |

---

## Still open

Two items that were on this list are now built and are gone from it: the
homepage `VIDEO_LIBRARY` row, which `bootstrap:admin` now seeds (§2), and the
per-video address, which is `?video=<id>` (§3 step 12). What remains:

**1. A Content Security Policy for the public site.** None exists. Introduce it
`Report-Only` first, alongside the Google Maps embeds already shipped:

- `frame-src`: `https://www.youtube-nocookie.com`, `https://www.youtube.com`,
  `https://www.instagram.com`, `https://www.tiktok.com`,
  `https://www.facebook.com`, `https://www.google.com` *(maps, already shipped)*
- `img-src`: `'self'` covers thumbnails today — they are stored locally. The
  platform CDN hosts are needed only if hotlinking ever returns.
- `script-src`: nothing extra for this system. Every embed here is an iframe;
  no platform script is loaded, which is why X has no player at all.

**2. `videos.isLive`**, its partial unique index and its `pre('save')` hook.
Unused since the broadcast moved to its own collection. Dropping a unique index
is a migration.

**3. `useAdminWrite` has three callers; about fifteen other admin screens still
hand-roll the same fetch, busy flag and `WriteErrors` lookup.** Adopting it is
mechanical and out of this task's scope.

**4. A revalidation bridge between the two applications.** The dashboard and the
public site are separate Next processes, so `revalidateTag` in one cannot reach
the other's cache. The reads are already tagged (`videos`, `live-stream`), so
the bridge is one call once something can carry it. Until then freshness is
`PUBLIC_REVALIDATE_SECONDS`, which already meets the ≤60s requirement.

---

## Linking championships and events, later

When the championships / sports-events / public-events module ships, **only the
two adapters change**:

- `apps/dashboard/src/lib/admin/videos/association-options.ts`
- `apps/web/src/lib/video/association-options.ts`

Replace each body with a fetch of the new module's public list and map every row
to `{ value: "<ownerType>:<id>", label: <name in the active locale> }`.

Nothing else moves. Already built and waiting:

- `CONTENT_ASSOCIATION_OWNER_TYPES` holds `championships`, `sportsEvents` and
  `publicEvents`; `videos` and `liveStreams` both carry `associations`.
- `GET /videos/public?association=<type>:<id>` filters by it, with `$elemMatch`
  so the type and the id must belong to the same entry.
- The carousel's `filtered` source accepts an association.
- The video form, the broadcast form, the section editor and the library's
  filter panel each render their control the moment the adapter returns rows.

The one thing to check on that day: an end-to-end test with a non-empty list.
Every path above is currently exercised only with an empty one.
