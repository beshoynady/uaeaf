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
 *
 * How much of it to run (owner decision 2026-09-14, ADR-0070 *Tests*). Each
 * stroke case takes about 19 seconds, so one route on every viewport is about
 * 6.5 minutes and the cost grows with every page that carries the lines.
 *
 * - While a page is being built: `ONLY_ROUTE=<route> ONLY_VIEWPORTS=work`,
 *   the three viewports that cover the hero's layouts — the smallest phone
 *   (360×640), below `lg` (768×1024) and the desktop frame (1440×900) — in
 *   both languages, about 2 minutes.
 * - At the end of the batch: the changed route on every viewport, and every
 *   route when `IdentityHero` itself changed.
 * - CI runs every route on every viewport on every push, with neither
 *   variable set, so a narrowed local run is never the only check.
 *
 * A filter that matches nothing throws rather than reporting "No tests
 * found": in Git Bash, `ONLY_ROUTE=/about/...` arrives rewritten as a Windows
 * path unless `MSYS_NO_PATHCONV=1` is set, and an empty run reads as a pass.
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

/** The working set named in the header: one viewport per layout the hero has. */
const WORK_VIEWPORTS = ["360x640", "768x1024", "1440x900"];

const viewportsToRun = () => {
  const wanted = process.env.ONLY_VIEWPORTS;
  if (!wanted) return [...VIEWPORTS];
  const names = wanted === "work" ? WORK_VIEWPORTS : wanted.split(",").map((name) => name.trim());
  const known = new Set(VIEWPORTS.map((viewport) => `${viewport.width}x${viewport.height}`));
  const unknown = names.filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(`ONLY_VIEWPORTS names ${unknown.join(", ")}; expected "work" or any of ${[...known].join(", ")}.`);
  }
  return VIEWPORTS.filter((viewport) => names.includes(`${viewport.width}x${viewport.height}`));
};

interface Clearance {
  distance: number;
  against: string;
  atMs: number;
  frames: number;
  strokes: number;
  /** Text runs and images measured against in the last frame. */
  contents: number;
  overflowFrames: number;
  /** Animations that never end, held at their start rather than scrubbed. */
  endless: number;
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

      // Only animations that END are paused and scrubbed. Two kinds never do,
      // and `typeof endTime === "number"` admitted one of them: a
      // scroll-driven animation (the photograph's parallax) reports a CSS
      // percentage, which made `end` NaN and skipped every frame; a loop that
      // never stops (the sponsor strip, ADR-0085 D8 #2) reports Infinity,
      // which would scrub forever rather than fail. `Number.isFinite`
      // excludes both.
      //
      // Neither is touched, which is how the percentage case has always been
      // treated and is not incidental: pausing the parallax moves the
      // portrait, and this measurement is taken against the portrait.
      const endsAt = (animation: Animation) => Number(animation.effect?.getComputedTiming().endTime);
      const all = document.getAnimations();
      const animations = all.filter((animation) => Number.isFinite(endsAt(animation)));
      const endless = all.length - animations.length;
      animations.forEach((animation) => animation.pause());
      const end = Math.max(0, ...animations.map(endsAt));

      let best = { distance: Infinity, against: "", atMs: 0 };
      let frames = 0;
      let contents = 0;
      let overflowFrames = 0;
      for (let t = 0; t <= end + step; t += step) {
        animations.forEach((animation) => {
          animation.currentTime = Math.min(t, end);
        });
        frames += 1;
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) overflowFrames += 1;
        const rects = contentRects();
        contents = rects.length;
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
      return {
        ...best,
        distance: Math.round(best.distance * 10) / 10,
        frames,
        strokes: paths.length,
        contents,
        overflowFrames,
        endless,
      };
    },
    { step: FRAME_STEP_MS, points: OUTLINE_POINTS },
  );

/** Every page whose hero is the portrait composition: the President's Message
 *  (ADR-0069 D10), Vision & Mission (ADR-0070) and the Strategic Plan
 *  (ADR-0075). */
const PORTRAIT_HERO_ROUTES = ["/about/president", "/about/governance/vision-mission", "/about/governance/strategic-plan"];

/**
 * The width from which the homepage draws its identity lines — Chapter 5
 * §5.1's `lg`. ADR-0085 D8 #1: below it the sponsors' and memberships'
 * headings span the line and the strokes measured 0–28px from them, under
 * IL-5's 32px, so the sets are not drawn there at all.
 */
const HOMEPAGE_LINES_FROM = 1024;

/** Every page that carries identity strokes anywhere. The homepage has no
 *  portrait hero, but ADR-0085 D8 #1 left its seams and its sponsor banner
 *  measured and unguarded — this spec is where that gap is closed.
 *  `ONLY_ROUTE` narrows a run to one page. */
const ALL_ROUTES = ["/", ...PORTRAIT_HERO_ROUTES];

const ROUTES = ALL_ROUTES.filter((route) => !process.env.ONLY_ROUTE || route === process.env.ONLY_ROUTE);

/**
 * IL-5 as amended (ADR-0072 D2) outside the hero: every stroke drawn on a
 * photograph beside a statement or a call, and on a seam between two sections
 * (ADR-0073 D2), against every text run of the page's content. A photograph is
 * no longer measured against, so a stroke may cross it; a word is. Below the
 * first screen a block waits to be revealed, and its strokes grow from their
 * tails as it plays, so every frame of the running animations is measured.
 */
const measurePhotoLines = (page: Page) =>
  page.evaluate(
    ({ step, points }): Clearance => {
      const content = document.querySelector("main") ?? document.body;
      const paths = [
        ...content.querySelectorAll<SVGPathElement>("[data-photo-lines] [data-il-stroke] path, [data-seam-lines] [data-il-stroke] path"),
      ].filter(
        (path) => (path.closest("[data-il-stroke]") as HTMLElement).getClientRects().length > 0,
      );

      const contentRects = () => {
        const rects: { rect: DOMRect; label: string }[] = [];
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const parent = node.parentElement;
          if (!node.textContent?.trim() || !parent || parent.closest("[data-identity-lines], script, style")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            rects.push({ rect, label: `${parent.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 16)}"` });
          }
        }
        return rects;
      };

      // Only animations that END are paused and scrubbed. Two kinds never do,
      // and `typeof endTime === "number"` admitted one of them: a
      // scroll-driven animation (the photograph's parallax) reports a CSS
      // percentage, which made `end` NaN and skipped every frame; a loop that
      // never stops (the sponsor strip, ADR-0085 D8 #2) reports Infinity,
      // which would scrub forever rather than fail. `Number.isFinite`
      // excludes both.
      //
      // Neither is touched, which is how the percentage case has always been
      // treated and is not incidental: pausing the parallax moves the
      // portrait, and this measurement is taken against the portrait.
      const endsAt = (animation: Animation) => Number(animation.effect?.getComputedTiming().endTime);
      const all = document.getAnimations();
      const animations = all.filter((animation) => Number.isFinite(endsAt(animation)));
      const endless = all.length - animations.length;
      animations.forEach((animation) => animation.pause());
      const end = Math.max(0, ...animations.map(endsAt));

      let best = { distance: Infinity, against: "", atMs: 0 };
      let frames = 0;
      let contents = 0;
      let overflowFrames = 0;
      for (let t = 0; t <= end + step; t += step) {
        animations.forEach((animation) => {
          animation.currentTime = Math.min(t, end);
        });
        frames += 1;
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) overflowFrames += 1;
        const rects = contentRects();
        contents = rects.length;
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
      return { ...best, distance: Math.round(best.distance * 10) / 10, frames, strokes: paths.length, contents, overflowFrames, endless };
    },
    { step: FRAME_STEP_MS, points: OUTLINE_POINTS },
  );

if (ROUTES.length === 0) {
  throw new Error(`ONLY_ROUTE is "${process.env.ONLY_ROUTE}"; expected one of ${ALL_ROUTES.join(", ")}.`);
}

for (const route of ROUTES) {
  for (const locale of ["ar", "en"] as const) {
    for (const viewport of viewportsToRun()) {
      test.describe(`${route} ${locale} ${viewport.width}x${viewport.height}`, () => {
        test.use({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
          hasTouch: viewport.isMobile,
          deviceScaleFactor: viewport.isMobile ? 2 : 1,
          reducedMotion: "no-preference",
        });

        // The portrait composition only. The homepage's hero is a different
        // one and carries no `data-composition`, so there only the sections'
        // strokes below it are measured.
        if (PORTRAIT_HERO_ROUTES.includes(route))
        test("keeps every identity stroke 32px from the hero's content, at rest and through the entrance", async ({
          page,
        }) => {
          await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
          await page.evaluate(() => document.fonts.ready);
          const clearance = await measureClearance(page);
          test.info().annotations.push({ type: "clearance", description: JSON.stringify(clearance) });

          expect(clearance.strokes, "the hero draws its four identity strokes").toBe(4);
          // A distance is only evidence if something was measured: a run that
          // scrubbed no frame, or found no text, reports Infinity and would pass.
          expect(clearance.frames, "the entrance was scrubbed frame by frame").toBeGreaterThan(0);
          expect(clearance.contents, "the hero's text was found to measure against").toBeGreaterThan(0);
          expect(Number.isFinite(clearance.distance), "a distance was measured").toBe(true);
          expect(clearance.overflowFrames, "no frame scrolls the page sideways").toBe(0);
          expect(
            clearance.distance,
            `closest stroke reaches ${clearance.distance}px from the ${clearance.against} at ${clearance.atMs}ms`,
          ).toBeGreaterThanOrEqual(SAFE_DISTANCE);
        });

        test("keeps the strokes on the photographs and the seams 32px from every text run, as loaded and through their reveal", async ({
          page,
        }) => {
          // Longer than the suite's 180s (owner decision 2026-09-17, ADR-0079):
          // the scroll cue's 1.92s nudge sets how far the measurement as loaded
          // is scrubbed. On the Strategic Plan at 1440x900 this test measured up
          // to 274.2s alone (168.6s with the cue still); 274.2s + 30%.
          test.setTimeout(357_000);
          await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
          await page.evaluate(() => document.fonts.ready);
          // Counted where they are displayed, and by the mark the component
          // itself carries: `SlantedPhoto` wraps one set in
          // `data-slanted-photo`, and the homepage's sponsor banner draws one
          // with no wrapper at all and hides it below `lg`.
          const photos = await page
            .locator("main [data-photo-lines]")
            .evaluateAll((sets) => sets.filter((set) => (set as HTMLElement).getClientRects().length > 0).length);
          // Each seam draws one group of two: A in Arabic, B in English. A set
          // drawn only from a width (`SeamLines from="lg"`, ADR-0075) is not
          // displayed below it and draws nothing there, so only displayed sets
          // are counted.
          const seams = await page
            .locator("main [data-seam-lines]")
            .evaluateAll((sets) => sets.filter((set) => (set as HTMLElement).getClientRects().length > 0).length);
          test.info().annotations.push({ type: "photographs and seams", description: `${photos} and ${seams}` });

          // ADR-0085 D8 #1, asserted in both directions so that neither the
          // departure nor its undoing is silent: on the homepage the sets
          // appear only from `lg`, and they do appear there.
          if (route === "/") {
            const drawn = photos + seams;
            if (viewport.width < HOMEPAGE_LINES_FROM) {
              expect(drawn, `no identity lines below ${HOMEPAGE_LINES_FROM}px`).toBe(0);
            } else {
              expect(drawn, `identity lines drawn from ${HOMEPAGE_LINES_FROM}px`).toBeGreaterThan(0);
            }
          }

          // As loaded: a block below the first screen waits to be revealed.
          const waiting = await measurePhotoLines(page);
          expect(waiting.strokes, "two strokes on each photograph and on each seam").toBe((photos + seams) * 2);
          // A page with neither draws no strokes outside the hero.
          if (photos + seams === 0) return;

          // Every displayed block, so that none below the view is left waiting.
          // A block not displayed at this width (a seam set drawn from `md` or
          // `lg`) cannot be scrolled to or enter the view, and draws nothing to
          // measure, as with the count above.
          const blocks = page.locator("main [data-reveal]");
          for (let block = 0; block < (await blocks.count()); block += 1) {
            const target = blocks.nth(block);
            if (await target.evaluate((element) => element.getClientRects().length === 0)) continue;
            await target.scrollIntoViewIfNeeded();
          }
          await page.waitForFunction(
            () =>
              ![...document.querySelectorAll("main [data-reveal]")].some(
                (block) =>
                  block.getClientRects().length > 0 && (block as HTMLElement).dataset.revealState === "waiting",
              ),
          );
          // Revealed: every frame of the strokes growing and the pictures sliding, then at rest.
          const revealed = await measurePhotoLines(page);

          for (const [moment, clearance] of [
            ["as loaded", waiting],
            ["through its reveal", revealed],
          ] as const) {
            test.info().annotations.push({ type: `photographs ${moment}`, description: JSON.stringify(clearance) });
            expect(clearance.frames, `${moment}: frames measured`).toBeGreaterThan(0);
            expect(clearance.contents, `${moment}: text found`).toBeGreaterThan(0);
            expect(Number.isFinite(clearance.distance), `${moment}: a distance`).toBe(true);
            expect(clearance.overflowFrames, `${moment}: no sideways scroll`).toBe(0);
            expect(
              clearance.distance,
              `${moment}: closest stroke reaches ${clearance.distance}px from the ${clearance.against} at ${clearance.atMs}ms`,
            ).toBeGreaterThanOrEqual(SAFE_DISTANCE);
          }
        });
      });
    }
  }
}

/**
 * The two guards below read a page's *animations*, not its clearance, and were
 * written for the portrait hero. The homepage is left out of them on purpose:
 * its one continuous animation is the sponsor strip's loop, which ADR-0085
 * D8 #2 is still deciding the shape of. It gets its own guards with that
 * decision — guarding it here first would fix the loop's current shape in a
 * spec about identity lines.
 */
const MOTION_ROUTES = ROUTES.filter((route) => PORTRAIT_HERO_ROUTES.includes(route));

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const route of MOTION_ROUTES) {
    for (const locale of ["ar", "en"] as const) {
      test(`${route} ${locale}: the hero and its lines are drawn at rest, with nothing animating`, async ({ page }) => {
        await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
        const running = await page.evaluate(() => document.getAnimations().length);
        expect(running).toBe(0);
      });
    }
  }
});

test.describe("the largest paint", () => {
  for (const route of MOTION_ROUTES) for (const locale of ["ar", "en"] as const) {
    // The page's own content, inside `<main>`. The site header is shared and
    // protected, and its drawer items fade in; they are not this page's paint.
    test(`${route} ${locale}: no animation in the page's content changes opacity, so the title and the portrait paint in their first frame`, async ({
      page,
    }) => {
      await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
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
