import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { INTERACTIVE_CLASS_NAMES } from "@/components/ui/interactive";

/**
 * Interaction states, enforced mechanically.
 *
 * WCAG 2.4.7 (Focus Visible) has been failing in production on the primary
 * search control of four separate admin screens: the input applies
 * `outline-none`, its wrapper carries no `focus-within:`, and nothing replaces
 * the indicator the reset removed. A keyboard user tabs into the field and the
 * page gives no sign of where they are.
 *
 * That survived a green suite, a passing build and a live browser pass,
 * because nothing was looking. `outline-none` is a single token in a long
 * class string and reads as housekeeping; the missing half is invisible unless
 * something checks for it. So something checks for it.
 *
 * These rules are deliberately narrow and exact. They do not attempt to judge
 * whether a focus ring is *good* — only that removing the browser's default
 * without providing a replacement is a defect, every time, with no exceptions
 * to argue about.
 */

const APP_SRC = join(dirname(fileURLToPath(import.meta.url)), "../..");

interface ClassAttr {
  file: string;
  line: number;
  value: string;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx$/.test(entry) && !/\.(spec|test)\.tsx$/.test(entry) ? [full] : [];
  });
}

/**
 * Every `className=` value in a file, brace-matched so that conditional
 * expressions and template literals come back whole. A regex that stopped at
 * the first `}` would split `${cond ? "a" : "b"}` and report each branch as
 * its own class string, which is exactly where a focus ring tends to live.
 */
function classAttributes(file: string): ClassAttr[] {
  const source = readFileSync(file, "utf-8");
  const found: ClassAttr[] = [];
  const marker = /className=/g;

  for (const match of source.matchAll(marker)) {
    let index = (match.index ?? 0) + match[0].length;
    const opener = source[index];
    let value = "";

    if (opener === '"' || opener === "'") {
      const end = source.indexOf(opener, index + 1);
      value = source.slice(index + 1, end === -1 ? undefined : end);
    } else if (opener === "{") {
      let depth = 0;
      const start = index;
      for (; index < source.length; index += 1) {
        if (source[index] === "{") depth += 1;
        else if (source[index] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      value = source.slice(start + 1, index);
    } else {
      continue;
    }

    found.push({
      file: file.replace(APP_SRC, "src"),
      line: source.slice(0, match.index).split("\n").length,
      value: expand(value),
    });
  }

  return found;
}

/**
 * A call site that composes `BUTTON_PRIMARY` has every state that constant
 * has. Without this the rules below would push call sites *away* from the
 * shared definitions — passing only when the states are pasted inline, which
 * is the duplication that caused the defects in the first place.
 */
function expand(value: string): string {
  let expanded = value;
  for (const [name, classes] of Object.entries(INTERACTIVE_CLASS_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(value)) {
      expanded += ` ${classes}`;
    }
  }
  return expanded;
}

const ALL = sourceFiles(APP_SRC).flatMap(classAttributes);

describe("interaction state contract", () => {
  it("finds class attributes to check, so the rules below cannot pass vacuously", () => {
    expect(ALL.length).toBeGreaterThan(100);
  });

  it("never removes the focus outline without replacing it", () => {
    // WCAG 2.4.7. `outline-none` is legitimate — the design system's rings are
    // drawn with ring/shadow utilities, not the UA outline — but only when the
    // same element draws its own. Removing it and drawing nothing is the
    // failure this rule exists for.
    // One sanctioned arrangement: an input that fills a shell edge to edge
    // lets the shell draw the indicator via `focus-within:`, because a ring on
    // the input itself would be clipped by the shell's radius. Recognised by
    // the shell being present *in the same file* — which is exactly what the
    // five defective search fields lacked. Their files contained no
    // `focus-within:` at all; nothing anywhere drew what `outline-none` had
    // taken away.
    const shellDraws = new Set(
      ALL.filter(({ value }) => /\bfocus-within:/.test(value)).map(({ file }) => file),
    );

    const offenders = ALL.filter(
      ({ file, value }) =>
        /\boutline-(none|hidden)\b/.test(value) &&
        !/\bfocus-visible:/.test(value) &&
        !shellDraws.has(file),
    ).map(({ file, line }) => `${file}:${line}`);

    expect(offenders).toEqual([]);
  });

  it("gives every interactive element a focus-visible indicator", () => {
    // A wrapper may legitimately carry the ring for a control nested inside it
    // (`focus-within:` on the field shell), so an element whose own class
    // string carries neither is only reported when its file contains no
    // wrapper treatment at all.
    const byFile = new Map<string, ClassAttr[]>();
    for (const attr of ALL) {
      byFile.set(attr.file, [...(byFile.get(attr.file) ?? []), attr]);
    }

    const offenders: string[] = [];
    for (const [file, attrs] of byFile) {
      const source = readFileSync(join(APP_SRC, file.replace(/^src/, ".")), "utf-8");
      const interactive = /<(button|input|select|textarea)\b|<a\s[^>]*href=/g;
      const interactiveCount = [...source.matchAll(interactive)].length;
      if (interactiveCount === 0) continue;

      const hasIndicator = attrs.some(({ value }) => /\bfocus(-visible|-within)?:/.test(value));
      if (!hasIndicator) {
        offenders.push(`${file} — ${interactiveCount} interactive element(s), no focus treatment anywhere in the file`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("gives a control that responds to hover a pressed state too", () => {
    // Hover is mouse-only feedback. A control that lights up under a pointer
    // and does nothing when actually pressed reads as unresponsive on touch,
    // where hover either does not exist or sticks after the tap. `active:`
    // appeared exactly once across both applications before this rule.
    const offenders = ALL.filter(
      ({ value }) =>
        /\bhover:(bg|border|text|opacity)-/.test(value) &&
        !/\bactive:/.test(value) &&
        // Wrapper labels styling a nested control on hover are not themselves
        // pressable; the control inside them carries the pressed state.
        !/\bhover:(bg|border)-\[color:var\(--color-surface-skeleton\)\]/.test(value),
    ).map(({ file, line }) => `${file}:${line}`);

    expect(offenders).toEqual([]);
  });
});
