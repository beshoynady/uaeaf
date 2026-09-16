import { expect, test } from "@playwright/test";
import { MIN_COLUMN, maxPerRow, ROW_BREAKPOINTS, type PlanBreakpoint } from "../src/components/pages/strategic-plan/row-capacity";

/**
 * The Strategic Plan's ascending execution path (ADR-0075), measured where it
 * is drawn: each segment of the line must start on its step's chip and end on
 * the next step's, in both reading directions, at every layout that draws the
 * line (from `md`). A unit test can only count the segments; whether they meet
 * the chips depends on the column widths and gaps the browser resolves.
 *
 * Under reduced motion, so every segment is at rest.
 */

const ROUTE = "/about/governance/strategic-plan";

/** Within a pixel and a half: an anti-aliased 2px stroke ends inside that. */
const TOLERANCE = 1.5;

const VIEWPORTS = [
  { width: 1440, height: 900, isMobile: false },
  { width: 1024, height: 768, isMobile: false },
  { width: 768, height: 1024, isMobile: true },
] as const;

/** The widths each breakpoint's capacity is promised at: its narrowest. */
const BREAKPOINT_WIDTH: Record<PlanBreakpoint, number> = { md: 768, lg: 1024, xl: 1280, "2xl": 1536 };

/**
 * The rule the page computes its layout from (`row-capacity.ts`), measured
 * against the browser that resolves it: at the capacity a column still clears
 * the measured minimum, and one item more would not. The items are cloned in
 * the page — the seeded record is never touched — and the grid is told the new
 * count through the custom property the layout already reads.
 */
for (const [list, field, countVariable] of [
  ["phases", "phases", "--plan-phases"],
  ["steps", "executionSteps", "--plan-steps"],
] as const) {
  // Only the breakpoints this list draws a row at: a capacity at a width
  // where it never stands in a row says nothing about anything.
  for (const breakpoint of ROW_BREAKPOINTS[list] as readonly PlanBreakpoint[]) {
    const width = BREAKPOINT_WIDTH[breakpoint];
    const capacity = maxPerRow(list, breakpoint);

    test.describe(`${list} at ${width} (${breakpoint})`, () => {
      test.use({ viewport: { width, height: 900 }, reducedMotion: "reduce" });

      test(`hold ${capacity} columns of at least ${MIN_COLUMN[list]}px, and no more`, async ({ page }) => {
        await page.goto(`/ar${ROUTE}`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await page.locator(`[data-field="${field}"]`).scrollIntoViewIfNeeded();

        const measure = async (count: number) =>
          page.evaluate(
            ({ field: name, variable, wanted }) => {
              const list = document.querySelector<HTMLElement>(`[data-field="${name}"]`);
              if (!list) return null;
              const items = [...list.querySelectorAll<HTMLElement>(":scope > li")];
              // Clone the last row to reach the count, or drop the surplus.
              while (list.querySelectorAll(":scope > li").length > wanted) {
                list.querySelector(":scope > li:last-of-type")?.remove();
              }
              while (list.querySelectorAll(":scope > li").length < wanted) {
                list.append(items[items.length - 1].cloneNode(true));
              }
              list.style.setProperty(variable, String(wanted));
              const drawn = [...list.querySelectorAll<HTMLElement>(":scope > li")];
              const widths = drawn.map((item) => item.getBoundingClientRect().width);
              const tops = drawn.map((item) => Math.round(item.getBoundingClientRect().top));
              return {
                narrowest: Math.min(...widths),
                rows: new Set(tops).size,
                overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
              };
            },
            { field, variable: countVariable, wanted: count },
          );

        const fits = await measure(capacity);
        test.info().annotations.push({ type: `${capacity} items`, description: JSON.stringify(fits) });
        expect(fits, "the list is on the page").not.toBeNull();
        expect(fits!.narrowest, `${capacity} columns clear the measured minimum`).toBeGreaterThanOrEqual(MIN_COLUMN[list]);
        expect(fits!.rows, "one row").toBe(1);
        expect(fits!.overflow, "no sideways scroll").toBe(0);

        const over = await measure(capacity + 1);
        test.info().annotations.push({ type: `${capacity + 1} items`, description: JSON.stringify(over) });
        expect(over!.narrowest, `one more would be narrower than the minimum, which is why the row is not drawn`).toBeLessThan(
          MIN_COLUMN[list],
        );
      });
    });
  }
}

for (const locale of ["ar", "en"] as const) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${ROUTE} ${locale} ${viewport.width}x${viewport.height}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        reducedMotion: "reduce",
      });

      test("every segment of the execution path runs from its step's chip to the next step's chip", async ({ page }) => {
        await page.goto(`/${locale}${ROUTE}`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await page.locator('[data-field="executionSteps"]').scrollIntoViewIfNeeded();

        const reading = await page.evaluate(() => {
          const list = document.querySelector('[data-field="executionSteps"]');
          if (!list) return null;
          const steps = [...list.querySelectorAll<HTMLElement>(":scope > li")];
          const centre = (element: Element) => {
            const box = element.getBoundingClientRect();
            return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
          };
          const chips = steps.map((step) => centre(step.querySelector("[data-plan-chip]")!));
          const segments = steps.map((step) => {
            const line = step.querySelector<SVGLineElement>("[data-plan-segment] line");
            if (!line || (line.closest("[data-plan-segment]") as HTMLElement).getClientRects().length === 0) return null;
            const matrix = line.getScreenCTM()!;
            const point = (x: number, y: number) => ({ x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f });
            return {
              from: point(line.x1.baseVal.value, line.y1.baseVal.value),
              to: point(line.x2.baseVal.value, line.y2.baseVal.value),
            };
          });
          return { chips, segments };
        });

        test.info().annotations.push({ type: "path", description: JSON.stringify(reading) });
        expect(reading, "the execution path is on the page").not.toBeNull();
        const { chips, segments } = reading!;
        expect(chips.length, "steps to measure").toBeGreaterThan(1);
        expect(segments.filter(Boolean).length, "one segment per climb").toBe(chips.length - 1);
        expect(segments[chips.length - 1], "the last step draws no segment").toBeNull();

        const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
        for (let index = 0; index < chips.length - 1; index += 1) {
          const segment = segments[index]!;
          // The segment's two ends, whichever way round the mirror put them.
          const ends = [segment.from, segment.to];
          const here = Math.min(...ends.map((end) => distance(end, chips[index])));
          const next = Math.min(...ends.map((end) => distance(end, chips[index + 1])));
          expect(here, `segment ${index + 1} starts on chip ${index + 1}`).toBeLessThanOrEqual(TOLERANCE);
          expect(next, `segment ${index + 1} ends on chip ${index + 2}`).toBeLessThanOrEqual(TOLERANCE);
        }

        // The climb follows the reading direction: the next chip is further
        // along the line (left to right in English, right to left in Arabic).
        for (let index = 0; index < chips.length - 1; index += 1) {
          const along = locale === "ar" ? chips[index].x - chips[index + 1].x : chips[index + 1].x - chips[index].x;
          expect(along, `chip ${index + 2} follows chip ${index + 1} in the reading direction`).toBeGreaterThan(0);
          expect(chips[index + 1].y, `chip ${index + 2} stands higher than chip ${index + 1}`).toBeLessThan(chips[index].y);
        }
      });
    });
  }
}
