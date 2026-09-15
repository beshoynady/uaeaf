import { expect, test } from "@playwright/test";

/**
 * ADR-0069 D10, *Limits that hold for the whole page*: transform only and no
 * layout shift, with the entrance playing and with it off. The largest paint
 * is recorded beside it, because D8 forbids an entrance that delays it.
 *
 * - **A real mobile context** rather than a desktop browser with a resized
 *   viewport: a desktop scrollbar changes the layout width while the page loads
 *   and is reported as a shift of the whole column, which the page does not have.
 * - **The portrait arrives late on purpose.** Every image request is held back
 *   1.5 seconds, so the page paints before the picture lands whatever the
 *   network and the cache happen to do. A shift that only a slow connection
 *   would show is still a shift.
 * - **The CPU is throttled 4x**, the lab setting the rest of the project uses.
 *
 * What is asserted is this page's own content. The shared header and the shared
 * breadcrumb can move a pixel when the web font replaces its fallback; those
 * shifts are recorded beside the result, and the total stays under Chapter 5
 * §5.9's 0.1.
 */

const CASES = [
  { width: 390, height: 844, isMobile: true },
  { width: 1440, height: 900, isMobile: false },
] as const;

const IMAGE_DELAY_MS = 1500;

/** The page under test: the President's Message unless `VITALS_ROUTE` names another. */
const ROUTE = process.env.VITALS_ROUTE ?? "/about/president";

interface Vitals {
  cls: number;
  pageShifts: string[];
  sharedShifts: string[];
  lcpMs: number | null;
  lcpElement: string | null;
}

for (const motion of ["no-preference", "reduce"] as const) {
  for (const locale of ["ar", "en"] as const) {
    for (const viewport of CASES) {
      test.describe(`${locale} ${viewport.width}x${viewport.height} motion=${motion}`, () => {
        test.use({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
          hasTouch: viewport.isMobile,
          deviceScaleFactor: viewport.isMobile ? 2 : 1,
          reducedMotion: motion,
        });

        test("shifts none of its own content while the page loads, the portrait arrives and the entrance plays", async ({
          page,
        }) => {
          const cdp = await page.context().newCDPSession(page);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          await page.route(
            (url) => /\.(png|jpe?g|webp|avif)(\?|$)|res\.cloudinary\.com|\/_next\/image/.test(url.href),
            async (route) => {
              await new Promise((resolve) => setTimeout(resolve, IMAGE_DELAY_MS));
              await route.continue();
            },
          );
          await page.goto(`/${locale}${ROUTE}`, { waitUntil: "domcontentloaded" });

          const vitals = await page.evaluate(
            (settleMs) =>
              new Promise<Vitals>((resolve) => {
                let cls = 0;
                const pageShifts: string[] = [];
                const sharedShifts: string[] = [];
                let lcp: (PerformanceEntry & { element?: Element | null }) | null = null;
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) lcp = entry as typeof lcp;
                }).observe({ type: "largest-contentful-paint", buffered: true });
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries() as (PerformanceEntry & {
                    value: number;
                    hadRecentInput: boolean;
                    sources?: { node?: Node | null }[];
                  })[]) {
                    if (entry.hadRecentInput) continue;
                    cls += entry.value;
                    const nodes = (entry.sources ?? []).map((source) => source.node as Element | null);
                    const shared = nodes.every(
                      (node) => node?.closest?.("header, main nav[aria-label]") || !node?.closest?.("main"),
                    );
                    const line = `${entry.value.toFixed(4)} at ${Math.round(entry.startTime)}ms: ${nodes
                      .map((node) => node?.className?.toString().slice(0, 40) ?? "?")
                      .join(" | ")}`;
                    (shared ? sharedShifts : pageShifts).push(line);
                  }
                }).observe({ type: "layout-shift", buffered: true });
                setTimeout(() => {
                  const last = lcp as (PerformanceEntry & { element?: Element | null }) | null;
                  resolve({
                    cls: Math.round(cls * 10000) / 10000,
                    pageShifts,
                    sharedShifts,
                    lcpMs: last ? Math.round(last.startTime) : null,
                    lcpElement: last?.element ? last.element.tagName.toLowerCase() : null,
                  });
                }, settleMs);
              }),
            IMAGE_DELAY_MS + 3500,
          );
          test.info().annotations.push({ type: "vitals", description: JSON.stringify(vitals) });

          expect(vitals.pageShifts, "no shift of the page's own content").toEqual([]);
          expect(vitals.cls, "Chapter 5 §5.9").toBeLessThan(0.1);
        });
      });
    }
  }
}
