import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "@uaeaf/design-tokens/testing";

/**
 * Interaction states, enforced mechanically.
 *
 * The dashboard carries the same four rules, for a reason worth restating:
 * WCAG 2.4.7 failed in production there on five separate screens, and it
 * survived a green suite, a passing build and a live browser pass, because
 * nothing was looking. `outline-none` is one token in a long class string and
 * reads as housekeeping; the missing half is invisible unless something
 * checks for it.
 *
 * This application starts with the check rather than acquiring it after the
 * failure.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

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
 * Every `className=` value in a file, brace-matched so conditional
 * expressions and template literals come back whole. A regex stopping at the
 * first `}` would split `${cond ? "a" : "b"}` and report each branch as its
 * own class string — which is exactly where a focus ring tends to live.
 *
 * File-level constants (`FOCUS`, `FOOTER_LINK`, `LINK`, `TRANSITION`) are
 * appended to every class string in the same file, because a call site that
 * composes one has the states that constant has. Without that, these rules
 * would push code *away* from shared definitions and toward pasting states
 * inline — the duplication that caused the original defect.
 */
/** Class-string constants in a file that express an interaction state.
 *
 *  `focus-visible:` and `focus-within:` are the variants that matter, and
 *  neither is `focus:` — an earlier version of this pattern demanded the
 *  colon immediately after the word and silently dropped the one constant
 *  carrying the whole focus treatment. */
function stateConstants(source: string): string[] {
  const found: string[] = [];
  for (const [, body] of source.matchAll(
    /^(?:export )?const [A-Z_][A-Z0-9_]*\s*(?:=|:[^=]*=)\s*([\s\S]*?);$/gm,
  )) {
    if (/(?:focus|hover|active)[a-z-]*:/.test(body)) found.push(body);
  }
  return found;
}

const SHARED_CONSTANTS = stateConstants(
  stripComments(readFileSync(join(SRC, "components", "ui", "interactive.ts"), "utf-8")),
);

function imports(source: string): boolean {
  return /from "@\/components\/ui\/interactive"/.test(source);
}

function classAttributes(file: string): ClassAttr[] {
  const raw = readFileSync(file, "utf-8");
  const source = stripComments(raw);
  const found: ClassAttr[] = [];

  const constants = stateConstants(source);
  // A file that imports the shared definitions has the states they carry.
  // Without this the rules would push code *away* from `ui/interactive` and
  // toward pasting the ring inline at every call site — the duplication that
  // caused the defect these rules exist for.
  const shared = [...constants, ...(imports(source) ? SHARED_CONSTANTS : [])].join(" ");

  for (const match of source.matchAll(/className=/g)) {
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

    // A reference to a shared constant brings that constant's states with it.
    const referenced = /\b(FOCUS|TRANSITION|LINK|FOOTER_LINK)\b/.test(value) ? ` ${shared}` : "";

    found.push({
      file: file.replace(SRC, "src").split("\\").join("/"),
      line: source.slice(0, match.index).split(String.fromCharCode(10)).length,
      value: value + referenced,
    });
  }

  return found;
}

const ALL = sourceFiles(SRC).flatMap(classAttributes);

describe("interaction state contract", () => {
  it("finds class attributes to check, so the rules below cannot pass vacuously", () => {
    expect(ALL.length).toBeGreaterThan(40);
  });

  it("never removes the focus outline without replacing it", () => {
    // WCAG 2.4.7. `outline-none` is legitimate — this system's rings are
    // drawn with ring utilities, not the UA outline — but only when the same
    // element, or a shell in the same file, draws its own.
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
    const byFile = new Map<string, ClassAttr[]>();
    for (const attr of ALL) {
      byFile.set(attr.file, [...(byFile.get(attr.file) ?? []), attr]);
    }

    const offenders: string[] = [];
    for (const [file, attrs] of byFile) {
      const source = stripComments(readFileSync(join(SRC, file.replace(/^src/, ".")), "utf-8"));
      const interactive = [...source.matchAll(/<(button|input|select|textarea)\b|<a\s[^>]*href=|<Link\b/g)];
      if (interactive.length === 0) continue;

      const hasIndicator = attrs.some(({ value }) => /\bfocus(-visible|-within)?:/.test(value));
      if (!hasIndicator) {
        offenders.push(`${file} — ${interactive.length} interactive element(s), no focus treatment`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("gives a control that responds to hover a pressed state too", () => {
    // Hover is mouse-only feedback, and this is the mobile-priority layer
    // (PR-006). A control that lights up under a pointer and does nothing
    // when pressed reads as unresponsive on touch, where hover either does
    // not exist or sticks after the tap.
    const offenders = ALL.filter(
      ({ value }) =>
        /\bhover:(bg|border|text|opacity|-?translate)/.test(value) && !/\bactive:/.test(value),
    ).map(({ file, line }) => `${file}:${line}`);

    expect(offenders).toEqual([]);
  });

  it("takes every transition duration from a token", () => {
    // Chapter 5 §5.6 maps each duration to a purpose. A literal `duration-200`
    // is outside that mapping and outside the reduced-motion token reset.
    const offenders = ALL.filter(({ value }) => /\bduration-\d/.test(value)).map(
      ({ file, line }) => `${file}:${line}`,
    );
    expect(offenders).toEqual([]);
  });
});
