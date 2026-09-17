# Homepage Hero Dashboard Screen — Implementation Plan

> **For agentic workers:** execute task by task, in order; steps use checkbox (`- [ ]`) syntax. TDD for every piece of logic: write the test, watch it fail for the right reason, implement, watch it pass. **No git command of any kind** (owner constraint); nothing is committed.

**Goal:** an admin manages the homepage hero end to end at `/[locale]/homepage/hero` in the dashboard: slides, text, buttons, images and focal points, the phone picture, the English picture, visibility and schedule, playback, and the next-event bar. A live preview matches the site because both use one shared module.

**Architecture:**
- **Shared module:** a TypeScript-source workspace package, `@uaeaf/content/hero`, holds the pure calculations: height, image resolution, object position, event-bar state, limits. The web hero and the dashboard preview both import it.
- **API:** tightened inside `heroSlides` and the HERO section's `configuration` only.
- **Dashboard:** a server page loads the page → section → slides → media, then hands off to a client editor. The editor keeps one draft. "Save" runs the minimal sequence of existing API writes; save is publish.

**Tech stack:** NestJS 11 + Mongoose + Jest (api) · Next.js 16 + next-intl + Vitest + Playwright (web, dashboard) · Motion 13 (site only) · npm workspaces.

**Spec:** the owner's prompt «المهمة التالية: بناء شاشة إدارة هيرو الصفحة الرئيسية في الداشبورد» (2026-09-17). Decisions and mapping table: `docs/plans/homepage-hero-design.md` §٢٧. ADR-0076, ADR-0078, ADR-0080, ADR-0081.

## Global Constraints

- **Git:** no git command at all; everything uncommitted.
- **Dependencies:** none new. An internal workspace is allowed, with no external package.
- **Servers:**
  - never `nest build` while `--watch` runs; type-check with `npx tsc --noEmit`;
  - 3000 is touched only to revive it, as one tree;
  - 3002 may be restarted when needed, as one tree.
- **Tests:** heavy suites on one worker, and never two suites at once.
- **Schema:** changes only inside `heroSlides`, the HERO section's configuration, and `mediaAssets`.
- **Protected, do not edit:**
  - the site's hero decisions and tests, ADR-0078;
  - `HERO_SCRIM`;
  - `page-rules` and `identity-lines`, and the 32px threshold;
  - `row-capacity.ts` and `countable`;
  - `appendItem`, renumbering, and forged `_id` rejection;
  - RBAC (catalogue rows only);
  - the built pages on the site and in the dashboard.
- **Code:**
  - CSS logical properties and existing tokens, with contrast measured;
  - arrow functions, and `try/catch` where it is needed;
  - English comments that explain why.
- **Stop only at:**
  - a schema change outside the allowed collections;
  - a missing dependency for image dimensions (not needed: already stored);
  - a site hero test turning red after moving to the shared module;
  - a §3 decision that contradicts the code;
  - a server that cannot be revived as one tree.

---

## File map

| Area | Create | Modify |
| --- | --- | --- |
| Shared | `packages/content/package.json`, `packages/content/tsconfig.json`, `packages/content/vitest.config.mts`, `packages/content/hero/{index,height,image,event-bar,limits,playback}.ts` and a `.spec.ts` beside each | root `package-lock.json` (workspace link only) |
| API | `hero-slides/hero-slides.visible.spec.ts`, `page-sections/hero-settings.ts`, `page-sections/hero-settings.spec.ts` | `hero-slides.service.ts`, `hero-slides.validation.ts`, `dto/create-hero-slides.dto.ts`, `dto/update-hero-slides.dto.ts`, `dto/hero-slide-parts.dto.ts`, `page-sections.service.ts`, `common/errors/api-error-code.ts`, `openapi.json` |
| Web | — | `components/pages/home/{hero.tsx,hero-picture.tsx,hero-stage.ts,hero-controls.tsx,hero-event-bar.tsx,hero-countdown.tsx}`, `lib/pages/{homepage.ts,next-event.ts}` (next-event moves to the shared module), `app/[locale]/page.tsx`, `messages/{ar,en}.json` |
| Dashboard | `app/[locale]/(app)/homepage/hero/page.tsx` (+ `page.spec.tsx`), `app/api/admin/hero-slides/{route.ts,[id]/route.ts,reorder/route.ts}` (+ spec), `app/api/admin/page-sections/[id]/route.ts` (+ spec), `lib/admin/homepage-hero.ts` (+ spec), `components/admin/homepage-hero/{editor,top-bar,slide-strip,text-fields,cta-card,image-field,focal-point-picker,english-picture,visibility,playback,event-bar-editor,hero-preview}.tsx` (+ specs) | `lib/navigation.ts` (+ spec), `lib/api/admin-write.ts` (codes), `lib/admin/media-options.ts` (width/height/isAiGenerated), `components/admin/pages/media-picker.tsx` (chip), `messages/{ar,en}.json` |
| Docs | `docs/engineering/how-hero-dashboard-works.md`, ADR-0083 (shared module), ADR-0084 (save = publish and the draft debt; the manual event bar; deviations) | `DOCUMENTATION-INDEX.md`, `docs/engineering/how-hero-works.md` if it exists, the progress log |

---

### Task 1: The shared workspace `@uaeaf/content`

**Files:**
- Create: `packages/content/package.json`:
  - `{"name":"@uaeaf/content","private":true,"version":"0.1.0","type":"module","exports":{"./hero":"./hero/index.ts"}}`
- Create: `packages/content/tsconfig.json` (strict, `moduleResolution: bundler`, `noEmit`)
- Create: `packages/content/vitest.config.mts` (`include: ["hero/**/*.spec.ts"]`, node environment)

- [ ] Back up `package-lock.json` to the scratchpad.
- [ ] Run `npm install --offline --ignore-scripts --no-audit --no-fund` at the root.
- [ ] Compare the lockfile with the backup using `diff`. Expected: only the `packages/content` and `node_modules/@uaeaf/content` entries are added.
- [ ] Check that `node_modules/@uaeaf/content` links to `packages/content`.

### Task 2: Shared functions (TDD)

**Interfaces (produced):**
```ts
export const heroHeight: (viewport: { width: number; height: number }, headerHeight: number, contentHeight?: number) => number;
// ADR-0078: max(viewport.height - headerHeight, contentHeight ?? 0)

export type HeroDevice = "desktop" | "tablet" | "mobile";
export const HERO_MOBILE_MAX_WIDTH = 640; // the <source media> switch
export interface ResolvedImage { image: PublicImageLike; focalPoint: {x:number;y:number}; mirrored: boolean; objectPosition: string; origin: string; source: "desktop" | "mobile" | "ltr" }
export const resolveImage: (slide: HeroSlideLike, locale: "ar" | "en", device: HeroDevice) => ResolvedImage | null;
export const objectPosition: (focalPoint: {x:number;y:number}, mirrored: boolean) => string; // mirrored: `${100-x}% ${y}%`

export type EventBarState = { state: "before"; days: number; hours: number; minutes: number } | { state: "live" } | { state: "hidden" };
export const eventBarState: (event: NextEventLike | null, now: Date) => EventBarState; // Asia/Dubai, startsAt/endsAt instants
export const formatEventDateTime: (iso: string, locale: "ar" | "en") => string;

export const HERO_TEXT_LIMITS: { eyebrow: number; title: number; subtitle: number; eventName: number; eventLabel: number; eventVenue: number };
export const HERO_PLAYBACK: { intervals: readonly number[]; defaultIntervalMs: number; transitionMs: number };
export const graphemeLength: (text: string) => number;
```

`HeroSlideLike` is the public slide shape: `desktop`, `desktopLtr`, `mobile`. The dashboard adapts its draft to it.

**Tests** (`hero/*.spec.ts`):
- **height:** 1440×900 with a 96px header gives 804; a content height of 900 at 844×390 gives 900.
- **image:**
  - AR desktop: composed picture, not mirrored.
  - EN desktop with mirror: mirrored, object position `30% 62%` for a stored x=30, origin `70% 62%`.
  - EN separate: the separate picture as it is.
  - Mobile with `mobile` set: the mobile picture, never mirrored, in both languages.
  - Mobile without `mobile`: the landscape resolution for that language, mirroring included.
  - Tablet behaves as desktop, because 768 > 640.
  - Returns `null` when `desktop` is null.
- **event bar:**
  - hidden when `isVisible` is false or a field is missing;
  - before, with a Dubai countdown rounded down to the minute;
  - live from `startsAt` up to `endsAt`;
  - hidden from `endsAt` on, including the exact instant;
  - handles the Dubai midnight boundary.
- **limits:** `graphemeLength("é👍🏽")` counts clusters; each limit is a positive integer.

- [ ] Write the failing tests, run `npx vitest run --root packages/content`, and confirm they fail because the module is missing.
- [ ] Implement, then confirm they pass.

### Task 3: Measure the text limits at 390

- [ ] Write a Playwright script (scratchpad) against `localhost:3001` at 390×844, both languages.
- [ ] For each field, binary-search the longest prefix of three realistic sentences that stays within the hero's own element in the owner's line budget:
  - eyebrow: 1 line;
  - title: 2 lines ("سطران كحد أقصى");
  - subtitle: 3 lines.
- [ ] Take the minimum over the samples and both languages.
- [ ] For the event name, use its bar element at 390 with a 1-line budget.
- [ ] Record the numbers and the method in the progress log.
- [ ] Put them in `HERO_TEXT_LIMITS`, and update the Task 2 test to the measured values.

### Task 4: Move the site onto the shared module (no behaviour change)

**Files:**
- Modify: `hero-stage.ts`. It keeps the transition logic only; `landscapeFor` is replaced by `resolveImage`.
- Modify: `hero-picture.tsx`. It takes the `ResolvedImage` for desktop and for mobile.
- Modify: `lib/pages/next-event.ts`. Deleted; the web imports `eventBarState` and `formatEventDateTime`.
- Modify: `hero-countdown.tsx` and `hero-event-bar.tsx`.
- Modify: `hero-controls.tsx`. The dwell comes from `HERO_PLAYBACK` / the section's playback.

- [ ] Run web vitest before any change and record the count (493 last run).
- [ ] Migrate; `hero-stage.spec` image cases move to the shared spec (same expectations).
- [ ] Run web vitest, tsc and eslint: same count ± the moved tests, 0 failures.
- [ ] Run the home geometry script: 0 failures, the same table as §٢٦.

### Task 5: API — hidden slides may be incomplete, visible ones may not (TDD)

**Files:**
- Test: `hero-slides.visible.spec.ts`
- Modify: the service, validation and DTOs (text DTO allowing empty strings: `HeroLocalizedTextDto` with `@IsString()` and a `@MaxLength` of the measured limit)
- Modify: `api-error-code.ts`, adding `incompleteSlide` and `heroTextTooLong`

**Rules:**
- A new slide defaults to `active: false`.
- When `active` is true on the merged slide, it needs:
  - `title.ar`, `title.en`, `subtitle.ar` and `subtitle.en` non-blank;
  - for `IMAGE`, an `imageAssetId`;
  - buttons complete (existing);
  - `separate` complete (existing).
  Otherwise the save is refused with `incompleteSlide` and `missing: [...]`.
- A hidden slide may be saved with blank text and no image. The CTA and `separate` rules still apply to what is filled.
- Texts over `HERO_TEXT_LIMITS` are refused with `heroTextTooLong`, naming the field and the limit.
- The public read keeps filtering `active` and a resolvable `desktop`.

**Tests:**
1. A create with no `active` stores `false`.
2. An inactive create with empty title and no image resolves.
3. An active create with an empty `title.en` rejects `incompleteSlide` with `missing` containing `title.en`.
4. Activating a stored slide that has no image rejects, and nothing is written.
5. An eyebrow over the limit rejects `heroTextTooLong` with `field: 'eyebrow.ar'`.
6. All existing hero-slides specs stay green.

- [ ] Red, then green; run `npx tsc --noEmit`.

### Task 6: API — the HERO section's settings (TDD)

**Files:**
- Create: `page-sections/hero-settings.ts`
- Test: `page-sections/hero-settings.spec.ts`
- Modify: `page-sections.service.ts`, which calls the check for `sectionType === 'HERO'` on create and on the merged update

**Shape:**
```ts
configuration.nextEvent: { isVisible: boolean; label: {ar,en}; name: {ar,en}; venue: {ar,en}; startsAt: string /* ISO instant */; endsAt: string }
configuration.playback: { autoplay: boolean; intervalMs: 5000 | 7000 | 9000 }
```

**Codes:**
- `incompleteNextEvent` (with `missing`);
- `nextEventEndsBeforeStart`;
- `heroTextTooLong` (the name, label and venue limits);
- `invalidPlayback`.

**Tests:**
- a visible event with every field is stored;
- a visible event missing `venue.en` is rejected;
- a hidden event with empty fields is stored;
- `endsAt` equal to `startsAt` is stored, and one minute earlier is rejected;
- an interval of 6000 is rejected;
- a non-HERO section's configuration is untouched;
- the update checks the merged configuration.

- [ ] Red, then green, then tsc.

### Task 7: Web reads the new settings; local seed migrated

- [ ] Modify `readNextEvent` to read the new shape, returning `{label,name,venue,startsAt,endsAt}` or `null` using `eventBarState`.
- [ ] Order in the bar: date/time and venue, then name, then countdown.
- [ ] Read playback into the controls: autoplay off means no dwell timer, while manual navigation still works.
- [ ] Add a spec for the reader, then run tests and the contrast and geometry scripts for the home hero (0 failures).
- [ ] Migrate the local DB HERO section with mongosh (local URI checked first): the old `{title,venue,date}` becomes the new shape, plus `playback {autoplay:true, intervalMs:7000}`.
- [ ] Update `seed-hero.js`.

### Task 8: OpenAPI

- [ ] Run `npm run generate:openapi` in `api` (a tsc to `dist-openapi`, not `nest build`), and check that the new codes and DTO fields appear.

### Task 9: Dashboard model (TDD)

**File:** `lib/admin/homepage-hero.ts`. Pure, no React.

```ts
export interface SlideDraft { key: string; id: string | null; active: boolean; scheduledFrom: string | null; scheduledTo: string | null; eyebrow: {ar:string;en:string}; title: {ar:string;en:string}; subtitle: {ar:string;en:string}; primaryCta: CtaDraft; secondaryCta: CtaDraft; imageAssetId: string | null; desktopFocalPoint: Point; useMobileImage: boolean; mobileImageAssetId: string | null; mobileFocalPoint: Point; ltrImageMode: "same"|"mirror"|"separate"; ltrImageAssetId: string | null; ltrFocalPoint: Point | null }
export interface HeroDraft { sectionId: string; slides: SlideDraft[]; nextEvent: NextEventDraft; playback: { autoplay: boolean; intervalMs: number } }
export const fromApi: (section: SectionRecord, slides: SlideRecord[]) => HeroDraft;
export const isDirty: (saved: HeroDraft, draft: HeroDraft) => boolean;
export const validateDraft: (draft: HeroDraft) => FieldError[]; // mirrors the API rules, for inline errors before the round trip
export const planSave: (saved: HeroDraft, draft: HeroDraft) => SaveStep[]; // creates, patches (changed fields only), deletes, reorder (only if the order changed), section patch
export const addSlide: (draft: HeroDraft) => HeroDraft; // appends active:false, refuses at 5
export const duplicateSlide / removeSlide / moveSlide(draft, key, delta) / toPreviewSlide(slide, media): HeroSlideLike
export const smallImageWarning: (asset: {width:number;height:number}, device: "desktop"|"mobile") => boolean; // desktop: width < 1920*2; mobile: width < 390*3
```

**Tests:**
- `planSave` ordering:
  - creates before reorder;
  - reorder uses the server ids returned by creates;
  - a deleted slide is not reordered;
  - no step when nothing changed.
- `validateDraft`:
  - an active slide with an empty `title.en` gives an error on `slides[k].title.en`;
  - an inactive one gives none;
  - a visible CTA without a URL fails;
  - `endsAt < startsAt` fails.
- `addSlide`: at 5 it is refused; a new slide is inactive.
- `moveSlide`: the keyboard delta clamps at the ends.
- `toPreviewSlide` plus `resolveImage`: the English mirror flips the preview.

### Task 10: Dashboard plumbing

**Route handlers** (the `forwardWrite` pattern, ids through `isMongoId` / `encodeURIComponent`, shapes checked):
- `POST /api/admin/hero-slides`
- `PATCH|DELETE /api/admin/hero-slides/[id]`
- `PATCH /api/admin/hero-slides/reorder`
- `PATCH /api/admin/page-sections/[id]`

Specs assert the upstream path and the refusals.

**Errors:**
- Add the codes to `admin-write.ts`:
  - `incompleteCta`, `ctaLabelTooLong`, `invalidCtaUrl`;
  - `incompleteLtrImage`, `incompleteSlide`, `heroTextTooLong`;
  - `incompleteNextEvent`, `nextEventEndsBeforeStart`, `invalidPlayback`.
- Add `WriteErrors` copy in ar/en; `write-error-copy.spec` must pass.
- `forward()` also passes `field` and `missing`, so errors can sit beside their fields; add a spec for it.

**Navigation and media:**
- Add "Homepage", with its "Hero" child, to `navigation.ts`. It requires `heroSlides:Update` and `pageSections:Update`; update its spec.
- `media-options.ts` carries `width`, `height` and `isAiGenerated`; update its spec.

### Task 11: The dashboard screen

- **Page** (`homepage/hero/page.tsx`, server):
  - `readGrants`, then `AccessDenied`;
  - `fetchAsUser`: `/pages` → the `home` page → `/page-sections/by-page/:id` → the HERO section → `/hero-slides/by-section/:id` and `/media-assets`;
  - empty and error states;
  - spec.
- **Editor** (`components/admin/homepage-hero/*`): each component gets a spec (keyboard, aria, validation display).
  - Top bar: trail, save state, open site, Save disabled when clean, error summary linking to fields, `beforeunload`, temporary-images badge.
  - Slide strip: cards with thumbnail, number, title, status (visible / hidden / scheduled) and temporary chip. Drag plus Move buttons, `aria-live` position, the "X of 5" counter, Add disabled at 5 with its explanation line, and a warning when switching with unsaved changes.
  - Text fields: Arabic and English columns, counters from `HERO_TEXT_LIMITS` via `graphemeLength`, the "two lines at most" hint.
  - CTA cards: switch (`role="switch"`), labels, URL with the internal/external hint, role badge, the lone-visible hint, inline "required because the button is visible".
  - Image field: `MediaPicker`, dimensions and small-image warning, focal-point picker (click, drag, arrows 1%, Shift 10%, coordinates, text-zone overlay by language), the mobile switch with its own picker, the English picture as a `radiogroup` of three cards with the mirror warning and separate pickers.
  - Visibility: switch, `datetime-local` from/until in Dubai time, duplicate, delete with `ConfirmDialog`.
  - Playback: autoplay switch, interval radio (5/7/9s), a line about pausing on hover or touch and reduced motion.
  - Event-bar editor: switch, ar/en columns (label, name with counter, venue), starts/ends with hints, a state preview with before / live / after buttons from `eventBarState`.
  - Hero preview: device (1440×900 / 768×1024 / 390×844) and language toggles. A frame at the real ratio with `heroHeight`, scaled to the column. It draws the picture with `resolveImage` / `objectPosition`, the mirror, the directional scrim (same class strings exported from the shared module), the text, visible buttons, progress lines and the event bar, with no motion, plus an explanation line.

### Task 12: Verification

- **Unit:** API specs one file at a time; `packages/content` vitest; dashboard vitest, tsc and eslint; web vitest, tsc and eslint.
- **Live e2e** (`apps/dashboard/e2e/homepage-hero.spec.ts`, against 3002 + 3001 + 3000; logs in as the local admin from `api/.env`), the owner's 8 scenarios, then the seed restored with `seed-hero.js`.
- **Preview match:** the focal-point pixel position in the preview frame vs the site at the same device and language; difference ≤ 2%.
- **Accessibility:** axe-like checks by script (names, roles, `aria-invalid`/`aria-describedby`), a keyboard-only pass, measured contrast of the screen's text.
- **Screenshots:**
  - the screen in ar and en at 1440 and 1280;
  - the preview × 3 devices × 2 languages × 3 English modes;
  - the error and empty states.
- **INP:** 4× throttle, typing in the title and dragging the focal point; the Event Timing API processing to next paint must be ≤ 200ms.
- **Design review:** impeccable audit, then polish; fix P0 and P1.
- **Code review:** before the report.

### Task 13: Documentation

- `how-hero-dashboard-works.md` with the nine items and the traced example.
- ADR-0083: the shared module.
- ADR-0084: save = publish and the draft debt; the manual event bar; deviations.
- `DOCUMENTATION-INDEX.md` and the progress log.
