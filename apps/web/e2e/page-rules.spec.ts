import { expect, test, type Page } from "@playwright/test";

/**
 * The page rules of `docs/engineering/page-building-guide.md` §٨, measured on
 * the rendered page (ADR-0073 D4, ADR-0074).
 *
 * - Rule 1: every section carries a section-scale identity element: identity
 *   strokes, a photograph or a coloured register. The accent rule and item
 *   cards do not count on their own.
 * - Rule 2 (a picture shows athletics) is a reading of each picture and its
 *   alternative text, not a measurement: the run lists every picture's
 *   alternative text as an annotation for the person who reads them.
 * - Rule 3: every seam is marked: the seam after the hero, registers that
 *   differ, seam lines drawn by the later section, or two statements with
 *   photographs on opposite sides. The base and sunken grounds alone do not
 *   count (ΔE 2.13 in light, one white in high contrast).
 * - Rule 4: numbered items read in the page's direction, row after row.
 * - Rule 5: two consecutive sections of one composition only as a mirrored pair
 *   of statements, and never three.
 * - Rule 6, its measurable part: every picture offered as content carries an
 *   alternative text in the page's language. Whether the text describes the
 *   picture is the publishing gate's reading (guide §٨).
 *
 * The section reader is checked first, on one page per hero the site has
 * today, because every rule relies on what it reads.
 *
 * Rules 1, 3 and 5 read the composition the record's content gives the page. A
 * run whose page is not the published composition (the CI fixture carries no
 * photographs and serves no board list) skips them, visibly; rules 4 and 6
 * still run.
 *
 * `PENDING` lists findings the owner has still to decide, per page and section.
 * Each must still break its rule: once it is fixed the entry has to go, so the
 * list never hides a section that already passes.
 *
 * While a page is being built: `MSYS_NO_PATHCONV=1 ONLY_ROUTE=/about/<route>`.
 */

type Rule = "rule1" | "rule3" | "rule5";

interface SectionReading {
  /** The band's section names; sections standing side by side are one band. */
  id: string;
  kind: "hero" | "band" | "cards" | "statement" | "text";
  register: string;
  photoSide: string | null;
  /** Pictures offered as content: an alternative text, not hidden from assistive technology. */
  photographs: number;
  strokes: number;
  seamStrokes: number;
}

interface RoutePlan {
  route: string;
  /** Whether the page carries a numbered list (rule 4). */
  numbered: boolean;
  /** The fewest sections the page shows whatever record it is served. */
  minimumSections: number;
  /** Whether the page reads as its published composition, and why not when it does not. */
  published: { reason: string; holds: (sections: SectionReading[]) => boolean };
}

const ALL_ROUTES: RoutePlan[] = [
  {
    route: "/about/governance/vision-mission",
    numbered: true,
    minimumSections: 6,
    published: {
      reason: "the record carries no photographs (the CI fixture), so the composition these rules read is not the published one",
      holds: (sections) => sections.some((section) => section.kind !== "hero" && section.photographs > 0),
    },
  },
  // Calibration (closing brief M8): two pages the rules were not written from.
  {
    route: "/about/president",
    numbered: false,
    minimumSections: 3,
    published: {
      reason: "the hero carries no portrait, so the composition these rules read is not the published one",
      holds: (sections) => sections[0]?.kind === "hero" && sections[0].photographs > 0,
    },
  },
  {
    route: "/about/board-members",
    numbered: false,
    minimumSections: 1,
    published: {
      reason: "the board's list is not served (the CI fixture serves only the President's Message and Vision & Mission)",
      holds: (sections) => sections.length > 1,
    },
  },
  // ADR-0075: eight sections; the three numbered lists (phases, pillars,
  // objectives) and the numbered execution steps are all read by rule 4.
  {
    route: "/about/governance/strategic-plan",
    numbered: true,
    minimumSections: 8,
    published: {
      reason: "the record carries no photographs (the CI fixture), so the composition these rules read is not the published one",
      holds: (sections) => sections.some((section) => section.kind !== "hero" && section.photographs > 0),
    },
  },
];

const ROUTES = ALL_ROUTES.filter((plan) => !process.env.ONLY_ROUTE || plan.route === process.env.ONLY_ROUTE);

/** One page per hero the site has today: the identity hero with a photograph
 *  and with a portrait, the listing hero on a register and on a preparing page,
 *  and the contact hero. The reader is checked on each before a rule relies on
 *  what it reads (closing brief M7). */
const ALL_READER_ROUTES = [
  "/about/governance/vision-mission",
  "/about/president",
  "/about/board-members",
  "/about/governance/strategic-plan",
  "/contact",
];

const READER_ROUTES = ALL_READER_ROUTES.filter((route) => !process.env.ONLY_ROUTE || route === process.env.ONLY_ROUTE);

if (ROUTES.length === 0 && READER_ROUTES.length === 0) {
  throw new Error(
    `ONLY_ROUTE is "${process.env.ONLY_ROUTE}"; expected one of ${[...new Set([...ALL_ROUTES.map((plan) => plan.route), ...ALL_READER_ROUTES])].join(", ")}.`,
  );
}

/** A finding held for the owner: everywhere, or only below a width where the
 *  remedy cannot be drawn (`SeamLines from="lg"`). */
type Held = string | { reason: string; below: number };

// ADR-0074 D8's three rule 1 findings and `SeamLines placement="below"`
// (ADR-0075 M0-B): the strokes stand wholly on the page's ground after a
// coloured band. The board's list takes them at every width. The President's
// message and call take them from `lg`: below it their first line spans the
// frame, and the guard measured the strokes 0–16.5px from it (IL-5), so the
// two findings stay recorded for those widths only.
const PENDING: Record<string, Record<string, Partial<Record<Rule, Held>>>> = {
  "/about/governance/vision-mission": {},
  "/about/president": {
    "(unnamed)": {
      rule1: { reason: "the message opens on its body text across the frame below lg, leaving no corner 32px clear of words for the strokes", below: 1024 },
    },
    "vision-mission-cta-title": {
      rule1: { reason: "the call's heading spans the frame below lg, leaving no corner 32px clear of words for the strokes; no photograph field", below: 1024 },
    },
  },
  "/about/board-members": {},
  // ADR-0075: the pillars follow the green phases band with no photograph;
  // their strokes are drawn from md, because on a phone the heading spans the
  // line and IL-5 measured the strokes 3.7–11px from it. Presented to the owner.
  "/about/governance/strategic-plan": {
    "strategic-plan-pillars-title": {
      rule1: { reason: "the pillars' heading spans a phone's line below md, leaving no corner 32px clear of words for the strokes; the section has no photograph", below: 768 },
    },
  },
};

const heldAt = (held: Held | undefined, width: number): string | undefined =>
  typeof held === "string" ? held : held && width < held.below ? held.reason : undefined;

const VIEWPORTS = [
  { width: 1440, height: 900, isMobile: false },
  { width: 768, height: 1024, isMobile: true },
  { width: 390, height: 844, isMobile: true },
] as const;

/** The three colour lists (Chapter 7 §7.3), stamped by the boot script from
 *  `localStorage` before the first paint. */
const THEMES = ["light", "dark", "high-contrast"] as const;

/** WCAG's floor for a shape or an edge, and ADR-0059 §D2's floor for two
 *  grounds that read as different regions. */
const EDGE_FLOOR = 3;
const GROUND_FLOOR = 1.4;

interface SeamReading {
  id: string;
  beforeKind: SectionReading["kind"];
  /** The two grounds meeting at the seam, and how far apart they measure. */
  grounds: [string, string];
  groundContrast: number;
  /** An edge drawn on either band at the seam: its colour's worst contrast against the two grounds. */
  edgeContrast: number | null;
  seamStrokes: number;
  mirrored: boolean;
  /** Strokes placed below the seam: whether every sampled point stands on
   *  the later section, and the worst contrast of their fills on its ground. */
  below: { onSection: boolean; strokeContrast: number; strokes: number } | null;
}

/**
 * Every seam, measured as the page paints it in the current theme: the
 * computed grounds on either side, any edge the bands draw, the strokes on it.
 * Contrast is computed from the rendered colours, not from the token files.
 */
const readSeams = (page: Page) =>
  page.evaluate(
    ({ pointsPerStroke }): SeamReading[] => {
      const visible = (element: Element) => (element as HTMLElement).getClientRects().length > 0;
      const main = document.querySelector("main") ?? document.body;
      const sections = [...main.querySelectorAll<HTMLElement>("section")].filter(
        (section) => !section.parentElement?.closest("section") && visible(section),
      );

      const bands: HTMLElement[][] = [];
      let bottom = -Infinity;
      for (const section of sections) {
        const box = section.getBoundingClientRect();
        const [top, end] = [box.top + scrollY, box.bottom + scrollY];
        if (bands.length > 0 && top < bottom - 1) {
          bands[bands.length - 1].push(section);
          bottom = Math.max(bottom, end);
        } else {
          bands.push([section]);
          bottom = end;
        }
      }

      const channel = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      const parse = (color: string): [number, number, number, number] | null => {
        const m = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
        return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null;
      };
      const luminance = (color: string): number | null => {
        const rgb = parse(color);
        if (!rgb || rgb[3] === 0) return null;
        return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
      };
      const contrast = (a: string, b: string): number => {
        const [x, y] = [luminance(a), luminance(b)];
        if (x === null || y === null) return 1;
        const [hi, lo] = x > y ? [x, y] : [y, x];
        return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
      };

      /** The ground a section paints, or the page's when it paints none (a
       *  hero standing on its photograph). */
      const groundOf = (section: HTMLElement): string => {
        const own = getComputedStyle(section).backgroundColor;
        return luminance(own) === null ? getComputedStyle(document.body).backgroundColor : own;
      };

      /** The edge a band draws with a pseudo-element at its top or bottom. */
      const edgeOf = (section: HTMLElement, side: "top" | "bottom"): string | null => {
        for (const pseudo of ["::after", "::before"]) {
          const style = getComputedStyle(section, pseudo);
          if (style.content === "none" || style.content === "") continue;
          const width = parseFloat(side === "top" ? style.borderTopWidth : style.borderBottomWidth);
          const color = side === "top" ? style.borderTopColor : style.borderBottomColor;
          if (width > 0 && luminance(color) !== null) return color;
        }
        return null;
      };

      const kindOf = (band: HTMLElement[]): SectionReading["kind"] => {
        const register = band.map((s) => s.dataset.register ?? "neutral").find((n) => n !== "neutral") ?? "neutral";
        if (band.some((s) => s.querySelector("h1"))) return "hero";
        if (register !== "neutral") return "band";
        if (band.some((s) => s.querySelector("li[data-item-tone]"))) return "cards";
        if (band.some((s) => s.querySelector("[data-slanted-photo]"))) return "statement";
        return "text";
      };
      const sideOf = (band: HTMLElement[]) =>
        band.map((s) => s.querySelector<HTMLElement>("[data-slanted-photo]")?.dataset.side ?? null).find(Boolean) ?? null;

      const readings: SeamReading[] = [];
      for (let i = 1; i < bands.length; i += 1) {
        const before = bands[i - 1];
        const after = bands[i];
        const beforeLast = before[before.length - 1];
        const afterFirst = after[0];
        const grounds: [string, string] = [groundOf(beforeLast), groundOf(afterFirst)];

        const edges = [edgeOf(beforeLast, "bottom"), edgeOf(afterFirst, "top")].filter((c): c is string => c !== null);
        const edgeContrast =
          edges.length > 0 ? Math.max(...edges.map((edge) => Math.min(contrast(edge, grounds[0]), contrast(edge, grounds[1])))) : null;

        const strokes = after.flatMap((s) => [...s.querySelectorAll<HTMLElement>("[data-seam-lines] [data-il-stroke]")]).filter(visible);

        const belowSet = after.flatMap((s) => [...s.querySelectorAll<HTMLElement>('[data-seam-lines][data-placement="below"]')]);
        let below: SeamReading["below"] = null;
        if (belowSet.length > 0) {
          const sectionTop = afterFirst.getBoundingClientRect().top;
          let onSection = true;
          let strokeContrast = Infinity;
          let count = 0;
          for (const set of belowSet) {
            for (const stroke of [...set.querySelectorAll<HTMLElement>("[data-il-stroke]")].filter(visible)) {
              const path = stroke.querySelector("path")!;
              const matrix = path.getScreenCTM();
              if (!matrix) continue;
              count += 1;
              const length = path.getTotalLength();
              for (let p = 0; p <= pointsPerStroke; p += 1) {
                const point = path.getPointAtLength((length * p) / pointsPerStroke);
                const y = matrix.b * point.x + matrix.d * point.y + matrix.f;
                if (y < sectionTop - 0.5) onSection = false;
              }
              strokeContrast = Math.min(strokeContrast, contrast(getComputedStyle(path).fill, grounds[1]));
            }
          }
          below = { onSection, strokeContrast: count > 0 ? strokeContrast : 0, strokes: count };
        }

        const mirrored =
          kindOf(before) === "statement" && kindOf(after) === "statement" && sideOf(before) !== sideOf(after);

        readings.push({
          id: after.map((s) => s.getAttribute("aria-labelledby") ?? "(unnamed)").join(" + "),
          beforeKind: kindOf(before),
          grounds,
          groundContrast: contrast(grounds[0], grounds[1]),
          edgeContrast,
          seamStrokes: strokes.length,
          mirrored,
          below,
        });
      }
      return readings;
    },
    { pointsPerStroke: 64 },
  );

/** The page's own bands, in document order, and what each is made of. */
const readSections = (page: Page) =>
  page.evaluate((): SectionReading[] => {
    const visible = (element: Element) => (element as HTMLElement).getClientRects().length > 0;
    const main = document.querySelector("main") ?? document.body;

    const sections = [...main.querySelectorAll<HTMLElement>("section")].filter(
      (section) => !section.parentElement?.closest("section") && visible(section),
    );

    // Sections that share a stretch of the page's height stand side by side,
    // as the contact form and map do from `xl`: one band.
    const bands: HTMLElement[][] = [];
    let bottom = -Infinity;
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      const [top, end] = [box.top + scrollY, box.bottom + scrollY];
      if (bands.length > 0 && top < bottom - 1) {
        bands[bands.length - 1].push(section);
        bottom = Math.max(bottom, end);
      } else {
        bands.push([section]);
        bottom = end;
      }
    }

    const within = (band: HTMLElement[], selector: string) =>
      band.flatMap((section) => [...section.querySelectorAll<HTMLElement>(selector)]);

    return bands.map((band) => {
      const register = band.map((section) => section.dataset.register ?? "neutral").find((name) => name !== "neutral") ?? "neutral";
      const slanted = within(band, "[data-slanted-photo]")[0];
      const kind: SectionReading["kind"] = band.some((section) => section.querySelector("h1"))
        ? "hero"
        : register !== "neutral"
          ? "band"
          : within(band, "li[data-item-tone]").length > 0
            ? "cards"
            : slanted
              ? "statement"
              : "text";
      return {
        id: band.map((section) => section.getAttribute("aria-labelledby") ?? "(unnamed)").join(" + "),
        kind,
        register,
        photoSide: slanted?.dataset.side ?? null,
        photographs: within(band, "img").filter((image) => image.getAttribute("alt") && !image.closest('[aria-hidden="true"]')).length,
        strokes: within(band, "[data-il-stroke]").filter(visible).length,
        seamStrokes: within(band, "[data-seam-lines] [data-il-stroke]").filter(visible).length,
      };
    });
  });

const passes: Record<Rule, (sections: SectionReading[], index: number) => boolean> = {
  rule1: (sections, i) => sections[i].strokes > 0 || sections[i].photographs > 0 || sections[i].register !== "neutral",
  rule3: (sections, i) => {
    if (i === 0) return true;
    const [before, section] = [sections[i - 1], sections[i]];
    const mirroredStatements =
      before.kind === "statement" && section.kind === "statement" && before.photoSide !== section.photoSide;
    return before.kind === "hero" || before.register !== section.register || section.seamStrokes > 0 || mirroredStatements;
  },
  rule5: (sections, i) => {
    if (i === 0) return true;
    const [before, section] = [sections[i - 1], sections[i]];
    if (before.kind !== section.kind) return true;
    const mirrored = section.kind === "statement" && before.photoSide !== section.photoSide;
    return mirrored && sections[i - 2]?.kind !== section.kind;
  },
};

for (const route of READER_ROUTES) {
  for (const locale of ["ar", "en"] as const) {
    for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
      test.describe(`the section reader: ${route} ${locale} ${viewport.width}x${viewport.height}`, () => {
        test.use({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
          hasTouch: viewport.isMobile,
          reducedMotion: "reduce",
        });

        test("reads the hero, the pictures offered as content, and side-by-side panels as one band", async ({ page }) => {
          await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
          await page.evaluate(() => document.fonts.ready);
          const sections = await readSections(page);
          // Read here on their own, not through the reader under test.
          const facts = await page.evaluate(() => {
            const top = [...document.querySelectorAll<HTMLElement>("main section")].filter(
              (section) => !section.parentElement?.closest("section"),
            );
            const name = (section: Element) => section.getAttribute("aria-labelledby") ?? "(unnamed)";
            const span = (section: Element) => {
              const box = section.getBoundingClientRect();
              return { top: box.top + scrollY, bottom: box.bottom + scrollY };
            };
            const sideBySide: [string, string][] = [];
            top.forEach((a, i) =>
              top.slice(i + 1).forEach((b) => {
                const [x, y] = [span(a), span(b)];
                if (Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1) sideBySide.push([name(a), name(b)]);
              }),
            );
            const hero = top.find((section) => section.querySelector("h1"));
            return {
              hero: hero ? name(hero) : null,
              sideBySide,
              contentImages: [...document.querySelectorAll("main img")].filter(
                (image) => image.getAttribute("alt") && !image.closest('[aria-hidden="true"]'),
              ).length,
            };
          });
          test.info().annotations.push({ type: "sections", description: JSON.stringify(sections) });
          test.info().annotations.push({ type: "facts", description: JSON.stringify(facts) });

          expect(facts.hero, "a section holds the page's h1").not.toBeNull();
          expect(
            sections.filter((section) => section.kind === "hero").map((section) => section.id),
            "one hero: the section that holds the h1",
          ).toEqual([facts.hero]);
          expect(sections[0].kind, "the hero is read first").toBe("hero");
          expect(
            sections.reduce((sum, section) => sum + section.photographs, 0),
            "pictures are counted where the page offers them as content, not icons hidden from assistive technology",
          ).toBe(facts.contentImages);
          for (const [a, b] of facts.sideBySide) {
            expect(
              sections.some((section) => section.id.split(" + ").includes(a) && section.id.split(" + ").includes(b)),
              `${a} and ${b} stand side by side, so they are read as one band`,
            ).toBe(true);
          }
        });
      });
    }
  }
}

for (const plan of ROUTES) {
  const { route } = plan;
  for (const locale of ["ar", "en"] as const) {
    for (const viewport of VIEWPORTS) {
      test.describe(`${route} ${locale} ${viewport.width}x${viewport.height}`, () => {
        test.use({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
          hasTouch: viewport.isMobile,
          reducedMotion: "reduce",
        });

        test("rule 4: numbered items read in the page's direction, row after row", async ({ page }) => {
          await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
          await page.evaluate(() => document.fonts.ready);

          const lists = await page.evaluate(() =>
            [...document.querySelectorAll<HTMLOListElement>("main ol")]
              .filter((list) => list.querySelector(":scope > li [data-item-number]"))
              .map((list) => ({
                field: list.dataset.field ?? "ol",
                rtl: getComputedStyle(list).direction === "rtl",
                items: [...list.querySelectorAll<HTMLElement>(":scope > li")].map((item) => {
                  const box = item.getBoundingClientRect();
                  return {
                    number: item.querySelector("[data-item-number]")?.textContent ?? "",
                    left: box.left,
                    right: box.right,
                    top: box.top,
                  };
                }),
              })),
          );
          test.info().annotations.push({ type: "numbered lists", description: JSON.stringify(lists) });
          // A run that finds no list measures nothing and would pass; a page
          // that should have none must not grow one unmeasured.
          expect(lists.length > 0, "a numbered list was found to measure, where the page has one").toBe(plan.numbered);

          for (const list of lists) {
            expect(list.rtl, `${list.field}: the list takes the page's direction`).toBe(locale === "ar");
            const inDocument = list.items.map((item) => item.number);
            expect(inDocument, `${list.field}: numbered 01, 02, … in document order`).toEqual(
              list.items.map((_, index) => String(index + 1).padStart(2, "0")),
            );
            // Rows first (a 2px tolerance for subpixel tops), then the reading
            // direction inside a row: from the right in Arabic, the left in English.
            const onScreen = [...list.items]
              .sort((a, b) =>
                Math.abs(a.top - b.top) > 2 ? a.top - b.top : list.rtl ? b.right - a.right : a.left - b.left,
              )
              .map((item) => item.number);
            expect(onScreen, `${list.field}: the eye meets them in their order`).toEqual(inDocument);
          }
        });

        test("rules 1, 3 and 5: identity per section, marked seams, a varied rhythm", async ({ page }) => {
          await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
          await page.evaluate(() => document.fonts.ready);
          const sections = await readSections(page);
          test.info().annotations.push({ type: "sections", description: JSON.stringify(sections) });
          test.info().annotations.push({
            type: "rule 2: read each picture with its alternative text",
            description: JSON.stringify(
              await page.locator("main img").evaluateAll((images) =>
                images.map((image) => ({ src: (image as HTMLImageElement).src.split("/").pop(), alt: image.getAttribute("alt") })),
              ),
            ),
          });

          expect(sections.length, "the page's sections were found").toBeGreaterThanOrEqual(plan.minimumSections);
          test.skip(!plan.published.holds(sections), plan.published.reason);

          const pending = PENDING[route] ?? {};
          const violations: string[] = [];
          const fixed: string[] = [];
          for (const rule of Object.keys(passes) as Rule[]) {
            sections.forEach((section, index) => {
              const broken = !passes[rule](sections, index);
              const held = heldAt(pending[section.id]?.[rule], viewport.width);
              if (broken && !held) violations.push(`${rule}: ${section.id} (${section.kind})`);
              if (!broken && held) fixed.push(`${rule}: ${section.id} passes now; remove it from PENDING`);
            });
          }
          expect(violations, "sections that break a rule").toEqual([]);
          expect(fixed, "pending findings that no longer break their rule").toEqual([]);
        });

        // Rule 3 as ADR-0075 M0-A reads it: the seam is marked in every colour
        // list. A register change counts where the two grounds measure 1.4:1
        // apart, and in high contrast — where every register is white — only
        // with a drawn edge at 3:1 against both grounds. Strokes placed below
        // the seam (M0-B) must stand wholly on the later section and clear 3:1
        // on its ground. Measured at this viewport in the three lists, on the
        // published composition only.
        if (viewport.width === 1440) {
          for (const theme of THEMES) {
            test(`rule 3 in ${theme}: every seam is marked, and strokes below a seam stand on their section at 3:1`, async ({ page }) => {
              await page.addInitScript((stored) => window.localStorage.setItem("uaeaf-theme", stored), theme);
              await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
              await page.evaluate(() => document.fonts.ready);
              expect(await page.evaluate(() => document.documentElement.dataset.theme), "the theme is stamped").toBe(theme);

              const sections = await readSections(page);
              test.skip(!plan.published.holds(sections), plan.published.reason);

              const seams = await readSeams(page);
              test.info().annotations.push({ type: `seams in ${theme}`, description: JSON.stringify(seams) });
              expect(seams.length, "seams were found to measure").toBe(sections.length - 1);

              const unmarked = seams
                .filter(
                  (seam) =>
                    !(
                      seam.beforeKind === "hero" ||
                      seam.seamStrokes > 0 ||
                      seam.mirrored ||
                      seam.groundContrast >= GROUND_FLOOR ||
                      (seam.edgeContrast ?? 0) >= EDGE_FLOOR
                    ),
                )
                .map((seam) => `${seam.id}: grounds ${seam.groundContrast}, edge ${seam.edgeContrast ?? "none"}`);
              expect(unmarked, "seams with no visible separator in this list").toEqual([]);

              for (const seam of seams.filter((s) => s.below)) {
                expect(seam.below!.strokes, `${seam.id}: strokes below the seam were measured`).toBeGreaterThan(0);
                expect(seam.below!.onSection, `${seam.id}: every stroke point stands on the later section`).toBe(true);
                expect(seam.below!.strokeContrast, `${seam.id}: the strokes' worst contrast on the section's ground`).toBeGreaterThanOrEqual(EDGE_FLOOR);
              }
            });
          }
        }

        test("rule 6: every picture offered as content carries an alternative text in the page's language", async ({ page }) => {
          await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
          const pictures = await page.locator("main img").evaluateAll((images) =>
            images
              .filter((image) => !image.closest('[aria-hidden="true"]'))
              .map((image) => ({ src: (image as HTMLImageElement).src.split("/").pop() ?? "", alt: image.getAttribute("alt") ?? "" })),
          );
          test.info().annotations.push({ type: "pictures", description: JSON.stringify(pictures) });

          const arabic = /\p{Script=Arabic}/u;
          for (const picture of pictures) {
            expect(picture.alt.trim(), `${picture.src}: an alternative text`).not.toBe("");
            if (locale === "ar") {
              expect(arabic.test(picture.alt), `${picture.src}: "${picture.alt}" is written in Arabic`).toBe(true);
            } else {
              expect(
                !arabic.test(picture.alt) && /\p{Script=Latin}/u.test(picture.alt),
                `${picture.src}: "${picture.alt}" is written in English`,
              ).toBe(true);
            }
          }
        });
      });
    }
  }
}
