# Video & Live Stream System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An editor pastes a social link and it becomes a video on the public site; an editor starts a YouTube live stream and the site shows it within 60 seconds — across `api`, `apps/dashboard` and `apps/web`.

**Architecture:** Extend the existing `videos` collection rather than create one; add a separate `liveStreams` collection so a finished broadcast never lands in the library; store the video section's settings in the existing `pageSections` row whose `sectionType` is already `VIDEO_LIBRARY`. The public site holds a facade for every embed — no third-party iframe loads before a click.

**Tech Stack:** NestJS + Mongoose (api), Next.js 16 App Router + next-intl + `motion@13` (web), React 19 (dashboard). No new dependencies.

**Spec:** The task brief of 2026-09-23 (owner, in-session) + `docs/design-specs/video/video-design.pdf`.

**Revision 2, 2026-09-23** — owner approved Revision 1 with mandatory corrections ت١–ت٧ and ruled on both
stop points. Every correction is folded in below; the diff from Revision 1 is summarised in
*Corrections applied* at the end of this header block.

### Corrections applied (Revision 1 → 2)

| # | Change |
| --- | --- |
| ت١ | **No duplicate fields.** `externalUrl` / `externalPlatform` are reused; `url` / `platform` are NOT added. `externalPlatform`'s enum narrows to the five lowercase values. **`order` is deleted from the whole plan.** `publishedAt` is set by the service on publish. Old rows are handled by updating the seed, not by a migration |
| ت٢ | Allowlist accepts `youtube.com/live/ID` (Task 5 depends on it), `vm.tiktok.com`, Instagram `/p/` and `/tv/`, `twitter.com/i/status/ID`; ignores `si`/`t`/`feature`; follows short-link redirects manually, ≤3 hops, each hop re-checked |
| ت٣ | **New Review Focus 6** — the thumbnail URL comes from the oEmbed response and is therefore untrusted. CDN allowlist, no internal addresses, manual redirects |
| ت٤ | Live concurrency uses an `isActive` flag with a partial unique index, one retry, then 409. Race test uses `Promise.allSettled` |
| ت٥ | **No manual ordering in the library.** Public list and library are always `publishedAt` descending. Manual order survives only in the carousel's `manual` source, via `pageSections.items[]`. Task 7 Step 3 (drag) deleted |
| ت٦ | The section editor goes in the **existing** dashboard structure — `homepageScreen()` in `navigation.ts` — as `/homepage/video` |
| ت٧ | Bilingual title pair in the drawer; `revalidateTag('videos')` on publish/edit/delete; Web Share API with a copy fallback |

---

## Phase 0 result — what exists, what is reused, what is new

Written first because six of this plan's decisions are *not* to build something.

| Area | Found | Decision |
| --- | --- | --- |
| `videos` collection | **Exists.** `api/src/modules/media-center/videos` — schema, controller, service, repository. Fields: `title` (LocalizedText), `contentCategoryId`, `isLive`, `externalPlatform`, `externalUrl`, `thumbnailId`, `associations`, `tags` | **Extend**, do not replace |
| `videosPage` | **Exists** — hero singleton for the library page | **Reuse as-is** |
| Public video endpoint | **None.** Controller is entirely admin. The web page says so in its own comment | **Add** |
| Section settings model | **`pageSections` exists** and `VIDEO_LIBRARY` is already in its closed `PAGE_SECTION_TYPES`. Carries `enabled`, `sectionTitle`, `sectionSubtitle`, `itemLimit`, `selectionMode`, `items[]`, `displayOrder`, free-form `configuration` | **Reuse** — no new settings collection |
| Dashboard video screens | **None** | **Add** |
| Media upload | **Exists** — `POST /media-assets/upload`, `FileInterceptor`, `MAX_UPLOAD_BYTES`, `uploadAndCreate()` | **Reuse** for thumbnails |
| Championships / events | **Do not exist.** No collection under any name — `events`, `fixtures`, `calendar`, `schedule`, `competitions`, `championships` all absent. `publicEvents` and `championships` appear ONLY as string literals in `CONTENT_ASSOCIATION_OWNER_TYPES` and `WORKFLOW_ENTITY_TYPES`; `UPCOMING_HIGHLIGHTS` has no consumer; `/events/federation-events/page.tsx` fetches nothing | **Championship filter removed** everywhere; **no `eventId` field** (Decision 4) |
| Season | No entity, and none needed | **Computed from `publishedAt`** (Decision 4) |
| Homepage-sections admin | **No index page.** One route per section, registered by `homepageScreen(key, path, grants)` in `apps/dashboard/src/lib/navigation.ts:165-171` (hero, sponsor-strip, sponsors, partners, memberships, footer) | **Follow that pattern** — add `/homepage/video` through the same helper |
| Motion library | **`motion@^13.3.0` in `apps/web`** (not in dashboard) | **Reuse**; no new dependency |
| `WORKFLOW_ENTITY_TYPES` | `videos` **absent** — a deliberate exemption (2026-09-04, follow-on to ADR-0054) | **Leave absent.** Brief §7 forbids adding it |
| CSP | **None exists anywhere in `apps/web`** | **Do not create one** (see Decision 5) |
| `images.remotePatterns` | **Not configured** | **No change needed** — thumbnails are stored internally |

### Decisions taken under the brief's grant of technical authority

**Decision 1 — a separate `liveStreams` collection, not `videos.isLive`.**
`page-sections.schema.ts:11` records a board decision that *"a live item is just a `videos` record with `isLive=true`"*, and the `videos` schema implements it with a partial unique index plus a `pre('save')` hook.

Overridden, because the brief settles it two ways: §9 approves new schema "للفيديو والبث" (video **and live**), and §6 puts "أرشفة البث تلقائيًا في المكتبة" out of scope. A live stream stored as a `videos` row *is* in the library the moment it is created, and would have to be filtered back out of every query forever. A broadcast also carries `venue`, `expectedEndAt` and `endedAt`, which mean nothing on a library video.

`videos.isLive`, its index and its hook are left untouched and unused — removing a partial unique index is a migration this task has no mandate for. Recorded as debt in `video-system.md` §8.

**Decision 2 — `category` becomes an enum, replacing `contentCategoryId`.**
The existing field is an `ObjectId` pointing at a `contentCategories` collection the schema's own comment says was never built, so it can neither be read nor filtered. Brief §5.3 specifies a closed enum. Existing rows carry an unresolvable id; the migration is to drop the field.

**Decision 3 — reels are a `kind`, not a platform.**
`kind: 'video' | 'reel'` is independent of `platform`: a YouTube Short and an Instagram Reel are both reels. Detected from the URL shape first (`/shorts/`, `/reel/`, `tiktok.com/@…/video/`), falling back to oEmbed aspect ratio when the shape is ambiguous.

**Decision 4 — season is computed; the championship filter is removed. RULED by the owner, 2026-09-23.**

The design (PDF pp. 4, 10, 12) shows "الموسم أو البطولة" in the library filter, the add drawer and the section settings. The owner's ruling splits it in two.

**Season — built, with no stored field and no new collection.** One constant, `SEASON_START_MONTH = 9`, makes a season run September→August and display as "2025–2026". The API's `season` filter is translated into a date range over `publishedAt` before it reaches Mongo, so the season is derived at query time and can never drift from the publication date the way a second stored field would.

**Championship — removed from all three screens.** The search the owner asked for was run and found nothing: no `events`, `fixtures`, `calendar`, `schedule`, `competitions` or `championships` collection exists. `publicEvents` and `championships` are string literals in `CONTENT_ASSOCIATION_OWNER_TYPES` and `WORKFLOW_ENTITY_TYPES` with nothing behind them, the `UPCOMING_HIGHLIGHTS` section type has no consumer, and `/events/federation-events/page.tsx` fetches nothing at all. Under the ruling's second branch there is therefore **no `eventId` field**, no championship filter, and no free text. Recorded in `video-system.md` §8.

**Decision 5 — no Content-Security-Policy is introduced.**
Brief §5.19 says to narrow `frame-src`. There is no CSP in `apps/web` to narrow: no `headers()` in `next.config.mjs`, nothing in `proxy.ts`. Authoring a site-wide CSP would govern every existing page and would, at minimum, need `frame-src` for the Google Maps embeds already in the footer and on the contact page. Brief §7 reserves CSP changes for your approval. Not built.

The backlog entry it becomes — *"CSP for the public site, before launch"* — carries the full origin list this
system needs so it can be introduced in one pass alongside the existing Google Maps embeds, **`Report-Only`
first**:

- `frame-src`: `https://www.youtube-nocookie.com`, `https://www.youtube.com`, `https://www.instagram.com`,
  `https://www.tiktok.com`, `https://www.facebook.com`, `https://platform.twitter.com`,
  `https://www.google.com` *(the maps embeds already shipped)*
- `img-src`: `https://i.ytimg.com`, `https://pbs.twimg.com`, `*.cdninstagram.com`, `*.fbcdn.net`,
  `*.tiktokcdn.com` — **needed only if hotlinking ever returns**; today thumbnails are stored locally, so
  `'self'` covers them
- `script-src`: `https://platform.twitter.com`, `https://www.instagram.com`, `https://www.tiktok.com` — only
  for the platforms whose embed requires their script

**Decision 6 — live-state freshness uses `revalidateTag`, not polling.**
Brief §5.21 leaves the mechanism to me and §2 forbids polling. Start/end/edit each call `revalidateTag('live-stream')`; the public section fetch is tagged with it. `expectedEndAt` is additionally enforced **server-side on read**, so a stream whose end time passes goes dark without anyone pressing anything and without a timer. The section route also carries `revalidate = 60` as the backstop that satisfies the ≤60s bound when a revalidate call is lost.

A second tag, `videos`, is invalidated on every publish, edit and delete; the section fetch and the library fetch both carry it (ت٧).

---

## Global Constraints

- **No Git commands at all** — no branch, add, commit, push, or read. Work on `main`; leave everything uncommitted. (Brief §9. This plan's task steps therefore have **no commit step**, unlike the skill's default shape.)
- **No new dependencies.** `motion@^13.3.0` exists in `apps/web` only; the dashboard gets CSS and `IntersectionObserver`.
- **Arrow functions** everywhere except class/decorated methods (NestJS), Mongoose hooks needing dynamic `this`, generators, overloads, and `arguments`. Convert functions in every file touched (CLAUDE.md §30).
- **CSS logical properties only** — `ps-*`, `pe-*`, `text-start`, `ms-*`. Never `pl-*`/`left`.
- **Comments in English**, explaining WHY, never narrating history.
- **No manual ordering in the library.** The public list and the library are always `publishedAt` descending.
  Manual order exists only in the carousel's `manual` source, carried by `pageSections.items[]`, which already
  stores order. There is no `order` field on a video (ت٥).
- **No duplicate fields.** `externalUrl` and `externalPlatform` are the video's URL and platform. `url` and
  `platform` are never added beside them (ت١).
- **No invented numbers.** No view counts, no durations, no fake counters — oEmbed returns neither (Brief §2).
- **Contrast is computed**, never assumed: WCAG 2.x relative luminance, compared unrounded.
- **Dark-register values are scoped CSS variables** under this system's own root class, never global design tokens (Brief §2).
- Reference values: bg `#0A0C0B`; surfaces `#121614`, `#1A1F1C`; hairline `rgba(255,255,255,0.09)`; text `#F3F5F2` / `#A7AFAA` / `#8A938D`; green `#2BD46E` on `#06120B`; live red `#D11A27`. Radii: cards 14, player 20–24, reels 18, pills 999.
- **Every embed is a facade.** Zero third-party iframes before a click, on every screen.
- `prefers-reduced-motion` reduces every animation to a ≤150ms fade.
- Platform brand colours: YouTube `#FF0000`, Facebook `#1877F2`, Instagram official gradient, TikTok/X black with a hairline. On public cards the name is **screen-reader only**; in filters and dashboard tables it is visible beside the mark.

## Review Focus

Five failure modes the brief implies that no task's happy path exercises. Each has its test pinned to the task that owns the code.

1. **A resolver URL that passes the allowlist but points at a private host** — `http://youtube.com@127.0.0.1/`, `https://youtube.com.evil.test/`, and a redirect from an allowed host to `169.254.169.254`. Expected: refused, no socket opened to the internal address. *(Task 2)*
2. **Two editors starting a live stream at the same moment.** Expected: exactly one active stream afterwards; the loser's start ends the winner's or is refused — never two active. *(Task 5)*
3. **A live stream whose `expectedEndAt` has passed but whose `endedAt` is null** — nobody pressed end. Expected: the public endpoint reports no active stream, without a cron. *(Task 5)*
4. **oEmbed returns 200 with a body that is not the shape expected** — HTML error page, missing `thumbnail_url`, 40MB response. Expected: the editor gets the manual fallback, never a crash and never an unbounded read. *(Task 2)*
5. **A reel in a horizontal carousel, and a 9:16 thumbnail in a 16:9 card.** Expected: reels are excluded from the carousel by default and never letterboxed or cropped to 16:9. *(Task 11)*
6. **A thumbnail URL that the oEmbed response chose.** The allowlist in Task 2 guards the URL the *editor*
   typed; `thumbnail_url` is chosen by the remote service and is equally untrusted — a compromised or hostile
   oEmbed response can point it at `http://169.254.169.254/` or at a host that resolves to loopback. Expected:
   refused before any socket opens, and the video still saves without a thumbnail. *(Task 3, ت٣)*

---

## File Structure

**api** — `api/src/modules/media-center/`
- `videos/schemas/video.schema.ts` *(modify)* — add `externalId`, `kind`, `category`, `publishedAt`, `status`; narrow `externalPlatform`'s enum; drop `contentCategoryId`. **No `order`, no `url`, no `platform`** (ت١, ت٥)
- `videos/season.ts` *(new)* — `SEASON_START_MONTH`, `seasonRange()`, `seasonLabel()`
- `videos/resolve/` *(new)* — `url-allowlist.ts`, `oembed-client.ts`, `resolve.service.ts`
- `videos/dto/video-public-response.dto.ts` *(new)*
- `videos/videos.controller.ts` *(modify)* — `@Public()` list; admin resolve
- `live-streams/` *(new)* — schema, service, repository, controller, dto
- `video-section/` *(new)* — reads the `VIDEO_LIBRARY` `pageSections` row, returns featured/live + carousel in one payload

**dashboard** — `apps/dashboard/src/components/admin/videos/`
- `video-table.tsx`, `add-video-drawer.tsx`, `go-live-dialog.tsx`, `live-banner.tsx`, `platform-mark.tsx`
- `apps/dashboard/src/app/[locale]/(app)/videos/page.tsx` *(new)*
- `apps/dashboard/src/components/admin/homepage-video/section-editor.tsx` *(new)*
- `apps/dashboard/src/app/[locale]/(app)/homepage/video/page.tsx` *(new)* + a `homepageScreen()` entry in `apps/dashboard/src/lib/navigation.ts` (ت٦)

**web** — `apps/web/src/components/pages/video/`
- `video-card.tsx`, `reel-card.tsx`, `platform-badge.tsx`, `live-badge.tsx`, `play-button.tsx`, `video-player-modal.tsx`, `video-carousel.tsx`, `embed-frame.tsx`, `video-states.tsx`
- `apps/web/src/components/pages/home/video-section.tsx` *(new)*
- `apps/web/src/app/[locale]/media/videos/page.tsx` *(modify — the library)*
- `apps/web/src/styles/video-system.css` *(new — the scoped dark register)*

---

## Task 1 — Video schema, extended

**Files:**
- Modify: `api/src/modules/media-center/videos/schemas/video.schema.ts`
- Test: `api/src/modules/media-center/videos/schemas/video.schema.spec.ts` *(new)*

**Interfaces:**
- Produces: `VIDEO_PLATFORMS = ['youtube','instagram','tiktok','x','facebook']`, `VIDEO_KINDS = ['video','reel']`, `VIDEO_CATEGORIES = ['championships','events','interviews','nationalTeam','training']`, `VIDEO_STATUSES = ['draft','published']`

**ت١ — the fields that already exist are the fields used.** `externalUrl` and `externalPlatform` stay; `url` and
`platform` are never added beside them. `externalPlatform`'s enum narrows from
`['YouTube','Facebook','Instagram','TikTok','X','Other']` to the five lowercase values — `Other` goes because
nothing can resolve or embed a platform the allowlist does not know. **There is no `order` field** (ت٥).

- [ ] **Step 1: Write the failing test**

```ts
const base = {
  title: { ar: 'ع', en: 'e' },
  externalUrl: 'https://www.youtube.com/watch?v=abc',
  externalPlatform: 'youtube',
  externalId: 'abc',
  category: 'championships',
};

it('defaults a new video to draft and kind video', async () => {
  const doc = new model(base);
  await doc.validate();
  expect(doc.status).toBe('draft');
  expect(doc.kind).toBe('video');
  expect(doc.publishedAt).toBeNull();
});

it('refuses a category outside the closed list', async () => {
  await expect(new model({ ...base, category: 'made-up' }).validate()).rejects.toThrow(/category/);
});

it('refuses a platform the allowlist cannot resolve', async () => {
  // 'Other' was in the old enum. Nothing can embed it, so it cannot be stored.
  await expect(new model({ ...base, externalPlatform: 'Other' }).validate()).rejects.toThrow(/externalPlatform/);
});

it('has no order field — the library is date-ordered', async () => {
  expect(model.schema.path('order')).toBeUndefined();
});
```

- [ ] **Step 2: Run and watch it fail.** `cd api && npx jest src/modules/media-center/videos/schemas --runInBand` → FAIL: unknown path `url`/`category`.
- [ ] **Step 3: Add the fields.** `externalId` (required), `kind` (enum, default `'video'`), `category` (enum,
  required), `publishedAt` (Date, default null), `status` (enum, default `'draft'`). Narrow `externalPlatform`'s
  enum to the five lowercase values. Remove `contentCategoryId`. Keep `externalUrl` as-is. **Add no `order`.**
  Keep `isLive`, its index and hook untouched — Decision 1 explains why.
- [ ] **Step 4: Write the failing publish-rule tests**, then implement them in the service (not the schema —
  a default cannot express "only on transition").

```ts
it('stamps publishedAt at the moment a draft becomes published', async () => {
  const draft = await service.create({ ...base });
  const published = await service.update(draft.id, { status: 'published' });
  expect(published.publishedAt).toBeInstanceOf(Date);
});

it('keeps the original publishedAt when an already-published video is edited', async () => {
  const first = await service.update((await service.create({ ...base })).id, { status: 'published' });
  const again = await service.update(first.id, { title: { ar: 'ب', en: 'b' } });
  expect(again.publishedAt).toEqual(first.publishedAt);
});

it('refuses a published video that has no publishedAt', async () => {
  await expect(repo.create({ ...base, status: 'published', publishedAt: null })).rejects.toThrow();
});
```

- [ ] **Step 5: Update the dev seed**, not a migration. The database is local and its rows are mock
  (Brief ت١): rewrite `api/seed/dev/*` video rows to the new shape — `externalPlatform` lowercase, `category`
  from the enum, `status`, `publishedAt`, `externalId`, `kind` — and drop `contentCategoryId`.
- [ ] **Step 6: Run and watch them all pass.**
- [ ] **Step 7: `npx tsc --noEmit -p api/tsconfig.json`** — ts-jest does not type-check (known), so the build is its own gate.

---

## Task 2 — URL resolver: allowlist, then oEmbed

The security-critical task. `Review Focus 1` and `4` live here.

**Files:**
- Create: `api/src/modules/media-center/videos/resolve/url-allowlist.ts`, `oembed-client.ts`, `resolve.service.ts`
- Test: `url-allowlist.spec.ts`, `resolve.service.spec.ts`

**Interfaces:**
- Produces: `parseVideoUrl(raw: string): { platform: VideoPlatform; externalId: string; kind: VideoKind } | null`, `resolveVideo(raw: string): Promise<ResolvedVideo | { fallback: true; platform: VideoPlatform }>`

- [ ] **Step 1: Write the failing allowlist test** — this is the SSRF guard, so it is written before anything can fetch.

```ts
describe('parseVideoUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/abc123',
    'https://www.youtube.com/live/LIVEID',              // Task 5 depends on this
    'https://youtube.com/live/LIVEID?si=tracking',      // …and on the tracking param being ignored
    'https://www.instagram.com/reel/XYZ/',
    'https://www.instagram.com/p/XYZ/',
    'https://www.instagram.com/tv/XYZ/',
    'https://www.tiktok.com/@uaeaf/video/7300',
    'https://x.com/uaeaf/status/1800',
    'https://twitter.com/i/status/1800',
    'https://www.facebook.com/uaeaf/videos/1234/',
  ])('accepts %s', (url) => expect(parseVideoUrl(url)).not.toBeNull());

  it('ignores tracking parameters when reading the id', () => {
    const plain = parseVideoUrl('https://www.youtube.com/watch?v=abc')!;
    for (const noisy of [
      'https://www.youtube.com/watch?v=abc&si=xyz',
      'https://www.youtube.com/watch?v=abc&t=42&feature=share',
    ]) {
      expect(parseVideoUrl(noisy)!.externalId).toBe(plain.externalId);
    }
  });

  it('reads a /live/ URL as a normal video, with the right id', () => {
    const parsed = parseVideoUrl('https://www.youtube.com/live/LIVEID?si=x')!;
    expect(parsed.kind).toBe('video');   // "live" is a state, not a shape
    expect(parsed.externalId).toBe('LIVEID');
  });

  it.each([
    'https://youtube.com.evil.test/watch?v=a',   // suffix attack
    'http://youtube.com@127.0.0.1/',              // userinfo attack
    'https://evil.test/watch?v=a',
    'http://169.254.169.254/latest/meta-data/',   // cloud metadata
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://localhost/watch?v=a',
  ])('refuses %s', (url) => expect(parseVideoUrl(url)).toBeNull());

  it('reads a YouTube Short and an Instagram reel as kind reel', () => {
    expect(parseVideoUrl('https://www.youtube.com/shorts/abc123')!.kind).toBe('reel');
    expect(parseVideoUrl('https://www.instagram.com/reel/XYZ/')!.kind).toBe('reel');
    expect(parseVideoUrl('https://www.youtube.com/watch?v=abc')!.kind).toBe('video');
  });
});
```

- [ ] **Step 2: Run and watch every case fail.** `cd api && npx jest resolve/url-allowlist --runInBand`
- [ ] **Step 3: Implement `parseVideoUrl`.** Parse with `new URL()`; reject unless `protocol === 'https:'`;
  reject any `username`/`password`; match `hostname` against an **exact** host set (`www.youtube.com`,
  `youtube.com`, `youtu.be`, `m.youtube.com`, `www.instagram.com`, `instagram.com`, `www.tiktok.com`,
  `tiktok.com`, `vm.tiktok.com`, `x.com`, `twitter.com`, `www.facebook.com`, `facebook.com`) — equality, never
  `endsWith`, which is what lets `youtube.com.evil.test` through. Extract `externalId` per platform, reading
  **only** the parameter that identifies the video so `si`/`t`/`feature` are ignored by construction rather
  than stripped by a list. Derive `kind` from the path: `/shorts/`, `/reel/`, and a TikTok `/video/` are reels;
  `/live/` is a `video`.

  **`fb.watch` is dropped** (ت٢ allows it): it is a pure short-link with no id in the URL, so it would force
  the redirect-chain path for the one platform that also needs a Meta token to resolve at all. `facebook.com`
  canonical video URLs are accepted; a `fb.watch` link resolves to one in the editor's own browser.

- [ ] **Step 3b: Write the failing short-link tests, then implement `followShortLink`.**

```ts
it('follows a vm.tiktok.com link to its canonical URL', async () => {
  fetchMock.mockResolvedValueOnce(redirectTo('https://www.tiktok.com/@uaeaf/video/7300'));
  expect((await followShortLink('https://vm.tiktok.com/ZMabc/'))!.externalId).toBe('7300');
});

it('refuses a redirect that leaves the allowlist', async () => {
  fetchMock.mockResolvedValueOnce(redirectTo('http://169.254.169.254/latest/meta-data/'));
  await expect(followShortLink('https://vm.tiktok.com/ZMabc/')).resolves.toBeNull();
});

it('gives up rather than following a redirect loop', async () => {
  fetchMock.mockResolvedValue(redirectTo('https://vm.tiktok.com/ZMabc/'));
  await expect(followShortLink('https://vm.tiktok.com/ZMabc/')).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(3); // MAX_HOPS
});
```

  Implementation: `redirect: 'manual'`, at most `MAX_HOPS = 3`, and **every hop's `Location` goes through
  `parseVideoUrl` before a socket is opened to it** — which is what makes the guard hold for the chain and not
  only for the first URL.
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Write the failing oEmbed-client tests.**

```ts
it('gives up rather than reading an unbounded body', async () => {
  fetchMock.mockResolvedValue(bodyOfBytes(40 * 1024 * 1024));
  await expect(fetchOembed(youtubeEndpoint)).resolves.toBeNull();
});

it('gives up when the endpoint answers HTML instead of JSON', async () => {
  fetchMock.mockResolvedValue(htmlResponse('<html>error</html>'));
  await expect(fetchOembed(youtubeEndpoint)).resolves.toBeNull();
});

it('gives up when the endpoint is slow', async () => {
  fetchMock.mockImplementation(() => never());
  await expect(fetchOembed(youtubeEndpoint)).resolves.toBeNull(); // AbortSignal.timeout
});

it('does not follow a redirect off the allowlist', async () => {
  fetchMock.mockResolvedValue(redirectTo('http://169.254.169.254/'));
  await expect(fetchOembed(youtubeEndpoint)).resolves.toBeNull(); // redirect: 'manual'
});
```

- [ ] **Step 6: Run and watch them fail.**
- [ ] **Step 7: Implement `fetchOembed`** — `AbortSignal.timeout(5000)`, `redirect: 'manual'`, read the body through a reader that stops past `MAX_OEMBED_BYTES = 256 * 1024`, require `content-type` to contain `application/json`, `try/catch` returning `null` on anything unexpected.
- [ ] **Step 8: Run and watch them pass.**
- [ ] **Step 9: Write the failing `resolveVideo` test** — YouTube/TikTok/X resolve through public oEmbed; Instagram/Facebook return `{ fallback: true, platform }` when `META_OEMBED_TOKEN` is unset (it is optional, per Brief §5.4).
- [ ] **Step 10: Run, implement, run.**

---

## Task 3 — Thumbnails are stored, never hotlinked

Brief §5.5: Instagram and TikTok thumbnail URLs expire, so the bytes are copied at save time through the upload path that already exists.

**Files:**
- Create: `api/src/modules/media-center/videos/resolve/thumbnail.service.ts`
- Test: `thumbnail.service.spec.ts`

**Interfaces:**
- Consumes: `MediaAssetsService.uploadAndCreate()`
- Produces: `storeThumbnail(url: string, title: LocalizedText): Promise<Types.ObjectId | null>`,
  `isAllowedThumbnailHost(hostname: string): boolean`

**ت٣ — Review Focus 6 lives here.** Task 2 guards the URL the *editor* typed. This URL was chosen by the
*remote oEmbed service*, so it is a second, independent untrusted input and gets its own guard.

The host rule differs from Task 2's on purpose: CDNs use unpredictable subdomains (`scontent-lhr8-1.cdninstagram.com`),
so matching here is a **suffix match on the registered domain** — `i.ytimg.com`, `ytimg.com`, `pbs.twimg.com`,
`twimg.com`, `cdninstagram.com`, `fbcdn.net`, `tiktokcdn.com`, `tiktokcdn-us.com`. A suffix match is safe only
because the suffix begins with a dot and is anchored to the end: `evil-cdninstagram.com` must not match, which
is exactly what the test below pins.

- [ ] **Step 1: Write the failing host-rule tests.**

```ts
it.each(['i.ytimg.com', 'scontent-lhr8-1.cdninstagram.com', 'pbs.twimg.com', 'p16-sign.tiktokcdn.com'])(
  'accepts the CDN host %s', (host) => expect(isAllowedThumbnailHost(host)).toBe(true));

it.each([
  'evil-cdninstagram.com',      // suffix must be dot-anchored
  'cdninstagram.com.evil.test', // …and anchored to the END
  'localhost',
  '169.254.169.254',
  '127.0.0.1',
  '10.0.0.5',
  '192.168.1.1',
])('refuses %s', (host) => expect(isAllowedThumbnailHost(host)).toBe(false));
```

- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Write the failing fetch tests** — a thumbnail on an allowed host is fetched once and handed to
  `uploadAndCreate`, and its `_id` is what `storeThumbnail` resolves to; a host off the list resolves to `null`
  **without fetching at all** (`expect(fetchMock).not.toHaveBeenCalled()`); a redirect to an internal address
  resolves to `null`; a non-image `content-type` resolves to `null`; **and every failure still lets the video
  save** — `storeThumbnail` resolves `null`, it never throws.
- [ ] **Step 4: Run and watch them fail.**
- [ ] **Step 5: Implement** — `https:` only, no userinfo, `isAllowedThumbnailHost`, literal-IP rejection
  (loopback, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`, `fc00::/7`), `redirect: 'manual'` with
  each hop re-checked, `AbortSignal.timeout(5000)`, `content-type` starting `image/`, and the byte cap from
  `MAX_UPLOAD_BYTES`.
- [ ] **Step 6: Run and watch them pass.**

---

## Task 4 — Public videos endpoint with every filter

**Files:**
- Create: `api/src/modules/media-center/videos/dto/video-public-response.dto.ts`
- Modify: `videos.controller.ts`, `videos.service.ts`, `videos.repository.ts`
- Test: `videos.service.public.spec.ts`

**Interfaces:**
- Produces: `GET /api/v1/videos/public?kind&platform&category&season&search&from&to&page&limit` →
  `{ items: VideoPublic[]; total; page; limit }`
- Produces: `seasonRange(label: string): { from: Date; to: Date } | null`, `seasonLabel(date: Date): string`,
  `SEASON_START_MONTH = 9` in `videos/season.ts`

- [ ] **Step 1: Write the failing season tests first** — the derived filter is the part with arithmetic in it.

```ts
it('runs a season from September to the following August', () => {
  expect(seasonLabel(new Date('2025-09-01T00:00:00Z'))).toBe('2025–2026');
  expect(seasonLabel(new Date('2026-08-31T23:59:59Z'))).toBe('2025–2026');
  expect(seasonLabel(new Date('2026-09-01T00:00:00Z'))).toBe('2026–2027');
});

it('turns a season label into a half-open range over publishedAt', () => {
  const { from, to } = seasonRange('2025–2026')!;
  expect(from.toISOString()).toBe('2025-09-01T00:00:00.000Z');
  expect(to.toISOString()).toBe('2026-09-01T00:00:00.000Z');
});

it('refuses a label it did not produce', () => {
  for (const bad of ['2025', '2025-2026', 'abc', '2026–2025']) expect(seasonRange(bad)).toBeNull();
});
```

- [ ] **Step 1b: Write the failing list tests** — a `draft` video never appears in the public list; an archived
  one never appears; `kind=reel` returns only reels; `search` is escaped before it reaches Mongo (the same
  guard `articles.service.spec.ts:614` holds); **results are ordered by `publishedAt` descending and nothing
  else** (ت٥ — there is no `order` field to sort by); `season=2025–2026` returns only that window.
- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Implement**, mirroring `articles.service.ts` `findPublicPage` — the escaping helper and the pagination shape already exist there; reuse rather than re-derive.
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Invalidate on write (ت٧).** Publish, edit and delete each call `revalidateTag('videos')`;
  the library fetch and the section fetch both carry that tag.
- [ ] **Step 6: Regenerate `openapi.json`** per the repo's existing script.

---

## Task 5 — Live streams

`Review Focus 2` and `3` live here.

**Files:**
- Create: `api/src/modules/media-center/live-streams/**` (schema, repository, service, controller, dto, module)
- Test: `live-streams.service.spec.ts`

**Interfaces:**
- Produces: `GET /api/v1/live-streams/public/active` → `LiveStreamPublic | null`; `POST /live-streams` (start), `PATCH /live-streams/:id`, `POST /live-streams/:id/end`
- Schema: `url`, `videoId` (the YouTube id), `title` (LocalizedText), `venue` (LocalizedText | null),
  `startedAt`, `expectedEndAt`, `endedAt` (default null), **`isActive` (Boolean, default true)**

**ت٤ — the guarantee is a flag, not the absence of a date.** A partial unique index on
`{ isActive: 1 }` where `isActive: true` is the project's existing pattern (`videos.isLive` uses the same
shape) and it reads far better than an index on `endedAt: null`.

**A stream whose `expectedEndAt` has passed stays `isActive: true` in the database until the next stream
starts. That is deliberate**, and it costs nothing, because `findActive()` filters on the time as well — the
row is invisible to every reader the moment its end time passes, without anything having to run.

- [ ] **Step 1: Write the failing tests.**

```ts
it('reports no active stream once expectedEndAt has passed, with nothing having ended it', async () => {
  await repo.create({ ...base, startedAt: hoursAgo(4), expectedEndAt: hoursAgo(1), endedAt: null });
  expect(await service.findActive()).toBeNull();
});

it('ends the running stream when a new one starts, leaving exactly one active', async () => {
  const first = await service.start({ ...base });
  const second = await service.start({ ...base, url: otherUrl });
  expect((await repo.findById(first.id)).endedAt).not.toBeNull();
  expect(await service.countActive()).toBe(1);
  expect((await service.findActive()).id).toBe(second.id);
});

it('keeps exactly one active when two starts race', async () => {
  const results = await Promise.allSettled([
    service.start({ ...base }),
    service.start({ ...base, url: otherUrl }),
  ]);

  // Every outcome is either a successful start or a clean 409 — never a
  // second active row, and never an unhandled duplicate-key error.
  for (const result of results) {
    if (result.status === 'rejected') expect(result.reason.status).toBe(409);
  }
  expect(await service.countActive()).toBe(1);
});
```

- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Implement.**
  - `findActive()` filters `isActive: true` **and** `expectedEndAt: { $gt: new Date() }` — the expiry is
    evaluated at read time, which is why no cron exists.
  - `start()` runs `updateMany({ isActive: true }, { isActive: false, endedAt: now })`, then inserts with
    `isActive: true`. If the insert is refused by the index (duplicate key), **retry the same two steps
    exactly once**; if it is refused again, throw `ConflictException` (409) with a message naming the running
    stream.
  - `end()` sets `isActive: false` and stamps `endedAt`.
  - Partial unique index: `{ isActive: 1 }`, `partialFilterExpression: { isActive: true }`.
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Validate the URL** with `parseVideoUrl` from Task 2, and require `platform === 'youtube'` (Brief §5.12 — YouTube only). Format only: the test asserts it does **not** claim the stream is genuinely live.

---

## Task 6 — Video section payload, from the existing `pageSections` row

**Files:**
- Create: `api/src/modules/media-center/video-section/**`
- Test: `video-section.service.spec.ts`

**Interfaces:**
- Produces: `GET /api/v1/video-section/public` → `{ enabled, eyebrow, title, description, live: LiveStreamPublic | null, featured: VideoPublic | null, carousel: { heading, items: VideoPublic[] } }`
- Reads: the `pageSections` document with `sectionType: 'VIDEO_LIBRARY'`; `configuration` holds
  `{ featured: { mode: 'latest' | 'specific', videoId }, carousel: { source: 'latest' | 'filtered' | 'manual',
  count, category, season, manualIds, includeReels, heading } }`

**No `championship` key** (Decision 4). `filtered` narrows by `category` and `season` only.

- [ ] **Step 1: Write the failing tests** — the active live stream replaces `featured` and `featured` returns when it ends (Brief §3.4); `includeReels: false` (the default) excludes reels from the carousel; `count` is clamped to 4–12 with 8 the default; `source: 'manual'` preserves the given order; `enabled: false` returns `enabled: false` and nothing else.
- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Tag the fetch** `videos` and `live-stream` (ت٧, Decision 6).

---

## Task 7 — Dashboard: the videos screen

**Files:**
- Create: `apps/dashboard/src/app/[locale]/(app)/videos/page.tsx`, `components/admin/videos/{video-table,live-banner,platform-mark}.tsx`
- Test: `video-table.spec.tsx`

- [ ] **Step 1: Write the failing tests** — the table renders one row per video with its platform mark **and** its visible name (Brief §3.6: the name shows in dashboard tables); a `draft` row is labelled مسودة; the live banner appears only while a stream is active and shows its end time and remaining span.
- [ ] **Step 2: Run, implement, run.** Reuse the dashboard's existing table, tab, search and select components — no new primitives.
- [ ] **Step 3: Sort and filter, not reorder (ت٥).** The table is ordered by `publishedAt` descending, the same
  order the public library uses, so what an editor sees is the order a visitor gets. It carries a **status
  filter** (all / published / draft).

  **No drag handle and no manual ordering** — the owner removed it. The design's drag affordance
  (PDF p. 9, *"اسحب الصفوف لإعادة الترتيب"*) is therefore not built; recorded as a deviation in the report and
  in `video-system.md` §8. Manual ordering still exists where it means something: the carousel's `manual`
  source, ordered by `pageSections.items[]`.

---

## Task 8 — Dashboard: add-video drawer

**Files:** `components/admin/videos/add-video-drawer.tsx`; test `add-video-drawer.spec.tsx`

- [ ] **Step 1: Write the failing tests** — pasting a URL calls resolve once and fills platform/kind/thumbnail;
  **the fetched title seeds BOTH language fields** and either can then be edited independently (ت٧); the dark
  card preview shows the card exactly as the public site draws it; an unsupported URL shows the allowlist
  message and no preview; Instagram with no token shows the manual fallback (title + media-library picker)
  rather than an error; publishing with an empty Arabic title is refused.
- [ ] **Step 2: Run, implement, run.** Fields: العنوان (عربي + إنجليزي), التصنيف, تاريخ النشر. **No
  championship/season field** — the season is derived from the publish date (Decision 4). Buttons: نشر /
  حفظ كمسودة / إلغاء. Reuse `localized-text-pair.tsx`, which the hero editor already uses for exactly this.

---

## Task 9 — Dashboard: go-live dialog

**Files:** `components/admin/videos/go-live-dialog.tsx`; test `go-live-dialog.spec.tsx`

- [ ] **Step 1: Write the failing tests** — default `expectedEndAt` is now + 3 hours; the +1/+2/+3/+5 chips set it; a non-YouTube URL is refused with a format message; the explanatory line about the state disappearing automatically is present; times are Asia/Dubai.
- [ ] **Step 2: Run, implement, run.**

---

## Task 10 — Dashboard: the homepage video-section editor

**Files:** `components/admin/homepage-video/section-editor.tsx`,
`app/[locale]/(app)/homepage/video/page.tsx`, modify `apps/dashboard/src/lib/navigation.ts`

**ت٦ — this goes inside the existing structure.** The search found **no homepage-sections index page**: the
dashboard registers one route per section through `homepageScreen(key, path, grants)`
(`navigation.ts:165-171` — hero, sponsor-strip, sponsors, partners, memberships, footer). So the video
section editor is a seventh entry in that same helper, not a new pattern and not a new paradigm. Recorded
because the correction asked for the alternative to be documented if no index page existed.

- [ ] **Step 1: Write the failing tests** — featured mode `latest` vs `specific`; carousel source
  `latest`/`filtered`/`manual` **defaulting to `latest`**; count select offers 4, 6, 8, 10, 12 and **defaults
  to 8**; `includeReels` defaults off; the note that a live stream replaces the featured video is shown;
  `filtered` offers category and season and **no championship** (Decision 4).
- [ ] **Step 2: Run, implement, run.** Writes `pageSections.configuration` for the `VIDEO_LIBRARY` row; no new
  collection. Register the route with `homepageScreen()` and its grants.

---

## Task 11 — Web: the shared components

`Review Focus 5` lives here.

**Files:** `apps/web/src/components/pages/video/*`, `apps/web/src/styles/video-system.css`

- [ ] **Step 1: Write the failing tests** — `VideoCard` renders the platform name **only** to assistive technology (`sr-only`), while `PlatformBadge` marks the SVG `aria-hidden`; a reel renders in the 9:16 shell and never in the 16:9 one; `EmbedFrame` renders **no iframe** until clicked, then exactly one, `youtube-nocookie.com` for a library video and `youtube.com` for a live stream; `VideoPlayerModal` traps focus, closes on Escape and returns focus to the card that opened it.
- [ ] **Step 2: Run and watch them fail.**
- [ ] **Step 3: Implement.** The dark register lives in `video-system.css` as variables scoped to `.video-system`, never as global tokens. Platform marks are inline SVG copied per ADR-0068's precedent, no icon dependency.
- [ ] **Step 4: Run and watch them pass.**
- [ ] **Step 5: Compute and record every contrast pair** in the dark register with the WCAG formula, unrounded — text, secondary, muted, green-on-dark, live red, and the hairline against both surfaces.

---

## Task 12 — Web: the homepage section, both states

**Files:** `apps/web/src/components/pages/home/video-section.tsx`; modify the homepage composition

- [ ] **Step 1: Write the failing tests** — the resting state draws the featured video with one large play button over the cinematic backdrop; the live state draws the player with the glowing red frame, the pulsing badge, title, venue and the مشاركة / فتح على YouTube pair; the section renders nothing when `enabled` is false.
- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Tag the fetch** `live-stream` and `videos`, and set `revalidate = 60` (Decision 6, ت٧).
- [ ] **Step 4: Share (ت٧).** Write the failing tests first: where `navigator.share` exists the button calls it
  with the page URL and title; where it does not, the link is copied and a confirmation is announced in a
  polite live region. `navigator.share` rejects with `AbortError` when the reader dismisses the sheet — that
  is a normal outcome and must not surface as an error.

---

## Task 13 — Web: the library page

**Files:** modify `apps/web/src/app/[locale]/media/videos/page.tsx`; add the filter bar, reels shelf and grid

- [ ] **Step 1: Write the failing tests** — filters round-trip through the URL exactly as `feed-query.ts` does
  for news (reuse that shape, do not invent a second one): `kind`, `platform`, `category`, `season`, `search`,
  `from`/`to`. "مخصص" reveals the from/to pair; the reels shelf is separate from the grid; the grid is
  3 → 2 → 1 columns; "عرض المزيد" appends without losing filters; the empty state matches PDF p. 7 and its
  "مسح التصفية" clears them; **the list is `publishedAt` descending** (ت٥); the share control behaves as in
  Task 12 Step 4. **No championship filter** (Decision 4).
- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Indexability.** The page currently ships `noindex` because it had no list (Chapter 14 §11). With a list, it becomes indexable — change it in `lib/pages/indexability.ts`, where that decision already lives, so robots and the sitemap cannot disagree.
- [ ] **Step 4: `VideoObject` JSON-LD** for library videos and `BroadcastEvent` for the active stream, plus metadata and hreflang.

---

## Task 14 — Web: media-centre active navigation state

**Files:** the shared nav component *(the one exception Brief §8 allows)*

- [ ] **Step 1: Write the failing test** — "المركز الإعلامي" is `aria-current` on `/media/videos` and on `/media/albums`, not only on an exact match.
- [ ] **Step 2: Run, implement, run.**
- [ ] **Step 3: Read the menu labels for hamza errors** and correct only the text (Brief §5.18).

---

## Execution method (owner ruling, 2026-09-23)

Hybrid, **not** subagent-per-task:

1. All tasks are implemented inline in the session, via `superpowers:executing-plans`.
2. **Independent review 1** — a subagent, after Tasks 2 **and** 3 together, because that is all the code that
   fetches from outside: allowlist bypass, redirect chains, internal addresses and DNS rebinding, size,
   timeout and content-type.
3. **Independent review 2** — a subagent over every change, after Task 14 and **before** `/impeccable`.
4. Both reviews are applied through `superpowers:receiving-code-review` — verified, not accepted on sight.

---

## Task 15 — Polish, simplify, verify, document

Strictly in this order; Brief §5 Phase 4 is explicit that the order is the point.

- [ ] **`/impeccable critique`** across all new screens at once (Brief §12: one pass per stage, not per screen), against `docs/design-specs/video/video-design.pdf`. Record every note. Implement those in scope; record the rest without implementing.
- [ ] **`/impeccable audit`** — the eight interaction states, contrast, focus-visible, RTL, reduced-motion, zero-iframes-before-click, transform/opacity only. Fix everything it finds.
- [ ] **`/impeccable polish`** — easing, timings, hover/active, alignment, radii, skeletons.
- [ ] **`/simplify`** on this session's changed files only. **Zero behaviour or visual change** — the look was frozen in the step above. Anything larger than a local simplification goes to the backlog unimplemented. Re-run the affected tests after.
- [ ] **Browser verification** at 1440 / tablet / 390, AR and EN, both states, modal playback, filters, reduced-motion. Any visual difference appearing after `/simplify` means it changed the look — revert that change.
- [ ] **Write `docs/engineering/video-system.md`** with the nine agreed sections.

---

## Self-Review

**Spec coverage.** Brief §5 steps 3–22 each map to a task: 3→T1, 4→T2, 5→T3, 6→T5, 7→T6/T10, 8→T4/T6, 9→T4, 10→T7, 11→T8, 12→T9, 13→T10, 14→T7–T10, 15→T11, 16→T12, 17→T13, 18→T14, 19→T11, 20→T11/T13, 21→T12, 22→T13, 23–26→T15.

**Gaps, stated rather than hidden — both now ruled by the owner:** the championship reference is removed and
the season is computed (Decision 4); no CSP is authored and its origins are listed as a backlog item
(Decision 5). Brief §5.19's `frame-src` line has no target to act on. Two design elements are therefore
deliberately not built — the championship control on three screens, and the drag handle on the dashboard
table (ت٥) — and both are recorded as deviations rather than omissions.

**Review Focus 6** (ت٣) is pinned to Task 3.

**Type consistency.** `parseVideoUrl` and `resolveVideo` (T2) are consumed by name in T3 and T8; `VideoPublic` (T4) is what T6, T12 and T13 render; `findActive()` (T5) is what T6 calls. `kind`/`platform`/`category`/`status` use one spelling throughout.

**Review Focus.** All six are pinned: 1 and 4 → Task 2, 2 and 3 → Task 5, 5 → Task 11, 6 → Task 3.
