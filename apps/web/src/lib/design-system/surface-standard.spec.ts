import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, themeTokens } from "@uaeaf/design-tokens/testing";

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

/** Where the shared field and pointer stylesheets live now — outside this
 *  application, so both surfaces read the same one. */
const SHARED_CSS = join(SRC, "..", "..", "..", "packages", "design-tokens", "css");
/** Comments blanked rather than deleted, so a rule's prose can never be
 *  mistaken for the rule — two of the guards below reported their own
 *  explanation of what they forbid, which is the guard failing on itself. */
const css = (file: string) =>
  readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, (block) =>
    block.replace(/[^\n]/g, " "),
  );

const FORMS = css(join(SHARED_CSS, "forms.css"));
const INTERACTION = css(join(SHARED_CSS, "interaction.css"));
const MOTION = css(join(SRC, "styles", "motion.css"));

const px = (value: string) => Number.parseFloat(value);

describe("the lift's scale is bounded, not chosen (ADR-0067)", () => {
  const tokens = themeTokens("light");
  const scale = Number(tokens["--motion-lift-scale"]);
  const rise = px(tokens["--motion-ascent-offset"]) / 4;
  const hairline = px(tokens["--border-width-default"]);

  /**
   * Every width the standard actually produces a lifting surface at.
   *
   * 358px — a card stacked on a 390px phone inside `px-4`.
   * 294px — the contact hero's card at `xl`: (1248 - 3x24) / 4.
   * 600px — half of the 1248px panel row, the widest `.lift` can reach.
   */
  const WIDTHS = [358, 294, 600];

  it("declares the token, so nothing has to guess a magnitude", () => {
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThan(1);
  });

  it.each(WIDTHS)("moves an edge further than a hairline at %ipx", (width) => {
    // Below the border's own width the growth cannot be resolved as depth —
    // it is a subpixel nobody sees, and the token would be decoration.
    expect((width * (scale - 1)) / 2).toBeGreaterThan(hairline);
  });

  it.each(WIDTHS)("moves an edge less than the rise at %ipx", (width) => {
    // The failure this bound exists for: a card whose edges travel further
    // sideways than the card rises reads as the *row* jittering rather than
    // the card coming forward — the exact reason ADR-0066 D3 took the
    // horizontal half off the hover in the first place.
    expect((width * (scale - 1)) / 2).toBeLessThan(rise);
  });

  it("actually applies the token on the hover, rather than only declaring it", () => {
    const hover = MOTION.slice(MOTION.indexOf(".lift:hover,"));
    expect(hover).toMatch(/scale\(var\(--motion-lift-scale\)\)/);
    expect(hover).toMatch(/translateY\(calc\(-1 \* var\(--motion-ascent-offset\) \/ 4\)\)/);
  });
});

describe("the opening sequence", () => {
  const standard = stripComments(readFileSync(SURFACE, "utf-8"));
  const tokens = themeTokens("light");

  const stage = Object.fromEntries(
    [...standard.slice(standard.indexOf("export const HERO_STAGE"))
      .slice(0, 400)
      .matchAll(/(\w+):\s*(\d+)/g)].map(([, name, value]) => [name, Number(value)]),
  );

  it("orders the ground, the heading, the line under it, then the cards", () => {
    expect(stage.ground).toBe(0);
    expect(stage.title).toBeGreaterThan(stage.ground);
    expect(stage.subtitle).toBeGreaterThan(stage.title);
    expect(stage.motif).toBeGreaterThan(stage.subtitle);
    expect(stage.card).toBeGreaterThan(stage.motif);
  });

  it("keeps the whole sequence inside Chapter 5 §5.7's 600ms ceiling", () => {
    // Four cards is what the contact hero puts after `card`, and it is the
    // longest opening the standard has to carry.
    const last = stage.card + 3;
    const step = px(tokens["--motion-ascent-stagger"]);
    expect(last * step).toBeLessThanOrEqual(600);
  });

  it("gives the ground no delay at all, because it is the stage", () => {
    // A photograph at `opacity: 0` is not a painted element, so fading the
    // hero image in would push LCP out by the length of the fade. It settles
    // by transform instead, and it starts immediately.
    const ground = MOTION.slice(MOTION.indexOf(".rise-ground"), MOTION.indexOf(".rise-ground") + 300);
    expect(ground).not.toMatch(/animation-delay/);
    expect(MOTION.slice(MOTION.indexOf("@keyframes uaeaf-rise-ground"))).not.toMatch(
      /^[\s\S]{0,200}opacity/,
    );
  });
});

describe("scroll-driven motion cannot strand what is already on screen", () => {
  it("bounds every reveal inside its entry phase", () => {
    // `entry 10% cover 30%` is what shipped, and `cover` spans the entire
    // time any part of an element is visible — so anything tall, or anything
    // already in view at first paint, parked near zero progress and held
    // there. An element in view has finished `entry` by definition, so an
    // `entry`-bounded range resolves to the end keyframe instead.
    const ranges = [...MOTION.matchAll(/animation-range:\s*([^;]+);/g)].map((match) =>
      match[1].trim(),
    );
    expect(ranges.length).toBeGreaterThan(0);

    for (const range of ranges) {
      // A `scroll()` timeline's range is measured from the scroller's origin
      // and has no phase names; only `view()` ranges name phases, and those
      // are the ones that can strand an element.
      if (!/\b(entry|exit|cover|contain)\b/.test(range)) continue;
      expect(range, `"${range}" reaches past the entry phase`).not.toMatch(
        /\b(cover|contain|exit)\b/,
      );
    }
  });

  it("keeps the parallax layer's travel inside the overhang it was given", () => {
    const tokens = themeTokens("light");
    const overhang = px(tokens["--space-20"]);
    const travel = px(tokens["--space-12"]);
    const settle = px(tokens["--motion-ascent-offset"]);

    // `HERO_PARALLAX` is `-inset-y-20`, so the layer overhangs the band by
    // `--space-20` at each edge. Even with the settle and the parallax at
    // full extent at once — which never happens, one finishes in 480ms and
    // the other needs a screen of scrolling — the picture still covers.
    const standard = stripComments(readFileSync(SURFACE, "utf-8"));
    expect(standard).toMatch(/HERO_PARALLAX[\s\S]{0,200}-inset-y-20/);
    expect(MOTION).toMatch(/uaeaf-parallax[\s\S]*?translateY\(var\(--space-12\)\)/);
    expect(travel + settle).toBeLessThanOrEqual(overhang);
  });

  it("reads the root scroller, not whichever ancestor happens to clip", () => {
    // The hero band carries `overflow: hidden`, which makes it a scroll
    // container. `scroll()` defaults to `nearest`, so the timeline would
    // attach to a container that never scrolls and hold progress at 0
    // forever — the layer simply would not move, and nothing would say so.
    const parallax = MOTION.slice(MOTION.indexOf(".hero-parallax"));
    expect(parallax).toMatch(/animation-timeline:\s*scroll\(root block\)/);
  });
});

describe("the notched label", () => {
  it("gives a select the same resting state as every other field", () => {
    // A select always has a value, so `:placeholder-shown` never matches one.
    // Its empty state is "the placeholder option is the checked one", which is
    // what this reads — and it must not depend on the control also carrying
    // `required`, or a select that forgot it floats its label forever.
    expect(FORMS).toMatch(/:has\(select\.field-control\):not\(:has\(option\[data-placeholder\]:checked\)\)/);
  });

  it("marks the placeholder explicitly rather than borrowing `disabled`", () => {
    // Twice now this control has been fixed by reaching for an attribute that
    // already meant something else. `hidden` is `display: none`; `disabled` is
    // named in the HTML Standard's "ask for a reset" step, which selects the
    // first option in tree order **that is not disabled**. Under either, a
    // required field answered its own question with whichever option happened
    // to be first — hidden at first paint by React's `defaultValue=""`, and
    // back the moment `form.reset()` ran after a successful send.
    //
    // So the resting state is keyed on an attribute no browser behaviour
    // reads, and no `<option>` in this application carries either trap.
    expect(FORMS).not.toMatch(/option\[value=""\]:(disabled|hidden)/);
    const offenders: string[] = [];
    let scanned = 0;
    for (const { file, source } of FILES) {
      for (const [tag] of source.matchAll(/<option\b[^>]*>/g)) {
        if (!/value=""/.test(tag)) continue;
        scanned += 1;
        if (/\b(hidden|disabled)\b/.test(tag)) offenders.push(`${file}: ${tag}`);
      }
    }
    // This rule's own regexes were, briefly, silently corrupted — `\b` written
    // through an escaping layer became a literal backspace byte, which still
    // compiles and still runs and matches nothing. A scan that finds no
    // candidates is indistinguishable from a scan that finds no defects, so
    // say which one this is.
    expect(scanned, "no placeholder option was scanned at all").toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("floats a select that arrives already answered", () => {
    // An empty value is not always an empty answer: "all statuses" and "no
    // linked person" are both `value=""` and both are real choices. Only a
    // marked placeholder counts as unanswered, or the label rests in the
    // middle of a field that is already showing a word.
    expect(FORMS).toMatch(/option\[data-placeholder\]/);
  });

  it("does not let a file input inherit the select's trap", () => {
    // `:placeholder-shown` cannot match `input[type="file"]` either, so
    // `:not(:placeholder-shown)` is vacuously true for one and the generic
    // clause floated its label by accident. Accidentally right is one
    // selector edit from accidentally wrong, so it is stated.
    expect(FORMS).toMatch(/:not\(\[type="file"\]\)/);
    expect(FORMS).toMatch(/\.field:has\(input\[type="file"\]\) \.field-label/);
  });

  it("keeps the required marker out of the label element", () => {
    // A `<label>`'s content is the field's *name*. §F.4 puts the `*` **after**
    // the Label, and inside it the glyph became part of the name — which is
    // both wrong for a screen reader reading the name and wrong for anything
    // else that asks for a field by what it is called.
    let scanned = 0;
    for (const { file, source } of FILES) {
      for (const [block] of source.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)) {
        scanned += 1;
        expect(block, `${file}: a required marker inside a <label>`).not.toMatch(/aria-hidden/);
      }
    }
    expect(scanned, "no <label> was scanned at all").toBeGreaterThan(0);
  });

  it("tests emptiness by element type, because a select has no placeholder", () => {
    // `:not(:placeholder-shown)` is vacuously TRUE for a `<select>` — it can
    // never show a placeholder — so a clause written against `.field-control`
    // floats every select's label on first paint and the select-specific
    // clause never gets to say otherwise. Measured on the live page before
    // this rule existed: the label sat on the border with nothing under it.
    const clauses = FORMS.split("\n").filter((line) =>
      /\.field:has\(.*:not\(:placeholder-shown\)\)/.test(line),
    );
    expect(clauses.length).toBeGreaterThan(0);
    for (const line of clauses) {
      expect(line, "the emptiness clause is not restricted to inputs").toMatch(
        /:is\(input, ?textarea\)|\b(input|textarea)[.:\[]/,
      );
    }
  });

  it("never nests one :has() inside another", () => {
    // Invalid CSS. The whole rule is dropped, silently — the label would just
    // stop moving and no error would appear anywhere.
    for (const [, inner] of FORMS.matchAll(/:has\(([^()]*\([^()]*\))*[^()]*\)/g)) {
      expect(String(inner ?? "")).not.toMatch(/:has\(/);
    }
    expect(FORMS).not.toMatch(/:has\([^)]*:has\(/);
  });

  it("does not spend the error colour where it cannot be read", () => {
    // `--color-semantic-error` (#E53E3E) measures **3.95:1** on the dark
    // theme's field ground — under WCAG 1.4.3's 4.5:1 — so neither the error
    // message nor the error *label* may be drawn in it. ADR-0067 §D8 fixed the
    // message and recorded the label as passing at 5.09:1; measured across
    // twelve live combinations it is 3.95:1, and the recorded figure was
    // simply wrong.
    //
    // The state is still in colour: the **edge** carries it and clears the
    // 3:1 non-text floor on both themes (4.98 / 3.95). Reverts in one line
    // once `semantic.error-text` exists.
    const invalid = FORMS.slice(FORMS.indexOf(".field-invalid .field-label"));
    const block = invalid.slice(0, invalid.indexOf("}"));
    expect(block).toContain("--color-text-primary");
    expect(block).not.toContain("--color-semantic-error");
  });

  it("floats the label onto Chapter 4's floor at every body size, not just one", () => {
    // §4.10 is unconditional — 13px, no text smaller than this anywhere, with
    // two named exceptions (ADR-0041) and neither is a form label. The scale
    // was a single 0.8125, which is 13 ÷ 16 and correct only for
    // `--font-size-body-desktop`. `--font-size-body-mobile` is 15px, so every
    // field on every phone floated its label at 12.19px. Measured in Chrome at
    // 390px, on both applications.
    //
    // So: one scale per body size, each one landing on 13. The arithmetic is
    // done here rather than trusted to a comment, because a comment asserting
    // the same conclusion is what let this ship.
    const scales = [...FORMS.matchAll(/--field-label-scale:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    expect(scales.length, "no --field-label-scale found").toBeGreaterThanOrEqual(2);

    const BODY = { mobile: 15, desktop: 16 };
    const FLOOR = 13;
    const landings = scales.map((scale, index) =>
      Math.round(scale * (index === 0 ? BODY.mobile : BODY.desktop) * 100) / 100,
    );
    for (const landed of landings) {
      expect(landed, `floats at ${landed}px, under Chapter 4 §4.10's ${FLOOR}px`).toBeGreaterThanOrEqual(FLOOR);
      // And not so far above it that the label has stopped shrinking.
      expect(landed).toBeLessThan(FLOOR + 1);
    }

    // The mobile scale is the unconditional one and the desktop scale is the
    // override, not the other way round — mobile-priority (PR-006).
    expect(FORMS.indexOf("--field-label-scale")).toBeLessThan(FORMS.indexOf("@media (min-width: 768px)"));
  });

  it("makes the control's height the token the label's travel is derived from", () => {
    // `min-height` is a floor, not a height. With `--space-3` above and below
    // a 25.6px line box and two 1px borders, the control measured **51.59px**
    // in Chrome while the label travelled `--space-12 / 2` = 24px — so the
    // label sat 1.8px above the centre line this file says it is on. Small,
    // and the point is that the file's own claim was false.
    //
    // The padding is therefore computed from the height and the line box
    // rather than picked: whatever is left of `--space-12` once `1lh` and the
    // two borders have taken their share. Measured after: 48.00px exactly,
    // label at 24 resting and 0 floated.
    expect(FORMS).toMatch(
      /padding-block:\s*calc\(\(var\(--space-12\) - 1lh - 2 \* var\(--border-width-default\)\) \/ 2\)/,
    );
    // And only once — a later `padding-block: var(--space-3)` in the same rule
    // silently won the first time this was written.
    const control = FORMS.slice(FORMS.indexOf(".field-control {"));
    const block = control.slice(0, control.indexOf("}"));
    expect(block.match(/padding-block:/g) ?? []).toHaveLength(1);
  });

  it("anchors the label to the control's centre, not the field's", () => {
    // `top: 50%` of the field is the middle of the *control* only while the
    // field has nothing under it. Add an error message and the field grows,
    // and the label drifts down on the one field a reader needs to read.
    expect(FORMS).toMatch(/\.field-label\s*\{[^}]*top:\s*calc\(var\(--space-12\) \/ 2\)/);
    expect(FORMS).not.toMatch(/\.field-label\s*\{[^}]*top:\s*50%/);
  });
});

describe("a border colour always has a border to colour", () => {
  it("never paints a colour onto a border it has not given a width", () => {
    // Tailwind's `border-[color:...]` sets a colour and no width. A recipe that
    // *replaces* a resting one rather than extending it therefore inherits a
    // zero-width border and paints the colour onto nothing. Measured on the
    // live page: every invalid field reported `border-top-width: 0px` and lost
    // its outline at exactly the moment WCAG 2.1 SS1.4.11 most needs it. The
    // geometry gave it away too — an invalid field stood 48px tall where a
    // valid one stood 49.
    //
    // A prefixed colour (`hover:border-[color:...]`) is exempt: it overrides a
    // state on a control whose resting classes already carry the width.
    const offenders: string[] = [];
    for (const { file, source } of FILES) {
      for (const [, name, body] of source.matchAll(/const (\w+) =\s*[`"]([^`"]*)[`"]/g)) {
        const tokens = body.split(/\s+/);
        const colours = tokens.some((token) => /^border-\[color:/.test(token));
        const width = tokens.some((token) => /^border(-\d+)?$/.test(token));
        const composes = /\$\{(FIELD_EDGE|CARD|CARD_INTERACTIVE|PANEL|RECESS)\}/.test(body);
        if (colours && !width && !composes) offenders.push(`${file}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the pointer says what is clickable", () => {
  it("gives every control the hand", () => {
    // Tailwind v4 returned `button` to the browser default, which is the same
    // arrow shown over a paragraph.
    expect(INTERACTION).toMatch(/button:not\(:disabled\)/);
    expect(INTERACTION).toMatch(/cursor:\s*pointer/);
    expect(INTERACTION).toMatch(/cursor:\s*not-allowed/);
  });

  it("declares it in `base`, so a component can still override it", () => {
    // Unlayered CSS beats every layer, which would make this default win over
    // `disabled:cursor-progress` on a submitting button and
    // `cursor-not-allowed` on a locked cell — a default that cannot be
    // overridden is not a default.
    expect(INTERACTION).toMatch(/@layer base\s*\{/);
    const outside = INTERACTION.replace(/@layer base\s*\{[\s\S]*\n\}/, "");
    expect(outside).not.toMatch(/cursor:/);
  });
});
