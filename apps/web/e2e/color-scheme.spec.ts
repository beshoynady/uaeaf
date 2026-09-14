import { expect, test } from "@playwright/test";

/**
 * What the browser paints for the page follows the site's theme, not the
 * operating system's (ADR-0071 D3).
 *
 * `color-scheme` decides the scrollbars, the system colours (`Canvas`,
 * `CanvasText`, `ButtonBorder`) and every native control's own paint. Set to
 * `light dark`, it hands that choice to the operating system while the theme
 * button changes only `data-theme`: measured 2026-09-14, a dark site on a
 * light system drew a white scrollbar track beside a `#131210` page. The
 * dashboard fixed the same line on 2026-09-08.
 *
 * Every theme is checked on both system settings. The theme is chosen the way
 * a visitor chooses it, through the stored preference the boot script reads
 * before the first paint.
 */

const SITE_THEMES = [
  { theme: "light", scheme: "light", canvas: "rgb(255, 255, 255)" },
  { theme: "dark", scheme: "dark", canvas: "rgb(18, 18, 18)" },
  // High contrast paints a white page: the light scheme is the one that matches it.
  { theme: "high-contrast", scheme: "light", canvas: "rgb(255, 255, 255)" },
] as const;

for (const system of ["light", "dark"] as const) {
  for (const { theme, scheme, canvas } of SITE_THEMES) {
    test.describe(`system ${system}, site ${theme}`, () => {
      test.use({ colorScheme: system });

      test(`uses the ${scheme} scheme`, async ({ page }) => {
        await page.addInitScript((stored) => window.localStorage.setItem("uaeaf-theme", stored), theme);
        await page.goto("/ar", { waitUntil: "domcontentloaded" });

        const measured = await page.evaluate(() => {
          const probe = document.createElement("div");
          probe.style.backgroundColor = "Canvas";
          document.body.append(probe);
          const result = {
            theme: document.documentElement.getAttribute("data-theme"),
            scheme: getComputedStyle(document.documentElement).colorScheme,
            canvas: getComputedStyle(probe).backgroundColor,
          };
          probe.remove();
          return result;
        });

        expect(measured.theme, "the stored theme is applied").toBe(theme);
        expect(measured.scheme).toBe(scheme);
        expect(measured.canvas, "the system colour follows the site").toBe(canvas);
      });
    });
  }
}
