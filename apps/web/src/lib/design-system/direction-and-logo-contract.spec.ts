import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@uaeaf/design-tokens/testing";
import { sourceFiles } from "./source-files";

/**
 * Guards for four defects the owner found by looking at the running site on
 * 2026-09-08 — every one of them invisible to the existing suite, because each
 * is a *rendered* property (which side text lands on, which pixels a fill
 * resolves to) rather than a structural one.
 *
 * Sources are read as text, deliberately. jsdom has no layout engine and no
 * cascade for `[data-theme]`, so `getComputedStyle` there would answer from the
 * inline style attribute and tell us nothing. The live-browser sweep is what
 * proves the rendered result; these rules are what stop the source from
 * regressing back between sweeps.
 */

const WEB = join(__dirname, "..", "..", "..");

const read = (relative: string) => stripComments(readFileSync(join(WEB, relative), "utf8"));

const FOOTER = "src/components/layout/site-footer.tsx";
// `site-header.tsx` is a thin pass-through now; the header's actual markup —
// what these guards need to read — lives in `header-shell.tsx`.
const HEADER = "src/components/layout/header-shell.tsx";
const TOGGLE = "src/components/layout/language-switch.tsx";
const LOGO = "src/components/brand/uaeaf-logo.tsx";
const GLOBALS = "src/app/[locale]/globals.css";

describe("reading direction (Chapter 4 §4.11, Visual Protocol §RTL/LTR adaptation)", () => {
  /**
   * `end` is a logical value, so it *does* follow `dir` — into the wrong side.
   * Under `dir="rtl"` it resolves to the LEFT, so every Arabic column in the
   * footer hugged the left edge; under `dir="ltr"` it resolves to the RIGHT, so
   * the English footer hugged the right. Measured on the live build at 1440px:
   * the Arabic "Quick Links" heading sat at x=744 in a column spanning
   * 744–1036, and the English one at x=984 in a column spanning 744–1036 —
   * mirror images of each other, both against the reading direction.
   *
   * `start` is the value that means "where this language begins reading".
   */
  it.each([
    ["footer", FOOTER],
    ["header", HEADER],
  ])("%s aligns content to the reading start, never the reading end", (_name, file) => {
    const source = read(file);
    const offenders = [...source.matchAll(/(?:^|\s|:)((?:items|text|self|justify)-end)\b/g)].map(
      (m) => m[1],
    );
    expect(offenders).toEqual([]);
  });

  /**
   * The footer's brand swooshes carry two separate properties, and only one of
   * them is direction-invariant. The ANGLE must not mirror (ADR-0059 §D7.1 —
   * the ascent vector is brand geometry), and `rotate` is a physical transform,
   * so it never does. The PLACEMENT belongs to the composition, and the
   * composition mirrors with its columns: pinned to physical left/right, the
   * green swoosh crossed the English "UAE Athletics Federation" heading by
   * 152px and its description by 171px.
   */
  it("places the footer's brand art with logical insets and rotates it physically", () => {
    const source = read(FOOTER);
    const start = source.indexOf("const decorations");
    // `];` and not `]` — every inset value is itself an arbitrary-value
    // bracket, so the first `]` lands inside `end-[-30px]`.
    const decorations = source.slice(start, source.indexOf("];", start));
    expect(decorations).toMatch(/start-\[/);
    expect(decorations).toMatch(/end-\[/);
    expect(decorations).not.toMatch(/(?:^|\s|")(?:left|right)-\[/);
    // …and the angle stays a physical transform, in the render, not the data.
    expect(source).toMatch(/-rotate-35/);
    expect(source).not.toMatch(/rtl:-?rotate|ltr:-?rotate|scale-x-\[-1\]/);
  });

  /**
   * The artwork's sizes are fixed pixels composed against the 1440px frame
   * while the columns shrink with the viewport, so below `xl` the text reaches
   * it: at 1024px the white swoosh ran through the words "Asian Athletics" —
   * white art under white text, two words simply gone. No frame exists for a
   * small-screen treatment, so it is not drawn there rather than invented
   * (CLAUDE.md §13).
   */
  it("draws the brand art only from the band where it clears the text", () => {
    const source = read(FOOTER);
    const decorationEl = source.slice(source.indexOf("data-decorative"), source.indexOf("data-decorative") + 400);
    expect(decorationEl).toMatch(/(?:^|\s|`)hidden(?:\s|`)/);
    expect(decorationEl).toMatch(/xl:block/);
  });

  it("keeps direction derived from the document, not from a hardcoded locale check", () => {
    // §4.11's architectural MUST: no text in the code may assume a fixed
    // language. A `locale === "ar" ? ... : ...` in a layout class is exactly
    // the assumption it forbids — CSS logical properties already do this.
    for (const file of [FOOTER, HEADER, TOGGLE]) {
      expect(read(file)).not.toMatch(/locale\s*===\s*["'](?:ar|en)["']\s*\?/);
    }
  });
});

describe("logo on dark grounds (Chapter 1 ADR-0002)", () => {
  /**
   * ADR-0002 is Accepted and unambiguous: "In Dark Mode, the white monochrome
   * logo is used exclusively." The header shipped the full-colour mark in every
   * theme, so its five wordmark paths resolved to `--color-brand-black`
   * (`#000000`, theme-invariant in `base.css`) on the dark theme's
   * `--color-surface-base` (`#131210`) — measured 1.12:1. The mark was not
   * merely low-contrast, it was gone.
   */
  it("binds every colour fill to a theme-switchable custom property", () => {
    const source = read(LOGO);
    const fills = [...source.matchAll(/fill=\{[^}]*\}/g)].map((m) => m[0]);
    expect(fills.length).toBeGreaterThanOrEqual(9);
    for (const fill of fills) {
      // The brand tokens are theme-invariant by design (they are the Pantone
      // values). Referencing them directly is what froze the mark black.
      expect(fill).not.toMatch(/--color-brand-(?:black|primary|secondary)\b/);
      expect(fill).toMatch(/currentColor|--logo-(?:ink|green|red)\b/);
    }
  });

  it("resolves all three logo inks to the monochrome mark under the dark theme", () => {
    const css = readFileSync(join(WEB, GLOBALS), "utf8");
    // The block that declares the inks, as `rootBlock` below finds its own:
    // globals.css has more than one dark block (`color-scheme` has its own).
    const darkBlock = css.match(/\[data-theme="dark"\]\s*\{([^}]*--logo-ink[^}]*)\}/);
    expect(darkBlock, "globals.css declares no [data-theme=\"dark\"] block").not.toBeNull();
    for (const ink of ["--logo-ink", "--logo-green", "--logo-red"]) {
      expect(darkBlock![1]).toMatch(new RegExp(`${ink}\\s*:\\s*currentColor`));
    }
    // …and the full-colour mark stays the default, so light and high-contrast
    // (both of which paint a white ground) are untouched.
    const rootBlock = css.match(/:root\s*\{([^}]*--logo-ink[^}]*)\}/);
    expect(rootBlock).not.toBeNull();
    expect(rootBlock![1]).toMatch(/--logo-ink\s*:\s*var\(--color-brand-black\)/);
    expect(rootBlock![1]).toMatch(/--logo-green\s*:\s*var\(--color-brand-primary\)/);
    expect(rootBlock![1]).toMatch(/--logo-red\s*:\s*var\(--color-brand-secondary\)/);
  });

  it("still forbids the misuse §9.1 lists, on the mark itself", () => {
    const source = read(LOGO);
    expect(source).not.toMatch(/preserveAspectRatio/);
    expect(source).not.toMatch(/drop-shadow|box-shadow|rotate-/);
  });
});

describe("primary navigation row (Chapter 5 §5.2)", () => {
  /**
   * The threshold has moved twice, and both times because someone measured
   * only one language. `xl` was derived from Arabic alone (903px of links);
   * English wanted 1098px, so the row overlapped the utility cluster at 1280,
   * 1366 and 1440 and ADR-0061 §D6 pushed it out to `2xl`. Regrouping nine
   * flat items into eight with three disclosure panels (ADR-0062) cut the
   * English row to 863px, and `xl` fits again — measured on the live build at
   * 1280 with a real scrollbar: 911px of room against 863px wanted, 48px
   * spare, in a viewport of 1265 usable pixels.
   *
   * So the rule below is not "use band X". It is that ONE number decides,
   * and every place that number appears agrees with it.
   */
  const NAV = "src/components/layout/primary-nav.tsx";

  it("keeps the JS media query, the CSS variant and the token on one threshold", () => {
    const source = read(NAV);
    const declared = Number(source.match(/NAV_ROW_BREAKPOINT = (\d+)/)?.[1]);
    expect(declared).toBe(1280);

    // The token the Tailwind variant resolves to must be the same number: a
    // `xl:` class and a `matchMedia(1280)` that disagree would open panels on
    // hover at a width with no row to hover over.
    const tokens = readFileSync(
      join(WEB, "..", "..", "packages", "design-tokens", "build", "css", "base.css"),
      "utf8",
    );
    const breakpoint = tokens.match(/--breakpoint-xl:\s*(\d+)px/)?.[1];
    expect(Number(breakpoint)).toBe(declared);

    // …and the classes use that band, not a different one.
    expect(source).toMatch(/xl:flex-row/);
    expect(source).not.toMatch(/2xl:(?:flex-row|static|block)/);
  });

  it("shows the row and the drawer trigger at exactly the same width", () => {
    // A band with both, or with neither, is the defect the previous two
    // thresholds each produced at one end.
    expect(read(NAV)).toMatch(/xl:static/);
    expect(read(HEADER)).toMatch(/xl:hidden/);
  });

  it("يرسم الخط النشط من تدرج الهوية لا من لون مفرد", () => {
    const source = read("src/components/layout/mega/tricolor-indicator.tsx");
    // The tricolour gradient resolves to an invalid value unless it is
    // redeclared on the element that paints it (surfaces.css §"[data-surface]").
    expect(source).toMatch(/data-surface/);
    expect(source).toMatch(/var\(--brand-tricolor\)/);
    expect(source).toMatch(/var\(--border-width-ring\)/);
    expect(source).not.toMatch(/--color-brand-primary/);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  /**
   * jsdom applies no stylesheet, so the indicator's own render test can only
   * see `data-state`, never whether `:hover`/`:focus-visible` would have
   * drawn it. This is the guard for that half: the underline rule may key
   * off the active page or an open panel, never a bare hover or focus state,
   * which would show two tricolour bars at once.
   */
  it("draws the nav indicator from the active page or an open panel, never from hover or focus alone", () => {
    const source = read("src/styles/motion.css");
    expect(source).not.toMatch(/\.nav-item:hover \.nav-indicator/);
    expect(source).not.toMatch(/\.nav-item:focus-visible \.nav-indicator/);
    expect(source).toMatch(/\.nav-item\[aria-expanded="true"\] \.nav-indicator/);
  });
});

describe("language toggle", () => {
  /**
   * The control read "AR | EN" in both locales: it named the language you are
   * already in as well as the one you would get, so it read as a status label
   * rather than an action, and neither half was marked up in its own language.
   * A switcher names its destination — and names it in that destination's own
   * script, which is the one convention a reader who cannot read the current
   * page can still follow.
   */
  it("names only the destination language, in that language's own script", () => {
    const source = read(TOGGLE);
    expect(source).not.toMatch(/AR\s*\|\s*EN/);
    expect(source).toMatch(/LOCALE_ENDONYM\[/);
    // The `lang` attribute is what stops a screen reader announcing "العربية"
    // with an English voice, and what lets the Arabic face be used for it.
    expect(source).toMatch(/lang=\{/);
  });
});

describe("reduced motion targets classes a component actually carries (Chapter 5 §5.8)", () => {
  const MOTION = "src/styles/motion.css";

  /**
   * The block itself, isolated by its own `@media` line so a match inside it
   * cannot be confused with an unrelated rule elsewhere in the file.
   */
  const reducedMotionBlock = () => {
    const source = read(MOTION);
    const start = source.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(start, "no reduced-motion block in motion.css").toBeGreaterThan(-1);
    const end = source.indexOf("\n}", start);
    return source.slice(start, end);
  };

  /**
   * True once some component's JSX carries `className` a plain `.name`
   * selector can match.
   *
   * `xl:nav-float` compiles to the escaped selector `.xl\:nav-float`, which
   * exists only inside a `min-width` media query — a bare `.nav-float` rule
   * can never match it at any breakpoint. The lookbehind excludes exactly
   * that case: a name preceded by `:` (a variant prefix) or another word
   * character (a longer class this name is only a substring of) does not
   * count as the class being carried bare.
   */
  const carriedBare = (className: string) => {
    const pattern = new RegExp(`(?<![:\\w-])${className}(?![\\w-])`);
    return sourceFiles()
      .filter((path) => path.endsWith(".tsx"))
      .some((path) => pattern.test(stripComments(readFileSync(path, "utf-8"))));
  };

  it("carries no selector for a class no component applies bare", () => {
    const block = reducedMotionBlock();
    const classNames = [...new Set([...block.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]))];
    // The assertion that keeps this guard honest: it must find classes to
    // check, or "no orphans" would be true because nothing was examined.
    expect(classNames.length).toBeGreaterThan(0);
    const orphaned = classNames.filter((name) => !carriedBare(name));
    expect(orphaned).toEqual([]);
  });

  it("still covers the floating panel, through the class it actually renders", () => {
    const block = reducedMotionBlock();
    // `.nav-panel` guarded a second, nested floating level that no longer
    // exists: the tree has one disclosure level now, and its nested group is
    // a column inside `MegaPanel`, not a floating panel of its own — so
    // `.mega-panel` is the only floating-panel class left to cover.
    expect(block).toMatch(/\.mega-panel\b/);
    expect(block).not.toMatch(/\.nav-panel\b/);
    // `nav-float` only ever appears as `xl:nav-float` in component source, so
    // a bare `.nav-float` rule here would be dead on arrival — the defect
    // this guard exists to catch.
    expect(block).not.toMatch(/(?<![:.\w-])nav-float\b/);
  });
});
