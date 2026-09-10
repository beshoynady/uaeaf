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
