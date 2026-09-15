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

const PENDING: Record<string, Record<string, Partial<Record<Rule, string>>>> = {
  "/about/governance/vision-mission": {},
  // ADR-0074 D8: calibration findings no existing component fixes, presented to the owner.
  "/about/president": {
    "(unnamed)": {
      rule1: "the message after the green portrait hero: seam lines there would stand half on the green register, where their green and red measure under 3:1",
    },
    "vision-mission-cta-title": {
      rule1: "the call on the neutral ground after the green values band: no photograph field, and seam lines would cross that band",
    },
  },
  "/about/board-members": {
    "board-members-heading": {
      rule1: "the members' list after the green hero: seam lines would cross the green register, and the list has no photograph",
    },
  },
};

const VIEWPORTS = [
  { width: 1440, height: 900, isMobile: false },
  { width: 768, height: 1024, isMobile: true },
  { width: 390, height: 844, isMobile: true },
] as const;

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
              const held = pending[section.id]?.[rule];
              if (broken && !held) violations.push(`${rule}: ${section.id} (${section.kind})`);
              if (!broken && held) fixed.push(`${rule}: ${section.id} passes now; remove it from PENDING`);
            });
          }
          expect(violations, "sections that break a rule").toEqual([]);
          expect(fixed, "pending findings that no longer break their rule").toEqual([]);
        });

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
