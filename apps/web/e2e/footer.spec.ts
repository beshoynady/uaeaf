import { expect, test, type Page } from "@playwright/test";

/**
 * The footer as a browser lays it out (ADR-0092). jsdom has no layout, so
 * `site-footer.test.tsx` can only check the classes; these check what they do.
 *
 * - From `lg` (1024) the footer is at least the screen minus the header, and
 *   below it no floor applies at all — read from the computed `min-height`,
 *   not inferred from a height that might equal the screen by chance.
 * - The grid really is 1 / 2 / 4 / 4 columns at 390 / 768 / 1024 / 1440.
 * - From `lg` the four columns start on one line, and the map takes the slack.
 * - Nothing overflows the page or its own box, in either language or theme.
 * - The map costs no request until its frame is on the screen.
 *
 * Screenshots go to `FOOTER_SHOTS` when it is set (a scratchpad path, never
 * the repository), for the eye to confirm what the numbers cannot.
 */

const WIDTHS = [
  { width: 390, height: 844, columns: 1, firstScreen: false },
  { width: 768, height: 1024, columns: 2, firstScreen: false },
  { width: 1024, height: 768, columns: 4, firstScreen: true },
  { width: 1440, height: 900, columns: 4, firstScreen: true },
] as const;

const SHOTS = process.env.FOOTER_SHOTS;
const PAGE = process.env.FOOTER_PAGE ?? "/records";

const measure = (page: Page) =>
  page.evaluate(() => {
    const footer = document.querySelector("footer")!;
    const grid = footer.querySelector('[data-testid="footer-columns"]')!;
    const header = document.querySelector(".site-header")!;
    const rect = (element: Element) => element.getBoundingClientRect();
    const footerRect = rect(footer);
    // Where each column starts: its first element. The brand column opens with
    // the logo above the federation's name, the other three with a heading.
    const starts = [...footer.querySelectorAll("[data-footer-column]")].map((column) => Math.round(rect(column.firstElementChild!).top));
    const frame = footer.querySelector('[data-testid="footer-map-frame"]');
    const locationColumn = frame?.closest("[data-footer-column]");
    // Text that is wider than its own box has been cut or has run into a
    // neighbour; either is a defect whatever the page's scroll width says.
    const overflowing = [...footer.querySelectorAll("a, p, h2, span, li")]
      .filter((element) => element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflow !== "visible")
      .map((element) => element.textContent?.trim().slice(0, 40));
    const outside = [...footer.querySelectorAll("[data-footer-column], [data-footer-column] *")]
      .filter((element) => !element.closest('[data-decorative="true"]'))
      .filter((element) => {
        const box = rect(element);
        return box.width > 0 && (box.left < footerRect.left - 1 || box.right > footerRect.right + 1);
      })
      .map((element) => element.tagName);
    return {
      innerHeight: window.innerHeight,
      headerHeight: Math.round(rect(header).height),
      footerHeight: Math.round(footerRect.height),
      minHeight: getComputedStyle(footer).minHeight,
      tracks: getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
      starts,
      frame: frame ? { height: Math.round(rect(frame).height), width: Math.round(rect(frame).width) } : null,
      frameBottomGap: frame && locationColumn ? Math.round(rect(locationColumn).bottom - rect(frame).bottom) : null,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflowing,
      outside,
      themeApplied: document.documentElement.getAttribute("data-theme"),
    };
  });

for (const locale of ["ar", "en"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const { width, height, columns, firstScreen } of WIDTHS) {
      test(`footer at ${width} — ${locale}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.addInitScript((stored) => window.localStorage.setItem("uaeaf-theme", stored), theme);
        await page.goto(`/${locale}${PAGE}`, { waitUntil: "domcontentloaded" });
        await page.locator("footer").scrollIntoViewIfNeeded();

        const measured = await measure(page);
        console.log(JSON.stringify({ width, locale, theme, ...measured }));

        expect(measured.themeApplied).toBe(theme);
        expect(measured.headerHeight, "the header is the --header-height the rule subtracts").toBe(96);
        if (firstScreen) {
          expect(measured.minHeight, "the first-screen floor applies from lg").toBe(`${measured.innerHeight - 96}px`);
          expect(measured.footerHeight).toBeGreaterThanOrEqual(measured.innerHeight - 96);
          expect(new Set(measured.starts).size, "the four columns start on one line").toBe(1);
          expect(measured.frameBottomGap, "the map reaches the end of its column").toBeLessThanOrEqual(120);
        } else {
          // `auto` is what a flex item with no minimum computes to (the body is
          // a flex column); `0px` is the same for a block.
          expect(["auto", "0px"], "no floor below lg: the footer is as tall as its content").toContain(measured.minHeight);
        }
        expect(measured.tracks, "the grid's real column count").toBe(columns);
        expect(measured.frame?.height ?? 0, "the map's own minimum").toBeGreaterThanOrEqual(220);
        expect(measured.pageOverflow, "no horizontal scroll").toBeLessThanOrEqual(0);
        expect(measured.overflowing, "no text wider than its box").toEqual([]);
        expect(measured.outside, "nothing outside the footer's box").toEqual([]);

        if (SHOTS) {
          // Time for Google's frame to draw its tiles, which no event reports
          // across the origin boundary.
          await page.waitForTimeout(4000);
          await page.locator("footer").screenshot({ path: `${SHOTS}/footer-${width}-${locale}-${theme}.png` });
        }
      });
    }
  }
}

test("the map costs no request until its frame is on the screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const fired: { scrollY: number; frameTop: number }[] = [];
  page.on("request", async (request) => {
    if (!/google\.com\/maps/.test(request.url())) return;
    fired.push(
      await page
        .evaluate(() => ({
          scrollY: Math.round(window.scrollY),
          frameTop: Math.round(document.querySelector('[data-testid="footer-map-frame"]')!.getBoundingClientRect().top),
        }))
        .catch(() => ({ scrollY: -1, frameTop: -1 })),
    );
  });

  // The homepage: the longest page, where the footer is furthest away.
  await page.goto("/ar", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const footerTop = await page.evaluate(() => Math.round(document.querySelector("footer")!.getBoundingClientRect().top + window.scrollY));
  console.log(JSON.stringify({ atLoad: fired.length, footerTop }));
  expect(fired, "no map request while the footer is below the screen").toEqual([]);

  // Walk down as a reader does. Before the frame reaches the screen, nothing.
  for (let y = 0; y < footerTop + 900 && fired.length === 0; y += 200) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(300);
  }
  console.log(JSON.stringify({ first: fired[0] ?? null, innerHeight: 900 }));
  expect(fired.length, "the map loads once the reader reaches it").toBeGreaterThan(0);
  expect(fired[0].frameTop, "the frame was on the screen when the map was asked for").toBeLessThan(900);
});
