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

/**
 * The logo plate's edge, measured on the page rather than in the token files
 * (ADR-0085 D8 #3).
 *
 * `--color-logo-plate` is `#FFFFFF` in all three lists. What bounds it is
 * normally its own fill against the register underneath. In the
 * high-contrast list `--color-section-green-surface` is `#FFFFFF` too, so on
 * the partners section the plate, its card and the band become one white
 * field and the fill bounds nothing — measured 1:1 below, on the rendered
 * page. The plate therefore draws `--color-border-strong` at
 * `--border-width-default` in that list and in forced-colors, and in neither
 * of the other two, where an edge would be a box inside the card's box.
 *
 * Both halves are asserted: that the edge appears exactly where it should,
 * and that the ratio it answers for is the one recorded.
 */
const contrastInPage = () => {
  const channel = (value: number) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = (colour: string) => {
    const [r, g, b] = colour.match(/[\d.]+/g)!.slice(0, 3).map((part) => channel(Number(part) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  return (a: string, b: string) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  };
};

for (const theme of ["light", "dark", "high-contrast"] as const) {
  test(`site ${theme}: the logo plate carries an edge only where its fill stops bounding it`, async ({ page }) => {
    await page.addInitScript((stored) => window.localStorage.setItem("uaeaf-theme", stored), theme);
    await page.goto("/ar", { waitUntil: "domcontentloaded" });

    const measured = await page.evaluate((source) => {
      // eslint-disable-next-line no-new-func -- the helper is defined in this file and serialised in.
      const ratio = new Function(`return (${source})()`)() as (a: string, b: string) => number;

      /** The register the plate is standing on, read from the band itself.
       *
       *  Not the nearest painted ancestor: inside a section the plate sits on
       *  a card, and the card is `#FFFFFF` in light as well, so that walk
       *  measures the plate against the card (1:1 everywhere) rather than
       *  against the register. The card is a bounded object in its own right
       *  and bounds what is inside it; what the pairing record names, and what
       *  D8 #3 is about, is the plate against the band. */
      const registerOf = (plate: Element): string => {
        const band = plate.closest("section[data-register], [data-sponsor-strip]");
        if (!band) throw new Error("the plate stands on no register");
        return getComputedStyle(band).backgroundColor;
      };

      const read = (plate: Element | null, where: string) => {
        if (!plate) throw new Error(`no logo plate on the ${where}`);
        const edge = getComputedStyle(plate, "::after");
        const fill = getComputedStyle(plate).backgroundColor;
        const ground = registerOf(plate);
        return {
          where,
          fill,
          ground,
          ratio: Math.round(ratio(fill, ground) * 100) / 100,
          drawsEdge: edge.content !== "none",
          edgeWidth: edge.borderTopWidth,
          edgeColour: edge.borderTopColor,
        };
      };

      return {
        plates: document.querySelectorAll("[data-logo-plate]").length,
        green: read(document.querySelector('section[data-register="green"] [data-logo-plate]'), "green register"),
        black: read(document.querySelector("[data-sponsor-strip] [data-logo-plate]"), "black register"),
      };
    }, contrastInPage.toString());

    test.info().annotations.push({ type: `plate in ${theme}`, description: JSON.stringify(measured) });

    // A measurement is only evidence if something was measured.
    expect(measured.plates, "the homepage draws logo plates").toBeGreaterThan(0);

    for (const plate of [measured.green, measured.black]) {
      expect(plate.drawsEdge, `${plate.where}: an edge only in high contrast`).toBe(theme === "high-contrast");
      if (theme === "high-contrast") {
        expect(plate.edgeWidth, `${plate.where}: --border-width-default`).toBe("2px");
        expect(plate.edgeColour, `${plate.where}: --color-border-strong`).toBe("rgb(0, 0, 0)");
      }
    }

    // The black register keeps its fill boundary in every list.
    expect(measured.black.ratio, `black register: plate ${measured.black.fill} on ${measured.black.ground} = ${measured.black.ratio}:1`).toBeGreaterThanOrEqual(3);

    if (theme === "high-contrast") {
      // The premise of the edge, on the rendered page: the fill bounds nothing here.
      expect(measured.green.ratio, `green register: plate ${measured.green.fill} on ${measured.green.ground} = ${measured.green.ratio}:1`).toBeLessThan(1.1);
    } else {
      expect(measured.green.ratio, `green register: plate ${measured.green.fill} on ${measured.green.ground} = ${measured.green.ratio}:1`).toBeGreaterThanOrEqual(3);
    }
  });
}

/**
 * The same edge under `forced-colors: active` (ADR-0085 D8 #3).
 *
 * The user's own scheme replaces every author colour here, so nothing about
 * the *values* can be asserted — the page does not choose them. What the page
 * does choose is whether the plate is bounded at all, and in this mode it
 * must be, for the reason it is in high contrast: the replaced grounds are
 * flat, and an unbounded white plate is a mark floating on the same field as
 * everything around it.
 */
test.describe("forced colours", () => {
  test.use({ forcedColors: "active" });

  test("the logo plate still carries an edge when the user's own scheme replaces every colour", async ({ page }) => {
    await page.goto("/ar", { waitUntil: "domcontentloaded" });

    const measured = await page.evaluate(() => {
      const plate = document.querySelector("[data-logo-plate]");
      if (!plate) throw new Error("no logo plate on the homepage");
      const edge = getComputedStyle(plate, "::after");
      return {
        plates: document.querySelectorAll("[data-logo-plate]").length,
        drawsEdge: edge.content !== "none",
        width: edge.borderTopWidth,
        colour: edge.borderTopColor,
      };
    });

    test.info().annotations.push({ type: "plate in forced colours", description: JSON.stringify(measured) });

    expect(measured.plates, "the homepage draws logo plates").toBeGreaterThan(0);
    expect(measured.drawsEdge, "the plate is bounded").toBe(true);
    expect(measured.width, "the edge has a width").not.toBe("0px");
  });
});
