import { expect, test } from "@playwright/test";

/**
 * The Vision & Mission page as a visitor receives it, against the page as it
 * is stored — character for character, in both languages.
 *
 * The stored page is read from the public API on every run, never pasted here,
 * and the site is loaded with JavaScript disabled, so what is compared is the
 * server HTML a crawler, a slow screen reader and a print all get. Each printed
 * field carries `data-field` with its stored name; a list carries it on the
 * list, and each item marks its `title` and `description`.
 */

const API = process.env.UAEAF_API_URL ?? "http://localhost:3000";
const ROUTE = "/about/governance/vision-mission";

type Localized = Record<"ar" | "en", string>;

interface StoredBlock {
  title: Localized;
  description: Localized;
  displayOrder: number;
}

interface StoredPage {
  heroTitle: Localized;
  heroSubtitle: Localized;
  visionTitle: Localized | null;
  visionText: Localized;
  missionTitle: Localized | null;
  missionText: Localized;
  goalsTitle: Localized | null;
  strategicGoals: StoredBlock[];
  coreValues: StoredBlock[];
}

const SINGLE_FIELDS = ["heroSubtitle", "visionTitle", "visionText", "missionTitle", "missionText", "goalsTitle"] as const;

test.use({ javaScriptEnabled: false });

for (const locale of ["ar", "en"] as const) {
  test(`/${locale}${ROUTE} shows the stored page character for character`, async ({ page, request }) => {
    const response = await request.get(`${API}/api/v1/vision-mission-page/current/public`);
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

    for (const field of ["strategicGoals", "coreValues"] as const) {
      const blocks = [...stored![field]].sort((a, b) => a.displayOrder - b.displayOrder);
      expect(blocks.length, `the stored ${field} has items to compare`).toBeGreaterThan(0);
      const list = page.locator(`[data-field="${field}"]`);
      expect(await list.locator('[data-part="title"]').allTextContents(), `${field} titles`).toEqual(
        blocks.map((block) => block.title[locale]),
      );
      expect(await list.locator('[data-part="description"]').allTextContents(), `${field} descriptions`).toEqual(
        blocks.map((block) => block.description[locale]),
      );
    }
  });
}
