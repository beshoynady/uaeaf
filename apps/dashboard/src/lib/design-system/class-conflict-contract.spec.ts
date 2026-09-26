import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Two Tailwind classes from the same group, on one element.
 *
 * `font-semibold` in a base string and `font-extrabold` in a conditional branch
 * are two utilities of equal specificity. The winner is whichever Tailwind
 * emits later **in the stylesheet**, not whichever is later in the `className`
 * — so the branch that looks like it wins may not.
 *
 * Found on the editor's tab strip: the selected tab was written
 * `font-extrabold` and measured **600**, so the one tab a reader is looking for
 * was set in the same weight as the three they are not. Nothing errors, nothing
 * warns, and the screenshot looks plausible — which is why this is a test and
 * not a code-review note.
 *
 * Scoped to the groups where the failure is silent and the intent is visual
 * emphasis. A conflict in padding or colour usually announces itself; a weight
 * that quietly does not apply does not.
 */
describe("conflicting Tailwind utilities on one element", () => {
  const src = join(process.cwd(), "src");

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : /\.tsx$/.test(full) ? [full] : [];
    });

  /** Every `className={...}` or `className="..."`, as one flat string per
   *  attribute — which is the unit that lands on one element. */
  const classAttributes = (source: string): string[] => {
    const found: string[] = [];
    // Template literals and plain strings both; the braces are matched loosely
    // because what matters is the run of class names, not the expression shape.
    for (const match of source.matchAll(/className=(\{`|\{"|")([\s\S]*?)(`\}|"\}|")/g)) {
      found.push(match[2]);
    }
    return found;
  };

  const WEIGHTS = /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g;

  it("never sets two font weights on the same element", () => {
    const offenders: string[] = [];

    for (const file of walk(src)) {
      if (/\.spec\.tsx$/.test(file)) continue;
      const relative = file.slice(src.length + 1).replace(/\\/g, "/");

      for (const attribute of classAttributes(readFileSync(file, "utf8"))) {
        const weights = [...attribute.matchAll(WEIGHTS)].map((m) => m[0]);
        const distinct = [...new Set(weights)];
        // Two of the same is a duplicate, not a conflict. Two different ones on
        // one element means one of them is doing nothing.
        if (distinct.length > 1) {
          offenders.push(`${relative}: ${distinct.join(" + ")}`);
        }
      }
    }

    expect(offenders.sort()).toEqual([]);
  });
});
