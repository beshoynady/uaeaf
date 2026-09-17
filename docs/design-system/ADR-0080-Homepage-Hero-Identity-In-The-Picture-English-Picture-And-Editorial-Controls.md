# ADR-0080 — The Homepage Hero: Identity in the Picture, the English Picture, and Editorial Controls

**Status:** mixed, per decision:

| Decision | Status |
| --- | --- |
| D1 `ltrImageMode` | **Accepted and built** (owner decision 2026-09-16) |
| D2 Identity lives in the picture; the logo-lines code layer | **Accepted** (owner review 2026-09-16); the layer was built and is **Superseded** |
| D3 Editorial controls | **Built** (owner review 2026-09-16); they drive the lanes the owner chose (ADR-0076 D8.3, 2026-09-17) |
| D4 The hero's identity element, for the guards | **Accepted and built** (owner decision 2026-09-17: a separate `e2e/home-hero.spec.ts`; built after the lanes were chosen, ADR-0076 D8.3) |
| D5 Deviations from Figma | recorded; **PENDING FIGMA BACK-SYNC** |

**Date:** 2026-09-16
**Authority:** the owner's prompts of 2026-09-16: «تعديل أثناء العمل: قسم الهيرو» and «تصحيح اتجاه الهيرو: الهوية داخل الصورة + انتقال جديد + التحكم + شريط الحدث القادم».
**Relies on:** ADR-0059 D7 and D7.1 (the ascent angle, never mirrored) · ADR-0078 (first screen) · ADR-0079 (scroll cue) · `UAEAF-GLOBAL-VISUAL-DESIGN-PROTOCOL.md` §9 (image mirroring, logo protection).
**Does not amend:** `HERO_SCRIM` · the identity-lines guard and its 32px threshold · the four built pages.

---

## D1 — `ltrImageMode`: what an English reader sees

The picture is composed for Arabic, with a quiet third on the right where an Arabic line starts. English starts on the left. Per slide:

| Mode | English landscape picture | Focal point |
| --- | --- | --- |
| `mirror` (default) | the same picture, flipped (`.hero-mirror`, `scale: -1 1`, in the server's markup) | x → 100 − x, computed by the API |
| `same` | the same picture | unchanged |
| `separate` | `ltrImageAssetId` | `ltrFocalPoint` |

- **`separate` requires both fields.** Missing either, create and update refuse with `incompleteLtrImage` and name the field. The check runs on the merged slide.
- **The portrait phone picture is never mirrored.** Its quiet part is at the bottom, and reading direction does not move that.
- **Only the picture flips.** Text, buttons, controls and every identity mark sit outside `.hero-mirror`.
- **Never mirror a flag, writing or a known landmark:** a flip falsifies it. That is why `separate` exists, and why the dashboard warning reads «لا تقلب صورة فيها علم أو كتابة أو شعار أو معلم معروف».
- **Public shape:** `desktopLtr {image, focalPoint, mirrored}`. The web crops a mirrored picture on the stored point and moves Ken Burns toward the flipped one (`landscapeFor`).
- **Tests:** API 12 (`hero-slides.ltr-image.spec.ts`), web 4 (`hero-stage.spec.ts`).

## D2 — The identity lives in the photograph

- **The owner's review:** the small identity lines over the picture were not the intent. The identity belongs inside the image: flag-colour powder (red, green, white, black) behind the athlete, national-team kit in flag colours, an Emirati stadium at golden hour. The art direction is `docs/content/hero-image-prompts.md`.
- **The code layer** (`hero-lines.tsx`) was built with a corner wash that brought the red stroke to 3:1 (3.02–3.55 measured). It is removed together with its CSS.
- **Over the picture now:** the reading wash, the words, the controls, the scroll cue and the next-event bar. The single identity mark drawn in code is the progress line's federation green.

**Critical defect:** the library has no picture made to this direction. The forest track was removed from the seed on review. Slide 1 now uses `vision-mission-cta.png`, 1536×672, below the hero's resolution. It stays until the art-directed set exists.

## D3 — Editorial controls

These replace the black capsule the owner rejected («كبسولة سوداء كبيرة وسط الصورة: غير مقبولة»).

**Layout:**
- no ground, no pill, no circles;
- at the foot of the hero, aligned with the start of the text column, above the next-event bar;
- a small stop icon, then one button per slide: its number (01, 02…) above a thin line;
- the current line fills over the dwell in `--color-brand-primary`, the others stay dimmed (white 45%);
- stop freezes the fill where it stands.

**Behaviour:**
- each number is a real button with `aria-label`, `aria-current` and `aria-controls`;
- there are no arrows: navigation is the numbers, the arrow keys on the track, or a swipe on touch.

**On phones:** only the current number shows, and every target is at least 44px.

**Legibility comes from the hero's own wash, not the shared `HERO_SCRIM`.** Below `md` the wash deepens to 86% at the foot; from `md` it reaches 80% at the foot.

**Measured** (3 themes × 390/768/1440 × AR/EN × 3 slides; 0 failures in 540):

| Target | Floor | Measured p05 |
| --- | --- | --- |
| Current number | 4.5:1 | 12.97–19.36 |
| Other numbers | 4.5:1 | 7.83–9.41 |
| Stop icon | 4.5:1 | 15.52–16.17 |
| Lines | 3:1 | 4.42–4.49 |

## D4 — The hero's identity element, for the guards — **Accepted and built 2026-09-17**

The owner asked that the rule be amended by ADR for the hero only, not disabled, with a test: «عنصر هوية الهيرو = الصورة الموجَّهة + مؤشر التقدم».

**What the guards say today:**
- `page-rules.spec.ts` rule 1 accepts "identity strokes, a photograph or a coloured register" per section, and does not cover the homepage.
- `identity-lines.spec.ts` covers the President, Vision & Mission and the Strategic Plan (IdentityHero). It asserts strokes 32px from text, and no opacity animation inside `<main>`.

**Decided (2026-09-17): a separate `e2e/home-hero.spec.ts`**, not an entry in `page-rules.spec.ts`: the two protected guards stay untouched, and the homepage is held to its own definition. It measures, per slide and in both languages: a picture with an alternative text in the page's language; no identity stroke over the picture; the current progress line in `--color-brand-primary`; and that the first slide (the Largest Contentful Paint) never animates opacity. Whether a picture is art-directed is a reading, not a measurement (rule 2).

**Built:** `e2e/home-hero.spec.ts`, 14 cases at 1440×900 and 390×844 in both languages. With the lanes chosen (ADR-0076 D8.3) it also asserts that a step moves the next picture in on lanes without ever scrolling the stage, and that reduced motion swaps the slides at once.

The diff first proposed, kept for the record (superseded by the separate file):

```diff
 // e2e/page-rules.spec.ts
+/** The homepage hero (ADR-0080 D4): its identity element is the art-directed
+ *  photograph plus the progress indicator in the federation's green. It carries
+ *  no identity strokes by design, and must not grow any over the picture. */
+test.describe("/ the homepage hero's identity", () => {
+  for (const locale of ["ar", "en"] as const) {
+    test(`${locale}: a photograph and a green progress line, and no strokes over the picture`, async ({ page }) => {
+      await page.goto(`/${locale}`);
+      const hero = page.locator("main section").first();
+      await expect(hero.locator("[data-hero-slide] img").first()).toBeVisible();
+      await expect(hero.locator("[data-il-stroke], [data-hero-line]")).toHaveCount(0);
+      const fill = hero.locator("ol button[aria-current=true] span.relative > span");
+      await expect(fill).toHaveCSS("background-color", "rgb(0, 132, 61)");
+    });
+  }
+});
```

This changes no other page's rule. The IdentityHero pages keep their strokes and the 32px guard.

The lanes animate `transform` only, so `identity-lines.spec.ts` needs no second amendment: its no-opacity assertion stays on its own routes, and `home-hero.spec.ts` holds the homepage's first slide to the same rule.

## D5 — Deviations from Figma — PENDING FIGMA BACK-SYNC

| Figma (`2374:1201`, mobile `2374:2336`) | Built | Why |
| --- | --- | --- |
| Hero 769px + strip in the first screen at 1440 | header 96 + hero 804 = the screen; the strip below | ADR-0078 |
| Mobile hero 353px | first screen less the header (748px at 390×844) | ADR-0078 |
| Arrows and dots | numbers and lines at the start of the text column, no arrows, stop icon | D3 |
| Next-event card as a separate block | a translucent bar laid over the foot of the picture with a green top line | owner review; ADR-0081 |
| Five placeholder slides, legacy composite | art direction in `hero-image-prompts.md`; the English picture per `ltrImageMode` | D1, D2 |
| No transition | the lanes: the next picture arrives on still bands, by `transform` | ADR-0076 D8.3 |
| No scroll cue | the cue in the controls row | ADR-0079 |
