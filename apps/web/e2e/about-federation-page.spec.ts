import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * The About page as a visitor receives it (ADR-0101), measured in a real
 * browser because none of what follows can be seen in jsdom: the composition
 * at three widths, the contrast of text on the identity grounds, the focus
 * order through the page's controls, and whether the pinned rail shifts the
 * layout while it is scrolled.
 *
 * ── What this run needs ───────────────────────────────────────────────────
 *
 * A published, switched-on About page behind `WEB_BASE_URL`. Without one the
 * route answers its designed 404, so the checks stop with a message that says
 * so rather than failing one assertion at a time. Publish it with the API's own
 * cycle (`/about-federation-page/:id/publish`, then `PATCH :id/active`).
 *
 * ── The screenshots ──────────────────────────────────────────────────────
 *
 * Twelve, one per language × width × motion preference, written to
 * `e2e/artifacts/about/` for a person to look at. They are evidence, not
 * assertions: nothing here compares them to a baseline, because the page's
 * content is the federation's and changes.
 */

const ARTIFACTS = "e2e/artifacts/about";
mkdirSync(ARTIFACTS, { recursive: true });

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900, isMobile: false },
  { name: "768", width: 768, height: 1024, isMobile: false },
  { name: "390", width: 390, height: 844, isMobile: true },
] as const;

/**
 * The nine sections that carry an anchor, in printed order.
 *
 * The hero is not among them: it is `IdentityHero`, the shared institutional
 * hero, which takes a `titleId` and renders no section id of its own. Nothing
 * links to the hero — the canvas's labelled scroll link went with the decision
 * to reuse that component — so it is found by its heading instead.
 */
const SECTIONS = [
  "facts",
  "story",
  "timeline",
  "achievements",
  "pioneers",
  "leadership",
  "governance",
  "ecosystem",
  "cta",
] as const;

/** Relative luminance, then the ratio — computed from what the browser
 *  actually painted, not from the tokens, so a wrong token is still caught. */
const contrastOf = (foreground: string, background: string): number => {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const parse = (colour: string): [number, number, number] => {
    const parts = colour.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };
  const luminance = (colour: string) => {
    const [r, g, b] = parse(colour);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
};

/** Skips the whole file, once, when there is no page to look at. */
const openPage = async (page: Page, locale: string): Promise<void> => {
  const response = await page.goto(`/${locale}/about`, { waitUntil: "domcontentloaded" });
  const status = response?.status() ?? 0;
  test.skip(
    status === 404,
    "No live About page: publish one and switch it on, then run this again.",
  );
  expect(status).toBe(200);
  await page.waitForLoadState("networkidle").catch(() => undefined);
};

for (const locale of ["ar", "en"] as const) {
  for (const viewport of VIEWPORTS) {
    for (const motion of ["no-preference", "reduce"] as const) {
      test.describe(`${locale} ${viewport.name} motion=${motion}`, () => {
        test.use({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
          hasTouch: viewport.isMobile,
          deviceScaleFactor: 1,
          reducedMotion: motion,
          locale: locale === "ar" ? "ar-AE" : "en-AE",
        });

        test("draws the whole page, and shows every section it was sent", async ({ page }) => {
          await openPage(page, locale);

          // The direction the whole page is laid out in.
          const dir = await page.evaluate(() => document.documentElement.dir);
          expect(dir).toBe(locale === "ar" ? "rtl" : "ltr");

          // The hero always prints (ADR-0101 D2), and prints its own heading.
          await expect(page.locator("#about-hero-title")).toBeVisible();

          const present: string[] = [];
          for (const section of SECTIONS) {
            const node = page.locator(`#about-${section}`);
            if ((await node.count()) > 0) {
              present.push(section);
              // A section that arrived must be visible: nothing on this page is
              // hidden with CSS, so an invisible one means a broken layout.
              await expect(node).toBeVisible();
            }
          }
          console.log(`[${locale} ${viewport.name} ${motion}] sections drawn: hero, ${present.join(", ")}`);

          await page.screenshot({
            path: `${ARTIFACTS}/${locale}-${viewport.name}-${motion === "reduce" ? "reduced" : "motion"}.png`,
            fullPage: true,
          });
        });

        test("never scrolls sideways", async ({ page }) => {
          await openPage(page, locale);
          // Chapter 5: only a table, a diagram or a code block may exceed the
          // viewport, each in its own scroller. The page body may not.
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow, "the page body scrolls sideways").toBeLessThanOrEqual(1);
        });
      });
    }
  }
}

test.describe("contrast on the identity grounds", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("every text run on a coloured or dark ground clears 4.5:1", async ({ page }) => {
    await openPage(page, "ar");

    const samples = await page.evaluate(() => {
      const readings: { where: string; text: string; colour: string; ground: string }[] = [];
      // The bands that paint a ground of their own: the ones where a wrong ink
      // disappears rather than merely looking off.
      for (const id of ["about-achievements", "about-pioneers", "about-leadership", "about-cta"]) {
        const band = document.getElementById(id);
        if (!band) continue;

        /**
         * See-through means a fourth component of zero, and nothing else.
         *
         * Read as a pattern — "ends in a zero" — `rgb(0, 0, 0)` matches too,
         * and every black band is walked past as if it painted nothing. The
         * ground then comes back as the page canvas and white ink on black
         * reads as white on white: 1.05:1, twenty-four times over.
         */
        const isSeeThrough = (colour: string): boolean => {
          if (colour === "transparent") return true;
          const parts = colour.match(/[\d.]+/g)?.map(Number) ?? [];
          return parts.length === 4 && parts[3] === 0;
        };

        const groundOf = (node: Element): string => {
          let current: Element | null = node;
          while (current) {
            const painted = getComputedStyle(current).backgroundColor;
            if (painted && !isSeeThrough(painted)) {
              return painted;
            }
            current = current.parentElement;
          }
          return "rgb(255, 255, 255)";
        };

        for (const node of band.querySelectorAll("h2, h3, p, span, a, button")) {
          const text = (node.textContent ?? "").trim();
          if (text.length === 0 || node.childElementCount > 0) continue;
          const style = getComputedStyle(node);
          if (style.visibility === "hidden" || style.display === "none") continue;
          readings.push({ where: id, text: text.slice(0, 40), colour: style.color, ground: groundOf(node) });
        }
      }
      return readings;
    });

    expect(samples.length, "found no text to measure — the selector is wrong").toBeGreaterThan(10);

    const failures = samples
      .map((sample) => ({ ...sample, ratio: contrastOf(sample.colour, sample.ground) }))
      .filter((sample) => sample.ratio < 4.5);

    for (const failure of failures) {
      console.log(
        `FAIL ${failure.where}: "${failure.text}" ${failure.colour} on ${failure.ground} = ${failure.ratio.toFixed(2)}:1`,
      );
    }
    console.log(`measured ${samples.length} text runs on painted grounds`);
    expect(failures.map((f) => `${f.where}: ${f.text} = ${f.ratio.toFixed(2)}`)).toEqual([]);
  });
});

test.describe("the keyboard", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("reaches every control, and each one shows where it is", async ({ page }) => {
    await openPage(page, "ar");

    const controls = await page.locator("#about-achievements button, #about-cta a, #about-governance a").count();
    expect(controls, "the page has no controls to tab through").toBeGreaterThan(0);

    // Walk far enough to pass the page's own controls, recording each stop that
    // belongs to this page and whether the browser draws an indicator on it.
    const seen: { tag: string; label: string; ring: boolean }[] = [];
    for (let step = 0; step < 60; step += 1) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const node = document.activeElement;
        if (!node || node === document.body) return null;
        const band = node.closest('[id^="about-"]');
        if (!band) return null;
        const style = getComputedStyle(node);
        return {
          tag: node.tagName.toLowerCase(),
          label: (node.getAttribute("aria-label") ?? node.textContent ?? "").trim().slice(0, 34),
          // The project's ring is a `box-shadow`-based `ring`, and an outline
          // is the browser's own: either is an indicator.
          ring: style.outlineStyle !== "none" || /ring|shadow/.test(style.boxShadow) || style.boxShadow !== "none",
        };
      });
      if (stop) seen.push(stop);
    }

    console.log(`tabbed to ${seen.length} of this page's controls`);
    for (const stop of seen) console.log(`  ${stop.tag} "${stop.label}" ring=${stop.ring}`);

    expect(seen.length, "tabbing reached none of the page's own controls").toBeGreaterThan(0);
    expect(
      seen.filter((stop) => !stop.ring).map((stop) => `${stop.tag} "${stop.label}"`),
      "a control took focus without showing it",
    ).toEqual([]);
  });
});

test.describe("the pinned rail (scene 05)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shifts nothing while it is scrolled through", async ({ page }) => {
    await openPage(page, "ar");

    const rail = page.locator("#about-achievements");
    test.skip((await rail.count()) === 0, "the achievements section is not on this page");

    await page.evaluate(() => {
      (window as unknown as { __shift: number }).__shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) {
            (window as unknown as { __shift: number }).__shift += entry.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    // Down through the rail in steps, then back, which is what a reader does
    // and what a `sticky` section has to survive.
    for (let step = 0; step < 24; step += 1) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(90);
    }
    for (let step = 0; step < 8; step += 1) {
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(90);
    }

    const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
    console.log(`cumulative layout shift across the rail: ${shift.toFixed(4)}`);
    expect(shift, "scrolling the rail moved the page").toBeLessThan(0.1);
  });

  /**
   * The plan's Task 12–14 Step 4: "Mobile and reduced-motion always use
   * `scroll-snap`." A pinned section reserves a screen of vertical scroll and
   * spends it sideways, which on a phone means the reader's own scrolling stops
   * working for the length of the rail — the gesture they use to leave the
   * section is the one the section has taken over.
   *
   * Reduced-motion was built. The width was not, so the rail pinned on a phone,
   * where its track overflows by more than anywhere else.
   */
  test("is never pinned on a phone, however far its track overflows", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPage(page, "ar");

    const rail = page.locator("#about-achievements");
    test.skip((await rail.count()) === 0, "the achievements section is not on this page");

    // Long enough for the effect that decides the pin to have run and, if it
    // were going to, pinned: an immediate read would pass before it ever ran.
    await page.waitForTimeout(1_200);

    const measured = await page.evaluate(() => {
      const band = document.getElementById("about-achievements")!;
      const track = band.querySelector("ul")!;
      const viewport = track.parentElement!;
      return {
        overflow: track.scrollWidth - viewport.clientWidth,
        sticky: [...band.querySelectorAll("*")].some((node) => getComputedStyle(node).position === "sticky"),
        // The ordinary branch is a snap scroller, which is what must be there
        // instead: absent both, the rail would simply be unreachable.
        scroller: getComputedStyle(viewport).overflowX,
      };
    });

    console.log(`phone rail: overflow ${measured.overflow}px, sticky ${measured.sticky}, overflow-x ${measured.scroller}`);
    expect(measured.overflow, "nothing overflows, so this proves nothing").toBeGreaterThan(0);
    expect(measured.sticky, "the rail pinned on a phone and took over the reader's scrolling").toBe(false);
    expect(measured.scroller, "the rail is neither pinned nor scrollable on a phone").toBe("auto");
  });

  test("is pinned when its track overflows, and not when it fits", async ({ page }) => {
    await openPage(page, "ar");

    const rail = page.locator("#about-achievements");
    test.skip((await rail.count()) === 0, "the achievements section is not on this page");

    /**
     * The pin is decided in a `useEffect` from a measured overflow, so it does
     * not exist in the server HTML and is not there the instant the page
     * loads. Read too early, the rail reports itself unpinned however wide its
     * track is, and the check passes on an answer it never waited for.
     */
    await expect(page.locator("#about-achievements .sticky")).toBeAttached({ timeout: 5_000 });

    const measured = await page.evaluate(() => {
      const band = document.getElementById("about-achievements");
      const track = band?.querySelector("ul");
      const viewport = track?.parentElement;
      if (!band || !track || !viewport) return null;
      const sticky = [...band.querySelectorAll("*")].some((node) => getComputedStyle(node).position === "sticky");
      return { overflow: track.scrollWidth - viewport.clientWidth, sticky, cards: track.children.length };
    });

    expect(measured, "could not find the rail's track").not.toBeNull();
    console.log(
      `rail: ${measured!.cards} cards, overflow ${measured!.overflow}px, sticky ${measured!.sticky}`,
    );

    // A pin only where there is something to move, and a pin wherever there is.
    // Both halves are asserted: with only the second, a rail that never pinned
    // at all would satisfy the check on every screen that overflows.
    expect(measured!.sticky, measured!.overflow > 0
      ? "the track overflows but the rail is not pinned"
      : "the rail is pinned although its cards already fit",
    ).toBe(measured!.overflow > 0);
  });
});

test.describe("the page's own words", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /**
   * A key with no entry is not an error anywhere: `next-intl` logs
   * `MISSING_MESSAGE` and renders the key's own path, so the page ships with
   * `Pages.about` where its name belongs and still passes every other check
   * here. `page-message-keys.spec.ts` pins the two page catalogues; this
   * catches a key read from anywhere on the page, in either language.
   */
  for (const locale of ["ar", "en"] as const) {
    test(`names everything it prints in ${locale}`, async ({ page }) => {
      const missing = new Set<string>();
      page.on("console", (message) => {
        for (const hit of message.text().matchAll(/MISSING_MESSAGE:?\s*([^\n]{0,160})/g)) {
          missing.add(hit[1].trim());
        }
      });

      await openPage(page, locale);
      await page.waitForTimeout(1_000);

      expect([...missing], "a message key on this page has no entry").toEqual([]);
    });
  }
});
