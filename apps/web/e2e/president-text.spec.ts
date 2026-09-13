import { expect, test } from "@playwright/test";

/**
 * The President's Message as a visitor receives it, against the record as it
 * is stored — character for character, in both languages.
 *
 * The stored record is read from the public API on every run, never pasted
 * here: a copy would pass on the day it was taken and on no day after. The page
 * is loaded with JavaScript disabled, so what is compared is the server HTML
 * that a crawler, a screen reader on a slow connection and a print all get.
 */

const API = process.env.UAEAF_API_URL ?? "http://localhost:3000";

interface StoredNode {
  type: string;
  text?: string;
  marks?: { type: string }[];
  content?: StoredNode[];
}

const paragraphs = (doc: StoredNode): string[] =>
  (doc.content ?? [])
    .filter((node) => node.type === "paragraph")
    .map((node) => (node.content ?? []).map((run) => run.text ?? "").join(""));

const boldRuns = (doc: StoredNode): string[] =>
  (doc.content ?? []).flatMap((node) =>
    (node.content ?? [])
      .filter((run) => run.marks?.some((mark) => mark.type === "bold"))
      .map((run) => run.text ?? ""),
  );

test.use({ javaScriptEnabled: false });

for (const locale of ["ar", "en"] as const) {
  test(`/${locale}/about/president shows the stored message character for character`, async ({ page, request }) => {
    const response = await request.get(`${API}/api/v1/president-message-page/current/public`);
    expect(response.ok(), "the public API serves a Live message").toBe(true);
    const stored = (await response.json()) as {
      pullQuote: Record<string, string> | null;
      messageBody: Record<string, StoredNode>;
      signatoryName: Record<string, string>;
      signatoryTitle: Record<string, string>;
    };

    const visit = await page.goto(`/${locale}/about/president`);
    expect(visit?.status(), "the page exists").toBe(200);

    const expected = paragraphs(stored.messageBody[locale]);
    expect(expected.length, "the stored body has paragraphs to compare").toBeGreaterThan(0);
    expect(await page.locator("article > div > p").allTextContents()).toEqual(expected);

    expect(await page.locator("article strong").allTextContents()).toEqual(boldRuns(stored.messageBody[locale]));
    if (locale === "ar") expect(await page.locator("article strong").count()).toBe(5);

    if (stored.pullQuote) {
      expect(await page.locator("article figure blockquote").textContent()).toBe(stored.pullQuote[locale]);
    }
    const signature = page.locator("article > footer");
    await expect(signature).toContainText(stored.signatoryName[locale]);
    await expect(signature).toContainText(stored.signatoryTitle[locale]);
    await expect(signature.locator("time")).toHaveAttribute("datetime", /\d{4}-\d{2}-\d{2}T/);
  });
}
