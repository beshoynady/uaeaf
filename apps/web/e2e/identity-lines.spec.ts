import { expect, test, type Page } from "@playwright/test";

/**
 * ADR-0069 D10, IL-5: 32px between any painted point of an identity stroke and
 * any text or image in the hero, at rest and in every frame of the entrance,
 * in Arabic and English, with no horizontal overflow.
 *
 * Measured, not calculated: a calculation checks the rule, not the page, and
 * would not catch a line moved by an unrelated change. Every animation is
 * paused and scrubbed in 10ms steps; each stroke's outline is sampled at 256
 * points through its screen transform, and each point's distance is taken to
 * every text run's client rectangles and to the portrait's box.
 *
 * Phones and tablets are emulated as mobile devices: a desktop scrollbar turns
 * a 390px viewport into a 375px layout.
 */

const SAFE_DISTANCE = 32;
const FRAME_STEP_MS = 10;
const OUTLINE_POINTS = 256;

const VIEWPORTS = [
  { width: 360, height: 640, isMobile: true },
  { width: 375, height: 667, isMobile: true },
  { width: 390, height: 844, isMobile: true },
  { width: 640, height: 960, isMobile: true },
  { width: 768, height: 1024, isMobile: true },
  { width: 844, height: 390, isMobile: true },
  { width: 1024, height: 768, isMobile: false },
  { width: 1280, height: 800, isMobile: false },
  { width: 1366, height: 657, isMobile: false },
  { width: 1440, height: 900, isMobile: false },
] as const;

interface Clearance {
  distance: number;
  against: string;
  atMs: number;
  frames: number;
  strokes: number;
  overflowFrames: number;
}

const measureClearance = (page: Page) =>
  page.evaluate(
    ({ step, points }): Clearance => {
      const hero = document.querySelector<HTMLElement>("section[data-composition]");
      if (!hero) throw new Error("no portrait hero on the page");

      const paths = [...hero.querySelectorAll<SVGPathElement>("[data-il-stroke] path")].filter(
        (path) => (path.closest("[data-il-stroke]") as HTMLElement).getClientRects().length > 0,
      );
      const portrait = hero.querySelector<HTMLImageElement>("img.pm-portrait");

      const contentRects = () => {
        const rects: { rect: DOMRect; label: string }[] = [];
        const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const parent = node.parentElement;
          if (!node.textContent?.trim() || !parent || parent.closest("[data-identity-lines], [data-il-stroke]")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            rects.push({ rect, label: `${parent.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 16)}"` });
          }
        }
        if (portrait) rects.push({ rect: portrait.getBoundingClientRect(), label: "portrait" });
        return rects;
      };

      const animations = document.getAnimations();
      animations.forEach((animation) => animation.pause());
      const end = Math.max(
        0,
        ...animations.map((animation) => Number(animation.effect?.getComputedTiming().endTime ?? 0)),
      );

      let best = { distance: Infinity, against: "", atMs: 0 };
      let frames = 0;
      let overflowFrames = 0;
      for (let t = 0; t <= end + step; t += step) {
        animations.forEach((animation) => {
          animation.currentTime = Math.min(t, end);
        });
        frames += 1;
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) overflowFrames += 1;
        const rects = contentRects();
        for (const path of paths) {
          const matrix = path.getScreenCTM();
          if (!matrix) continue;
          const length = path.getTotalLength();
          for (let i = 0; i <= points; i += 1) {
            const p = path.getPointAtLength((length * i) / points);
            const x = matrix.a * p.x + matrix.c * p.y + matrix.e;
            const y = matrix.b * p.x + matrix.d * p.y + matrix.f;
            for (const { rect, label } of rects) {
              const dx = Math.max(rect.left - x, 0, x - rect.right);
              const dy = Math.max(rect.top - y, 0, y - rect.bottom);
              const distance = Math.hypot(dx, dy);
              if (distance < best.distance) best = { distance, against: label, atMs: Math.min(t, end) };
            }
          }
        }
      }
      animations.forEach((animation) => animation.finish());
      return { ...best, distance: Math.round(best.distance * 10) / 10, frames, strokes: paths.length, overflowFrames };
    },
    { step: FRAME_STEP_MS, points: OUTLINE_POINTS },
  );

for (const locale of ["ar", "en"] as const) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${locale} ${viewport.width}x${viewport.height}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        deviceScaleFactor: viewport.isMobile ? 2 : 1,
        reducedMotion: "no-preference",
      });

      test("keeps every identity stroke 32px from the hero's content, at rest and through the entrance", async ({
        page,
      }) => {
        await page.goto(`/${locale}/about/president`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        const clearance = await measureClearance(page);
        test.info().annotations.push({ type: "clearance", description: JSON.stringify(clearance) });

        expect(clearance.strokes, "the hero draws its four identity strokes").toBe(4);
        expect(clearance.overflowFrames, "no frame scrolls the page sideways").toBe(0);
        expect(
          clearance.distance,
          `closest stroke reaches ${clearance.distance}px from the ${clearance.against} at ${clearance.atMs}ms`,
        ).toBeGreaterThanOrEqual(SAFE_DISTANCE);
      });
    });
  }
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const locale of ["ar", "en"] as const) {
    test(`${locale}: the hero and its lines are drawn at rest, with nothing animating`, async ({ page }) => {
      await page.goto(`/${locale}/about/president`, { waitUntil: "domcontentloaded" });
      const running = await page.evaluate(() => document.getAnimations().length);
      expect(running).toBe(0);
    });
  }
});

test.describe("the largest paint", () => {
  for (const locale of ["ar", "en"] as const) {
    // The page's own content, inside `<main>`. The site header is shared and
    // protected, and its drawer items fade in; they are not this page's paint.
    test(`${locale}: no animation in the page's content changes opacity, so the title and the portrait paint in their first frame`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/about/president`, { waitUntil: "domcontentloaded" });
      const opacityAnimations = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => {
            const effect = animation.effect as KeyframeEffect | null;
            return Boolean(effect?.target?.closest("main")) && effect!.getKeyframes().some((frame) => "opacity" in frame);
          })
          .map((animation) => (animation as CSSAnimation).animationName ?? "unnamed"),
      );
      expect(opacityAnimations).toEqual([]);
    });
  }
});
