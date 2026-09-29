import { expect, test, type Page } from "@playwright/test";

/**
 * The pointer path from a mega-menu trigger into its panel, which jsdom cannot
 * judge: it depends on where the two boxes actually sit.
 *
 * The defect these guard against: the trigger was shorter than the header row,
 * so between its bottom edge and the panel — which starts at the header's own
 * bottom — lay a band of about 18px belonging to neither. Crossing it left the
 * `<nav>` that owns the close timer; the grace period expired while the pointer
 * was still in the band, and by the time it reached the panel the panel was
 * `visibility: hidden` and could not be hovered at all.
 *
 * Both cases therefore step THROUGH that band rather than jumping over it. The
 * step is computed from the label's own bottom edge, which is where the trigger
 * used to end, so the assertion keeps describing the defect even though the
 * trigger now reaches further down.
 */

const VIEWPORT = { width: 1440, height: 900 };

/** The second row trigger — a panel wide enough to have a far side. */
const openTrigger = async (page: Page) => {
  const trigger = page.locator("#primary-nav button[aria-expanded]").nth(1);
  const panelId = await trigger.getAttribute("aria-controls");
  expect(panelId, "the trigger controls a panel").toBeTruthy();

  const panel = page.locator(`#${panelId}`);
  const label = trigger.locator("span").first();

  // Approach from the page, not from nowhere: a pointer that materialises on
  // the trigger never tests the enter/leave pair.
  await page.mouse.move(VIEWPORT.width / 2, 500);
  const box = (await trigger.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  return { trigger, panel, label, box };
};

/**
 * A point in the band that used to belong to neither box: below the label, and
 * just above the panel. Taken near the panel rather than at the band's middle,
 * because the middle sits inside the old trigger in one language and outside it
 * in the other — which would leave the English case passing on the defect.
 */
const SEAM_ABOVE_PANEL = 4;
const seamPoint = async (label: ReturnType<Page["locator"]>, panel: ReturnType<Page["locator"]>) => {
  const labelBox = (await label.boundingBox())!;
  const panelBox = (await panel.boundingBox())!;
  const y = panelBox.y - SEAM_ABOVE_PANEL;
  expect(y, "the step is below the label, not on it").toBeGreaterThan(labelBox.y + labelBox.height);
  return y;
};

for (const locale of ["ar", "en"] as const) {
  test.describe(`header mega panel — pointer travel (${locale})`, () => {
    test.use({ viewport: VIEWPORT });

    test("survives a pause in the seam on the way to the first panel link", async ({ page }) => {
      await page.goto(`/${locale}`);
      const { trigger, panel, label, box } = await openTrigger(page);

      const y = await seamPoint(label, panel);
      await page.mouse.move(box.x + box.width / 2, y, { steps: 3 });
      // Longer than any close delay the motion tokens offer, so a timer that
      // is merely slow does not pass this by being slow enough.
      await page.waitForTimeout(500);
      await expect(trigger, "the panel stayed open while the pointer rested in the seam").toHaveAttribute(
        "aria-expanded",
        "true",
      );

      const link = panel.locator("a").first();
      const linkBox = (await link.boundingBox())!;
      await page.mouse.move(linkBox.x + linkBox.width / 2, linkBox.y + linkBox.height / 2, { steps: 5 });
      await expect(trigger, "the panel is still open under the pointer").toHaveAttribute(
        "aria-expanded",
        "true",
      );
      await expect(link).toBeVisible();
    });

    test("survives a diagonal to the card on the panel's far side", async ({ page }) => {
      await page.goto(`/${locale}`);
      const { trigger, panel, label, box } = await openTrigger(page);

      // The far side of a panel that spans the page: from the trigger's outer
      // edge the path is diagonal, and it still crosses the seam.
      const panelBox = (await panel.boundingBox())!;
      const nearPanelEnd = Math.abs(box.x - panelBox.x) > Math.abs(panelBox.x + panelBox.width - box.x);
      const targetX = nearPanelEnd ? panelBox.x + 120 : panelBox.x + panelBox.width - 120;
      const targetY = panelBox.y + panelBox.height - 80;

      const startX = nearPanelEnd ? box.x + box.width : box.x;
      const y = await seamPoint(label, panel);
      const ratio = (y - (box.y + box.height / 2)) / (targetY - (box.y + box.height / 2));

      await page.mouse.move(startX + (targetX - startX) * ratio, y, { steps: 4 });
      await page.mouse.move(targetX, targetY, { steps: 8 });
      await expect(trigger, "the panel survived the diagonal to its far side").toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });

    test("still closes once the pointer leaves both the trigger and the panel", async ({ page }) => {
      await page.goto(`/${locale}`);
      const { trigger, panel } = await openTrigger(page);

      const panelBox = (await panel.boundingBox())!;
      await page.mouse.move(VIEWPORT.width / 2, panelBox.y + panelBox.height + 200, { steps: 6 });
      await expect(trigger, "leaving both closes the panel").toHaveAttribute("aria-expanded", "false", {
        timeout: 2_000,
      });
    });
  });
}
