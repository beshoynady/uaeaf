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

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx$/.test(entry) && !/\.(spec|test)\.tsx$/.test(entry) ? [full] : [];
  });

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
const stateConstants = (source: string): { name: string; body: string }[] => {
  const found: { name: string; body: string }[] = [];
  for (const [, name, body] of source.matchAll(
    /^(?:export )?const ([A-Z_][A-Z0-9_]*)\s*(?:=|:[^=]*=)\s*([\s\S]*?);$/gm,
  )) {
    if (/(?:focus|hover|active)[a-z-]*:/.test(body)) found.push({ name, body });
  }
  return found;
};

/**
 * The modules that define an interaction state once, for other files to use.
 *
 * A call site that references such a module's exports is judged with the states
 * those exports carry -- otherwise this rule would push code away from a shared
 * definition and back toward pasting the ring at every call site, which is the
 * defect it exists for.
 *
 * A module is matched by the specifier its importers spell, so a relative one
 * would be listed in each spelling that is used.
 *
 * The list is one entry long again. `pages/video/chrome` was the second: it
 * defined the video system's own pill and its own wide focus ring, and it is
 * gone. The pill is `Button variant="secondary"` and the ring is the kit's
 * `.brand-focusable`, which this rule reaches through `FOCUS_CLASSES` below --
 * as a class that draws a `:focus-visible` rule, not as a constant.
 */
const SHARED_MODULES = [
  { specifier: "@/components/ui/interactive", file: join(SRC, "components", "ui", "interactive.ts") },
].map(({ specifier, file }) => {
  const source = stripComments(readFileSync(file, "utf-8"));
  return {
    specifier,
    constants: stateConstants(source),
    /** The exports that carry a state: their own variants, or a composed one
     *  built on `FOCUS` (`CARD_LINK`). One that only sizes a
     *  target (`TOUCH_TARGET`) brings none.
     *  `FOCUS`, not `FOCUS[A-Z_]*`: the wider form arrived with `chrome.ts`
     *  and was never needed even there -- `FOCUS_WIDE`'s body matched the first
     *  alternative anyway -- while it would accept a `FOCUS_NONE` whose body
     *  only turned the outline off. */
    names: [...source.matchAll(/^export const ([A-Z_][A-Z0-9_]*)\s*=\s*([\s\S]*?);$/gm)]
      .filter(([, , body]) => /(?:focus|hover|active)[a-z-]*:|\bFOCUS\b/.test(body))
      .map(([, name]) => name),
  };
});

/**
 * The kit's class-name exports, resolved to the class they name.
 *
 * `@uaeaf/brand-ui` publishes a handful of plain class names as constants --
 * `BRAND_FOCUSABLE`, `BRAND_FOCUS_WIDE`, `BRAND_DRAW_LINE` -- so that a call
 * site writes the name rather than the string. To this rule's static scan a
 * `${BRAND_FOCUSABLE}` is opaque: the source text says `BRAND_FOCUSABLE`, the
 * CSS defines `.brand-focusable`, and the two never meet. That is not a missing
 * focus ring, it is an unresolved indirection -- the same one `expanded()`
 * already resolves for a constant declared in the file being scanned, resolved
 * here across the package boundary on exactly the same terms.
 *
 * Only a bare string literal is read. A constant whose value is computed is not
 * a class name, and guessing at one would be the loophole this closes.
 */
const KIT_INDEX = join(SRC, "..", "..", "..", "packages", "brand-ui", "index.ts");

const KIT_CLASSES: { name: string; body: string }[] = [
  ...stripComments(readFileSync(KIT_INDEX, "utf-8")).matchAll(
    /^export const ([A-Z_][A-Z0-9_]*)\s*=\s*"([a-z][\w-]*)";$/gm,
  ),
].map(([, name, body]) => ({ name, body }));


/** The shared definitions a file has actually imported. */
const sharedFor = (source: string) =>
  SHARED_MODULES.filter(({ specifier }) => source.includes(`from "${specifier}"`));

const classAttributes = (file: string): ClassAttr[] => {
  const raw = readFileSync(file, "utf-8");
  const source = stripComments(raw);
  const found: ClassAttr[] = [];

  const constants = stateConstants(source);
  // A file that imports the shared definitions has the states they carry.
  // Without this the rules would push code *away* from `ui/interactive` and
  // toward pasting the ring inline at every call site — the duplication that
  // caused the defect these rules exist for.
  const inScope = sharedFor(source);
  const shared = [...constants, ...inScope.flatMap((module) => module.constants)].map(({ body }) => body).join(" ");
  // The names a class string may reference to bring those states with it,
  // looked for in the string and in the body of any file constant it uses:
  // a local `STEP` built on `FOCUS` carries the ring as surely as `FOCUS`.
  const names = ["FOCUS", "TRANSITION", "LINK", "FOOTER_LINK", ...inScope.flatMap((module) => module.names)];
  const references = new RegExp(`\\b(${names.join("|")})\\b`);
  // The kit's class constants resolve for any file, not only one whose import
  // specifier matched above: `BRAND_FOCUSABLE` is unambiguous, and a file
  // cannot mean anything else by it.
  const resolvable = [...constants, ...KIT_CLASSES];
  const expanded = (value: string) =>
    [value, ...resolvable.filter(({ name }) => new RegExp(`\\b${name}\\b`).test(value)).map(({ body }) => body)].join(" ");

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
    const referenced = references.test(expanded(value)) ? ` ${shared}` : "";

    found.push({
      file: file.replace(SRC, "src").split("\\").join("/"),
      line: source.slice(0, match.index).split(String.fromCharCode(10)).length,
      // `expanded`, not the raw string: a class string that names a constant
      // carries what that constant holds, whether the constant is declared in
      // this file or exported by the kit. Every rule below then reads one
      // resolved value instead of each re-deciding how to resolve it.
      value: expanded(value) + referenced,
    });
  }

  return found;
};

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

  /**
   * Classes that draw a focus indicator from a stylesheet rather than from a
   * Tailwind variant, discovered rather than listed: any class name in the
   * project's own CSS whose rule carries `:focus-visible`. A class that stops
   * drawing one drops off this list by itself, and the check goes red again.
   */
  const FOCUS_CLASSES = (() => {
    // Every stylesheet the project owns, not just `src/styles`.
    //
    // The narrower walk was this rule's own blind spot: a control styled from
    // a route-level stylesheet, or from `@uaeaf/brand-ui`, drew a perfectly
    // good 2px outline on focus and was reported as having none. The intent
    // stated above — "any class name in the project's own CSS" — was always
    // the right one; the walk just did not reach that far.
    const roots = [
      SRC,
      join(SRC, "..", "..", "..", "packages", "brand-ui"),
      join(SRC, "..", "..", "..", "packages", "design-tokens", "css"),
    ];
    const names = new Set<string>();

    const collect = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue;
          collect(full);
          continue;
        }
        if (!entry.name.endsWith(".css")) continue;
        const css = readFileSync(full, "utf-8");
        for (const [, name] of css.matchAll(/\.([a-z][\w-]*)(?::[\w-]+)*:focus-visible/g)) {
          names.add(name);
        }
      }
    };

    for (const root of roots) collect(root);
    return [...names];
  })();

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

      // A Tailwind `focus-visible:` variant, or a project class whose own
      // `:focus-visible` rule lives in a stylesheet. The second was added
      // because this check reported four files as having no focus treatment
      // while every control in them drew a 2px outline on focus — measured in
      // a browser, not assumed. A class that carries the indicator is still
      // an indicator; what this must keep catching is a file with neither.
      const hasIndicator = attrs.some(
        ({ value }) => /\bfocus(-visible|-within)?:/.test(value) || FOCUS_CLASSES.some((name) => value.includes(name)),
      );
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
