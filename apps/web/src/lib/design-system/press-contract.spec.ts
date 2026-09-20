import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The press, held to what ADR-0087 D6 says it is.
 *
 * A control goes down by one edge width under the finger and comes back when
 * it is let go. The rule is one block in `motion.css`, and these are the four
 * things about it that a later edit could undo without anything looking wrong:
 * it must stop for a reader who asked for less motion, it must be switchable
 * off without a build, it must leave a disabled control alone, and every value
 * in it must be a token.
 */

const MOTION_CSS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "styles", "motion.css");

/** Comments blanked at equal length, so prose about the rule is never read as
 *  the rule, and offsets still point at the real file. */
const source = readFileSync(MOTION_CSS, "utf-8").replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));

type Rule = { selector: string; body: string; within: string[] };

/** Every style rule with the at-rules around it, found by walking the braces:
 *  a regular expression cannot tell which `@media` a rule is inside. */
const rules = (css: string): Rule[] => {
  const found: Rule[] = [];
  const open: { prelude: string; bodyStart: number }[] = [];
  let preludeStart = 0;
  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") {
      open.push({ prelude: css.slice(preludeStart, index).trim(), bodyStart: index + 1 });
      preludeStart = index + 1;
    } else if (char === "}") {
      const block = open.pop();
      if (block && !block.prelude.startsWith("@")) {
        found.push({
          selector: block.prelude,
          body: css.slice(block.bodyStart, index).trim(),
          within: open.map(({ prelude }) => prelude).filter((name) => name.startsWith("@")),
        });
      }
      preludeStart = index + 1;
    } else if (char === ";") {
      preludeStart = index + 1;
    }
  }
  return found;
};

const press = rules(source).filter((rule) => rule.selector.includes('[data-motion-off~="press"]'));

describe("the press (ADR-0087 D6)", () => {
  it("is one rule, so there is one place to read what a press does", () => {
    expect(press).toHaveLength(1);
  });

  it("answers the press itself, on every button, every button-shaped link and every raised card", () => {
    const [{ selector }] = press;
    expect(selector).toContain(":active");
    expect(selector).toMatch(/\bbutton\b/);
    expect(selector).toContain('[role="button"]');
    expect(selector).toContain('a[class~="rounded-[var(--button-radius)]"]');
    expect(selector).toContain(".lift");
  });

  it("leaves a control that will not answer alone", () => {
    const [{ selector }] = press;
    expect(selector).toContain(":disabled");
    expect(selector).toContain('[aria-disabled="true"]');
    expect(selector).toMatch(/:not\([^)]*:disabled[^)]*\[aria-disabled="true"\][^)]*\)/);
  });

  it("is off when the switch names it, and only then", () => {
    expect(press[0].selector).toContain(':root:not([data-motion-off~="press"])');
  });

  it("does not move for a reader who asked for less motion", () => {
    expect(press[0].within.some((name) => /prefers-reduced-motion:\s*no-preference/.test(name))).toBe(true);
  });

  it("moves by a token over a token, and by nothing else", () => {
    const { body } = press[0];
    expect(body).toContain("transform: translateY(var(--border-width-default))");
    expect(body).toContain("var(--motion-duration-instant)");
    const properties = [...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g)].map(([, name]) => name);
    expect(properties.sort()).toEqual(["transform", "transition"]);
    // A literal length or time would escape both the token lists and the
    // reduced-motion reset.
    expect(body.replace(/var\([^)]*\)/g, "")).not.toMatch(/\d+(?:px|rem|em|ms|s)\b/);
  });
});
