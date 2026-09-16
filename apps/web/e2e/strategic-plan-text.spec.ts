import { expect, test } from "@playwright/test";

/**
 * The Strategic Plan as a visitor receives it, against the page as it is
 * stored — character for character, in both languages (ADR-0075).
 *
 * The stored page is read from the public API on every run, never pasted
 * here, and the site is loaded with JavaScript disabled, so what is compared
 * is the server HTML a crawler, a slow screen reader and a print all get.
 * Each printed field carries `data-field` with its stored name; a list
 * carries it on the list, and each item marks its parts.
 */

const API = process.env.UAEAF_API_URL ?? "http://localhost:3000";
const ROUTE = "/about/governance/strategic-plan";

type Localized = Record<"ar" | "en", string>;

interface StoredItem {
  title: Localized;
  description: Localized | null;
  displayOrder: number;
}

interface StoredPage {
  heroTitle: Localized;
  heroSubtitle: Localized;
  introHeading: Localized;
  introText: Localized;
  phasesTitle: Localized | null;
  phases: StoredItem[];
  pillarsTitle: Localized;
  pillarsText: Localized | null;
  pillars: StoredItem[];
  objectivesTitle: Localized;
  objectives: StoredItem[];
  metricsTitle: Localized;
  metrics: { value: string; label: Localized; displayOrder: number }[];
  executionTitle: Localized;
  executionText: Localized | null;
  executionSteps: StoredItem[];
  ctaTitle: Localized;
  ctaText: Localized | null;
}

const SINGLE_FIELDS = [
  "heroSubtitle",
  "introHeading",
  "introText",
  "phasesTitle",
  "pillarsTitle",
  "pillarsText",
  "objectivesTitle",
  "metricsTitle",
  "executionTitle",
  "executionText",
  "ctaTitle",
  "ctaText",
] as const;

const LISTS = ["phases", "pillars", "objectives", "executionSteps"] as const;

const byOrder = <T extends { displayOrder: number }>(items: T[]): T[] => [...items].sort((a, b) => a.displayOrder - b.displayOrder);

test.use({ javaScriptEnabled: false });

for (const locale of ["ar", "en"] as const) {
  test(`/${locale}${ROUTE} shows the stored page character for character`, async ({ page, request }) => {
    const response = await request.get(`${API}/api/v1/strategic-plans-page/current/public`);
    expect(response.ok(), "the public API answers").toBe(true);
    const stored = (await response.json()) as StoredPage | null;
    expect(stored, "a Live page is published").not.toBeNull();

    const visit = await page.goto(`/${locale}${ROUTE}`);
    expect(visit?.status(), "the page exists").toBe(200);

    expect(await page.locator("h1").allTextContents()).toEqual([stored!.heroTitle[locale]]);

    for (const field of SINGLE_FIELDS) {
      const value = stored![field];
      const printed = page.locator(`[data-field="${field}"]`);
      if (value) {
        expect(await printed.allTextContents(), field).toEqual([value[locale]]);
      } else {
        await expect(printed, `${field} is empty, so nothing is printed for it`).toHaveCount(0);
      }
    }

    for (const field of LISTS) {
      const items = byOrder(stored![field]);
      expect(items.length, `the stored ${field} has items to compare`).toBeGreaterThan(0);
      const list = page.locator(`[data-field="${field}"]`);
      expect(await list.locator('[data-part="title"]').allTextContents(), `${field} titles`).toEqual(
        items.map((item) => item.title[locale]),
      );
      expect(await list.locator('[data-part="description"]').allTextContents(), `${field} descriptions`).toEqual(
        items.filter((item) => item.description).map((item) => item.description![locale]),
      );
    }

    const metrics = byOrder(stored!.metrics);
    expect(metrics.length, "the stored metrics have items to compare").toBeGreaterThan(0);
    const printedMetrics = page.locator('[data-field="metrics"]');
    expect(await printedMetrics.locator('[data-part="value"]').allTextContents(), "metric figures").toEqual(
      metrics.map((metric) => metric.value),
    );
    expect(await printedMetrics.locator('[data-part="label"]').allTextContents(), "metric labels").toEqual(
      metrics.map((metric) => metric.label[locale]),
    );
  });
}
