# ADR-0083 — The Hero Rules Shared by the Site and the Dashboard

**Status:** **Accepted** — owner decision 2026-09-17 («المعاينة بحسابات الموقع نفسها من وحدة مشتركة واحدة»); the location was left to implementation and is recorded here for the owner's review.
**Date:** 2026-09-17

---

## Context

The dashboard's homepage hero screen has a live preview. A preview that does its own arithmetic is a second implementation of the hero, and two implementations drift: a crop, a flip or a height that differs by a few percent is exactly what an editor cannot see until it is live.

The values that decide what a visitor sees were spread across the site:

- the first-screen height (ADR-0078), in CSS and in the geometry guard;
- which picture a slide shows for a language and device, where it is cropped and whether it is flipped (ADR-0080 D1), in `hero-picture.tsx`;
- the next-event bar's state (countdown, live, hidden), in `lib/pages/next-event.ts`;
- the text limits measured at 390px, in nothing at all yet.

The two apps share no code. `packages/design-tokens` holds tokens only.

## Decision

1. **A TypeScript-source workspace, `packages/content`, published inside the monorepo as `@uaeaf/content`, with one entry point: `@uaeaf/content/hero`.**
   - No build step: both Next apps compile it as source (`exports: { "./hero": "./hero/index.ts" }`).
   - No runtime dependency: pure functions and constants. `Intl.Segmenter` and `Intl.DateTimeFormat` come from the platform.
   - Linked with `npm install --offline --ignore-scripts`. The lockfile diff is the workspace's own entries only. §9's "no new dependency" allows an internal workspace.
2. **What it holds**, each with its spec in the package (48 tests):

   | Module | Exports | Used by the site | Used by the dashboard |
   | --- | --- | --- | --- |
   | `height.ts` | `HEADER_HEIGHT_PX`, `heroHeight` | the rule the CSS states (`.hero-first-screen`) | the preview frame's height |
   | `image.ts` | `resolveImage`, `objectPosition`, `heroDevice` | `hero-picture.tsx` | the preview, the strip thumbnails |
   | `event-bar.ts` | `eventBarState`, `formatEventDateTime`, `dubaiLocalToIso`, `isoToDubaiLocal` | `hero-event-bar.tsx`, `hero-countdown.tsx` | the bar preview and its fields |
   | `limits.ts` | `HERO_TEXT_LIMITS`, `HERO_CTA_LABEL_MAX`, `HERO_PLAYBACK`, `graphemeLength`, URL rules | `readPlayback` | counters, pre-save checks |
   | `draft.ts` | `resolveLtrPicture`, `HERO_IMAGE_MIN_WIDTH`, `isSmallImage` | — (the API resolves `desktopLtr`) | the preview of an unsaved slide, the size warning |
   | `presentation.ts` | `heroScrim`, `heroFrameLayout`, `heroType` | the scrim gradients (as CSS custom properties) | the preview frame |

3. **The API keeps its own copy of the limits and intervals** (NestJS, CommonJS/ESM Jest, no workspace link), guarded by two drift tests that read the package's source and fail on any difference (`hero-slides.visible.spec.ts`, `hero-settings.spec.ts`).
4. **The site's behaviour did not change by moving.** Measured before and after: web vitest 485/485, homepage geometry 0/16, the contrast run unchanged. Moving the scrim into shared strings kept the same gradients: the site reads them as custom properties set on the element.

## Consequences

- One place to change a hero rule, and the preview follows it without an edit.
- A breakpoint-dependent rule has to be expressible as a function of width (`heroFrameLayout(width)`), because the preview frame has no viewport of its own. The site still applies the same values through its CSS at real breakpoints. The two are kept honest by the preview-match test (focal-point position in the frame within 2%).
- The API copy is a known duplication, bounded by the drift tests. Linking the workspace into the API is not worth a module-system change today.

## Alternatives rejected

- **The preview renders the site in an iframe.** It would draw only saved content, and the preview's whole purpose is the unsaved draft.
- **Duplicate the arithmetic in the dashboard with a comment.** That is the drift this ADR exists to prevent.
- **Put the rules in `packages/design-tokens`.** That package is tokens; functions would change what it is.
