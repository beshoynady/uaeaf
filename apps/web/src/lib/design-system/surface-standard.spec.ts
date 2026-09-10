import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "@uaeaf/design-tokens/testing";

/**
 * One raised surface, defined once.
 *
 * Before this rule the application carried four different answers to the same
 * question. `ui/Card` drew `--color-border-default`; the contact hero card drew
 * `--color-border-strong`; the form and map panels drew `--color-border-default`
 * over `--elevation-dropdown`; and the hover response existed twice — once as
 * `.lift` (ADR-0065 D5, a 4px rise along the ascent vector with a cross-faded
 * elevation) and once as a hand-written 2px translate inside `Card`. None of
 * them was wrong on its own page, and together they were the reason a reader
 * moving between pages could not tell what a raised object looks like here.
 *
 * These rules do not decide the values — `ui/surface.ts` does, from tokens.
 * What they enforce is that there is exactly one place where that decision is
 * made, and that a page component cannot quietly make a fifth.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SURFACE = join(SRC, "components", "ui", "surface.ts");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx$/.test(entry) && !/\.(spec|test)\.tsx$/.test(entry) ? [full] : [];
  });
}

/** The surfaces the standard governs: cards and panels in the content flow.
 *
 *  Floating chrome — the navigation's own popover layers — is deliberately
 *  outside it. Chapter 3 §3 lists the header among the areas not to redesign
 *  without evidence of a defect, and a menu that appears above the page is a
 *  different object from a card that sits in it. Named by directory rather
 *  than by pattern so nothing drifts in by accident. */
const GOVERNED = [join(SRC, "components", "pages"), join(SRC, "components", "ui")];

const FILES = GOVERNED.flatMap(sourceFiles).map((file) => ({
  file: file.replace(SRC, "src").split("\\").join("/"),
  source: stripComments(readFileSync(file, "utf-8")),
}));

describe("the raised-surface standard", () => {
  const standard = stripComments(readFileSync(SURFACE, "utf-8"));

  it("finds components to check, so the rules below cannot pass vacuously", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(10);
  });

  it("draws every raised surface with a readable edge", () => {
    // `--color-border-default` measures 1.15:1 against `--color-surface-raised`
    // in the light theme — an edge that exists in the stylesheet and not on
    // the screen, which is what made the cards read as bodiless. The token
    // system already ships the answer: `strong` is the edge of an object,
    // `default` and `subtle` are for rules and dividers between things that
    // are not objects.
    // Judged per class string, not per file. A section rule drawn in
    // `default` above a card drawn in `strong` is correct — `default` is for
    // lines *between* things — and a file-level match would report that as a
    // violation while a real one hid behind an import.
    const offenders: string[] = [];
    for (const { file, source } of FILES) {
      for (const [, value] of source.matchAll(/className=[{`"]([^"`]*)/g)) {
        if (/--color-surface-raised/.test(value) && /--color-border-default/.test(value)) {
          offenders.push(`${file}: ${value.slice(0, 70)}…`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the recipes in one module rather than in the components", () => {
    // A page component composing its own border + ground + elevation string is
    // how the four variants happened. It may use the recipe, extend it, or
    // override one property — it may not restate the whole thing.
    const offenders = FILES.filter(
      ({ file, source }) =>
        file !== "src/components/ui/surface.ts" &&
        /bg-\[color:var\(--color-surface-raised\)\][^"`]*\bborder\b|\bborder\b[^"`]*bg-\[color:var\(--color-surface-raised\)\]/.test(
          source,
        ) &&
        !/from "@\/components\/ui\/surface"/.test(source),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("has exactly one definition of the hover response", () => {
    // `.lift` is that definition (ADR-0065 D5). A second implementation is not
    // a duplicate of a style — it is a second answer to "how far does a card
    // rise", and the two were 2px and 4px.
    const offenders = FILES.filter(({ source }) =>
      /hover:-?translate-[xy]-/.test(source),
    ).map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("builds the recipes from tokens and from nothing else", () => {
    // Every colour, radius and elevation in the standard must be a custom
    // property. A literal here would become the site-wide literal.
    const literals = [...standard.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgb\(|\brgba\(/g)].map(
      (match) => match[0],
    );
    expect(literals).toEqual([]);

    for (const token of [
      "--color-border-strong",
      "--color-surface-raised",
      "--elevation-card",
      "--radius-md",
      "--radius-lg",
    ]) {
      expect(standard, `${token} is not part of the standard`).toContain(token);
    }
  });

  it("gives the heroes one composition", () => {
    // The gain kept from the experiment: the title block holds the reading
    // edge and the motif answers it from the opposite side, anchored to the
    // same baseline. A centred stack is the arrangement every contact page
    // already has; it said nothing about this one, and it made this page the
    // only one of twelve that did not look like the others.
    //
    // Checked on the class string that carries the heading's own type role,
    // not on the file: an earlier version of this rule matched `items-center`
    // anywhere in the file and flagged the contact card, whose *content* is
    // legitimately centred. A rule that reports the wrong element is a rule
    // nobody will believe the second time.
    for (const hero of [
      "src/components/ui/page-hero.tsx",
      "src/components/pages/contact/contact-hero.tsx",
    ]) {
      const source = FILES.find(({ file }) => file === hero)?.source;
      expect(source, `${hero} is missing`).toBeDefined();
      expect(source, `${hero} does not use the shared hero composition`).toContain(
        "HERO_COMPOSITION",
      );
      expect(source, `${hero} does not use the shared title column`).toContain("HERO_TEXT");

      const headings = [...source!.matchAll(/className=[{`"]([^"`]*text-(?:display|h1)[^"`]*)/g)];
      expect(headings.length, `${hero} has no page heading`).toBeGreaterThan(0);
      for (const [, value] of headings) {
        expect(value, `${hero} centres its page heading`).not.toContain("text-center");
      }
    }
  });

  it("keeps a pressed state beside every hover in the standard", () => {
    // `interaction-state-contract.spec.ts` reads `.tsx` files and resolves the
    // constants inside them, so a state that moves into this `.ts` module
    // leaves its coverage behind. Hover is mouse-only feedback and this layer
    // is mobile-priority (PR-006): a control that lights up under a pointer
    // and does nothing when pressed reads as broken on touch.
    const hovers = [...standard.matchAll(/hover:([\w[\]:().,%\-]+)/g)];
    expect(hovers.length).toBeGreaterThan(0);
    for (const [, property] of hovers) {
      const root = property.split("-")[0];
      expect(standard, `hover:${property} has no pressed counterpart`).toMatch(
        new RegExp(`active:${root}`),
      );
    }
  });
});

/** The declaration block a CSS selector opens, found by name rather than by a
 *  regex that has to guess where the rule ends. */
function ruleFor(css: string, selector: string): string {
  const at = css.indexOf(selector);
  if (at === -1) return "";
  const open = css.indexOf("{", at);
  return css.slice(at, css.indexOf("}", open) + 1);
}

describe("the interaction standard", () => {
  const standard = stripComments(readFileSync(SURFACE, "utf-8"));
  const motion = readFileSync(join(SRC, "styles", "motion.css"), "utf-8");

  it("times a hover at the rung Chapter 5 §5.6 maps to hover", () => {
    // §5.6's table is explicit: INSTANT (100ms) is "Simple Hover"; FAST
    // (150ms) is "Focus, Toggle". The lift shipped on FAST — the wrong rung,
    // and invisible as a defect because both rungs are tokens.
    // The transform transition lives in the second `.lift {` block, inside
    // the reduced-motion guard — `ruleFor` finds the first, which carries
    // only position and elevation. Ask for the declaration by what it
    // declares, not by the order it happens to appear in.
    // Scoped to `.lift`, which is the hover. A page transition and a nav
    // panel also transition a transform and are mapped to other rungs — a
    // rule that demanded INSTANT everywhere would be enforcing the opposite
    // of §5.6's table.
    const block = motion.slice(motion.indexOf("@media (prefers-reduced-motion: no-preference) {", motion.indexOf(".lift {")));
    const rule = block.slice(0, block.indexOf(".lift:hover,"));
    expect(rule, "the lift declares no transform transition").toContain("transition: transform");
    expect(rule, "a hover is timed off Chapter 5 §5.6's hover rung").toContain(
      "--motion-duration-instant",
    );
  });

  it("keeps the ascent vector on the entrance and off the hover", () => {
    // ADR-0059 §D7 fixes the identity's angle at 45°, and §D7.1 forbids
    // mirroring "motion derived from The Rise" — which is the entrance. It
    // does not require every interaction to travel that vector, and on a grid
    // the horizontal half of a diagonal breaks the row's alignment: the eye
    // reads the row as jittering rather than the card as rising. Under RTL,
    // where the vector must not mirror, the card drifts toward the end of the
    // line — away from the reading edge, the opposite of coming forward.
    expect(motion, "the entrance no longer travels the ascent vector").toContain(
      "--motion-ascent-offset",
    );
    const hover = ruleFor(motion, ".lift:hover,");
    expect(hover, "the lift declares no hover state").not.toEqual("");
    expect(hover, "the hover still travels diagonally").not.toContain("translate(calc");
    expect(hover, "the hover no longer rises").toContain("translateY");
  });

  it("answers a hover on the edge and the icon, not on the shadow alone", () => {
    // A card that changes only its depth is read by its shadow — the one
    // signal a low-vision reader is least likely to see. Three coordinated
    // signals make the whole card one interactive unit.
    expect(standard, "no interactive edge in the standard").toContain("CARD_INTERACTIVE");
    expect(standard, "no icon treatment in the standard").toContain("CARD_ICON");
    expect(motion, "the icon does not answer the card's hover").toContain(".lift:hover .card-icon");
  });

  it("animates nothing that forces layout", () => {
    // ADR-0009 and Chapter 5 §5.6. Colour is not motion, so `transition-colors`
    // stays legal; a transition on a box property does not.
    const offenders = [...motion.matchAll(/transition:([^;]+);/g)]
      .map((m) => m[1])
      .filter((v) => /(width|height|top|left|right|bottom|margin|padding|inset)/.test(v));
    expect(offenders).toEqual([]);
  });
});

describe("the layout standard", () => {
  const standard = stripComments(readFileSync(SURFACE, "utf-8"));

  it("makes two panels in a row equal in height", () => {
    // Not alignment for its own sake: a row whose panels end at different
    // heights reads as one of them being unfinished. The slack is absorbed by
    // the element that can use it — the map grows, the message box grows —
    // never by empty padding.
    expect(standard).toContain("PANEL_ROW");
    expect(standard).toContain("PANEL_FILL");
    expect(standard).toContain("items-stretch");
  });

  it("sizes a hero to the screen minus the header, in a unit that survives a phone", () => {
    // `vh` on a phone measures the viewport with the browser chrome hidden,
    // so a `100vh` hero is taller than the screen the reader is looking at
    // until they scroll. `svh` is the small viewport — chrome shown — which
    // is what "fills the first screen" has to mean.
    //
    // The header is `h-24`: a fixed 96px that never shrinks, so the hero is
    // the screen minus one spacing token rather than minus a literal.
    expect(standard).toContain("HERO_VIEWPORT");
    expect(standard).toContain("100svh");
    expect(standard, "the hero height is not derived from a token").toContain("var(--space-24)");
    const bareVh = /[^s]\b\d+vh\b/.test(standard);
    expect(bareVh, "a bare vh unit does not survive a phone's browser bars").toBe(false);
  });
});
