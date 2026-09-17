import { expect, test, type Page } from "@playwright/test";

/**
 * The homepage hero, held to its own definition (ADR-0080 D4, owner decision
 * 2026-09-17): its identity element is the art-directed picture and the progress
 * line, not the identity strokes, so neither `page-rules.spec.ts` nor
 * `identity-lines.spec.ts` covers it and both stay untouched.
 *
 * Per slide, in both languages, at a phone and a desktop width:
 * - every slide carries its picture, with alternative text in the page's language;
 * - no identity stroke stands over the picture;
 * - the current slide's progress line is drawn in `--color-brand-primary`.
 *
 * And the transition the owner chose, the lanes (ADR-0076 D8.3):
 * - the first slide, the Largest Contentful Paint, never animates its opacity;
 * - a step moves the next picture in on lanes without ever scrolling the stage
 *   (the stage stays a scroll container so it switches on without a layout
 *   shift, `hero-stage-shift.spec.ts`);
 * - with reduced motion a step swaps the slides at once, with no lanes.
 */

const VIEWPORTS = [
  { width: 1440, height: 900, isMobile: false },
  { width: 390, height: 844, isMobile: true },
] as const;

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

const openHero = async (page: Page, locale: "ar" | "en") => {
  await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#home-hero-track[data-enhanced]", { timeout: 120_000 });
};

/** The number buttons, in order: the second is "go to slide 2". */
const slideButtons = (page: Page) => page.locator("section.hero-first-screen ol button");

for (const locale of ["ar", "en"] as const) {
  for (const viewport of VIEWPORTS) {
    test.describe(`/${locale} ${viewport.width}x${viewport.height}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        deviceScaleFactor: viewport.isMobile ? 2 : 1,
      });

      test("carries a picture on every slide, described in the page's language, with no identity stroke over it", async ({ page }) => {
        await openHero(page, locale);
        const slides = await page.$$eval("li[data-hero-slide]", (items) =>
          items.map((item) => {
            const img = item.querySelector<HTMLImageElement>("img.hero-picture");
            return { hasPicture: Boolean(img), alt: img?.getAttribute("alt") ?? "" };
          }),
        );
        expect(slides.length).toBeGreaterThan(0);
        for (const [index, slide] of slides.entries()) {
          expect(slide.hasPicture, `slide ${index + 1} has its picture`).toBe(true);
          expect(slide.alt.trim().length, `slide ${index + 1} describes its picture`).toBeGreaterThan(0);
          expect(slide.alt, `slide ${index + 1} describes it in ${locale}`).toMatch(locale === "ar" ? ARABIC : LATIN);
        }
        const strokes = await page.locator("section.hero-first-screen [data-il-stroke], section.hero-first-screen [data-identity-lines]").count();
        expect(strokes).toBe(0);
      });

      test("draws the current slide's progress line in the federation's green", async ({ page }) => {
        await openHero(page, locale);
        const colours = await page.evaluate(() => {
          const probe = document.createElement("span");
          probe.style.backgroundColor = "var(--color-brand-primary)";
          document.body.append(probe);
          const brand = getComputedStyle(probe).backgroundColor;
          probe.remove();
          const current = document.querySelector('section.hero-first-screen ol button[aria-current="true"]');
          const fill = current?.querySelector(":scope > span:last-child > span");
          return { brand, fill: fill ? getComputedStyle(fill).backgroundColor : null };
        });
        expect(colours.fill).toBe(colours.brand);
      });

      test("moves to the next slide on lanes, never scrolling the stage or fading the first picture", async ({ page }) => {
        await openHero(page, locale);
        // Stop the automatic advance, so the only step is the one taken here.
        await page.locator("section.hero-first-screen button[aria-pressed]").first().click();
        const firstPictureOpacity = await page.evaluate(() => {
          const first = document.querySelector("li[data-hero-slide]");
          return document
            .getAnimations()
            .filter((animation) => {
              const target = (animation.effect as KeyframeEffect | null)?.target;
              return target instanceof Element && first?.contains(target) && !target.closest("[data-hero-word]");
            })
            .some((animation) => (animation.effect as KeyframeEffect).getKeyframes().some((frame) => "opacity" in frame));
        });
        expect(firstPictureOpacity).toBe(false);

        const watch = page.evaluate(
          () =>
            new Promise<{ maxScroll: number; sawLanes: boolean }>((resolve) => {
              const track = document.querySelector<HTMLElement>("#home-hero-track")!;
              let maxScroll = 0;
              let sawLanes = false;
              const start = performance.now();
              const tick = (now: number) => {
                maxScroll = Math.max(maxScroll, Math.abs(track.scrollLeft), Math.abs(track.scrollTop));
                sawLanes ||= Boolean(track.querySelector(".hero-lanes"));
                if (now - start < 2000) requestAnimationFrame(tick);
                else resolve({ maxScroll, sawLanes });
              };
              requestAnimationFrame(tick);
            }),
        );
        await slideButtons(page).nth(1).click();
        const { maxScroll, sawLanes } = await watch;
        expect(sawLanes).toBe(true);
        expect(maxScroll).toBe(0);
        await expect(page.locator("li[data-hero-slide]").nth(1)).toHaveAttribute("data-active", "true");
        await expect(page.locator(".hero-lanes")).toHaveCount(0);
      });
    });
  }
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const locale of ["ar", "en"] as const) {
    test(`/${locale} swaps the slides at once, with no lanes`, async ({ page }) => {
      await openHero(page, locale);
      await slideButtons(page).nth(1).click();
      await expect(page.locator("li[data-hero-slide]").nth(1)).toHaveAttribute("data-active", "true", { timeout: 1000 });
      await expect(page.locator(".hero-lanes")).toHaveCount(0);
    });
  }
});
