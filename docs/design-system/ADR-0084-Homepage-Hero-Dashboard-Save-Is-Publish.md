# ADR-0084 — The Homepage Hero Dashboard: Save Is Publish, and Its Deviations

**Status:** **Accepted** — owner decisions of 2026-09-17 (prompt «بناء شاشة إدارة هيرو الصفحة الرئيسية في الداشبورد», §3). The deviations in D4 are recorded for the owner's review.
**Date:** 2026-09-17
**Related:** ADR-0078 (first-screen height), ADR-0080 (English picture), ADR-0081 D4 (the manual event bar), ADR-0083 (the shared hero rules).

---

## Context

The homepage hero had no editing screen. Its slides, next-event bar and playback were written by seed scripts and by hand in the database. Every other content page in the dashboard edits a workflow-governed record, but `heroSlides` and the HERO section's settings have no workflow: a write is what visitors get.

## Decisions

### D1 — Save is publish (owner)

- One explicit **Save** for the whole screen. It is disabled while nothing differs from what is stored.
- A visible **unsaved** state, a warning before leaving the page, and a warning before switching away from a slide with unsaved changes.
- The draft lives in the screen's memory only. Save sends the difference as the fewest writes, in the order the API accepts:
  1. deletes (the five-slide limit counts stored slides);
  2. creates;
  3. updates of changed fields only;
  4. the whole order again whenever anything was created, deleted or moved;
  5. the section's settings.
- Before anything is sent, the draft is checked with the API's own rules. What the API still refuses is placed beside its field and in a summary that links to it.
- A refusal part-way through a save is reported as such ("part of the changes were saved"). What landed is re-read, and only what did not land stays unsaved.

### D2 — Slides start hidden; visible means complete (owner)

- A new slide, added or duplicated, is `active: false`.
- A hidden slide may be saved half-written.
- A visible slide is refused (`incompleteSlide`) without both titles, both texts and its picture. Texts over their measured limits are refused at any visibility (`heroTextTooLong`).

### D3 — The preview draws with the site's rules (owner)

The preview is one module shared with the site (ADR-0083):
- three device frames (1440×900, 768×1024, 390×844) × two languages;
- at the device's real width, scaled to fit;
- still, with no transition.

Verified live: the subject's position inside the frame matched the site's exactly (Δ 0.0000) in Arabic and in flipped English.

### D4 — Deviations from the owner's screen description, with the reason

| Described | Built | Why |
| --- | --- | --- |
| Slide cards "horizontal" | A wrapping grid: 1 column on phones, 2 from `sm`, 3 from `lg`, 6 from `2xl` | Five cards plus the add card do not fit one row at 1280 without shrinking the thumbnail below legibility. The order still reads in one direction. |
| Button cards side by side | Stacked | Side by side at 1440 left 79px per field and cut the labels («Butto…»), measured on the first live screenshot. |
| Editor and preview in two equal columns | 3:2, editor wider, from `xl` | With equal columns the bilingual field labels were cut. The preview scales its frame to any width, so the narrower column costs it nothing. |
| Preview as a separate column below `xl` | Below `xl` the preview follows the editor | No width below `xl` holds both a readable editor and a frame. |
| "No motion" in the preview | No transition and no Ken Burns; the countdown does not tick | As described. The bar's states are shown by the three state buttons instead of waiting for time to pass. |

### D5 — What a live verification found and fixed (2026-09-17)

- **API:** partial updates cleared unsent fields. The `has()` presence check in `HeroSlidesService.update` and `PageSectionsService.update` asked `Object.hasOwn`, which is true for every declared field of a DTO instance after `ValidationPipe({ transform: true })`. It now asks `!== undefined`, and an explicit `null` still clears. The test goes through `plainToInstance`.
- **Permissions:** the catalogue rows `heroSlides:Update` and `pageSections:Update` were missing from the local `permissions` table. They were synced by `bootstrap-admin`, which grants catalogue rows to Super Admin and leaves accounts alone.
- **Preview:** it was invisible in Arabic. The frame is anchored by physical `left`, because `start` in an RTL frame anchored it by its right edge and the top-left scale then drew it outside its box. The box is now content-box, measured inside its border.
- **Responsiveness:** a keystroke re-rendered the whole screen (696ms at CPU ×4). The strip and preview now take a deferred draft, the heavy parts are memoised with stable callbacks, and the worst interaction is 176ms.

### D6 — The code review before the report (2026-09-17)

Fixed, each with a test that failed first:
- **Edits during a save:** the editor is `inert` while the requests run. The stored state moves to what was saved at once. A later re-read replaces the draft only if nothing was typed since.
- **A second Save before the re-read:** after a partial save, Save waits for the re-read. It would otherwise re-plan writes that already landed.
- **Permissions:** the page and its link require every grant one Save can use (`HOMEPAGE_HERO_GRANTS`): read, create, update and delete slides, and read and update the section.
- **Counting button labels:** the API counts graphemes, as the screen and the texts do. An Arabic label with vowel marks is no longer refused after the screen accepted it.
- **In-app navigation:** a link that leaves the page with unsaved changes opens a confirmation.
- **Misplaced refusal:** an `incompleteCta` refusal lands on the button's own fields.
- **Unpublished homepage:** it reads as "no homepage", not "load failed".
- **Small fixes:**
  - the focal-point marker can be dragged;
  - the live coordinates line is quiet while dragging;
  - keyboard reorder moves from the slide's current place;
  - radio groups are named once;
  - a picture's error is described on its group;
  - the error summary is announced once.

Declined: removing the warning when switching slides with unsaved changes. The owner asked for it («تبديل الشريحة بتغييرات غير محفوظة: تحذير»).

## Consequences

- **Known limitation, accepted by the owner (2026-09-17) — the browser's Back button** is not guarded; only closing the page and in-app links are. Recorded, not built. If the re-read after a partial save never arrives, Save stays disabled until the page is reloaded.
- **Closed 2026-09-17 — a schedule whose end is before its start** is refused: the API (`scheduleEndsBeforeStart`, checked on the slide as it would be stored) and the screen (beside "Hides after", before sending). An end equal to the start, and an open end, are allowed.

- **Debt — no draft, no review, no history for the hero.** An editor cannot prepare the next campaign's slides without publishing them, except as hidden slides, and there is no revision to restore. A draft/publish model, or workflow policies for `heroSlides` and HERO settings, is a later decision.
- **Debt — no undo after Save.** Saving is final.
- **Closed 2026-09-17 — the destructive button's contrast.** It was drawn on `--color-semantic-error` (4.13 at rest, 3.08 on hover in dark). It now takes ADR-0071 D2's fixed grounds: 4.98 / 6.57 in every theme, recorded as ADR-0071 D2.1. No token value changed.
- Two editors saving at once are not guarded. The later save wins field by field, and a reorder computed against a list that has changed is refused by the API as a whole.

### Measured on the production build (2026-09-17)

- **INP**, CPU ×4, 5 runs (typing, the visibility switch, the focal-point arrows): worst per run 80, 80, 80, 80, 88ms, median 80ms. The 192ms of the development build was its own overhead.
- **`@uaeaf/content` in production:** both Next apps build it without `transpilePackages`; Turbopack compiles the linked workspace package as source.

## PENDING FIGMA BACK-SYNC

The screen has no Figma frame. To be drawn for review: the full screen in AR and EN at 1440 and 1280; the preview in 3 devices × 2 languages × 3 picture modes; the error, empty, loading and partial-save states.
