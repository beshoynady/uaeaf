import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { stripComments } from "@uaeaf/design-tokens/testing";

import { sourceFiles } from "./source-files";

/**
 * A surface that publishes light ink also paints its own ground.
 *
 * Declaring a surface and painting one are different things (ADR-0098 D2).
 * `data-surface` sets the `--surface-*` variables and paints nothing;
 * `.brand-surface` is the class that paints. That split is deliberate — the
 * dashboard shell wants the variables over its own ground, and a `Section`
 * already paints its register — but it has one sharp edge:
 *
 * **A surface whose ink is white, declared without paint, is invisible.**
 *
 * That is not hypothetical. The video library carried `data-surface="ink"` and
 * no paint class, so its two section headings resolved white against the page's
 * own off-white ground and measured **1.05:1** on screen. Every variable was
 * correct, every type checked, every other guard passed, and the headings could
 * not be read. Walking the DOM for a painted ancestor said it was fine; only
 * sampling the painted pixels found it.
 *
 * So the rule: the surfaces that publish light ink — the two identity grounds
 * and ink — must either carry `brand-surface`, or say in a comment on the same
 * element why they are a declaration only. The neutral surfaces (`canvas`,
 * `raised`, `photo-light`) are exempt: their ink is dark, and a missing ground
 * there is a visual difference rather than a disappearance.
 */

/** The surfaces whose text is white or near-white. */
const LIGHT_INK = ["ink", "brand-green", "brand-red", "section-black"];

/**
 * An element may declare without painting when it says why, beside itself.
 *
 * The reason is looked for in the element's own neighbourhood — the comment
 * above it and its own tag — not anywhere in the file, so it belongs to the
 * element rather than to the module. The phrases are the ones this codebase
 * actually uses, each naming a real reason:
 *
 * - it publishes a ground's ink over a photograph, where painting would cover
 *   the photograph (the motif over a hero, or over a cover picture);
 * - something behind it is already the ground (the player's scrim);
 * - it says outright that it declares only.
 */
const DECLARES_ONLY =
  /\b(?:declares? only|declaration only|paints? nothing|draws no ground|no ground of its own|publishes the [a-z]+ ground|the scrim behind it is the ground)\b/i;

const OPENING_TAG = /<[A-Za-z][\w.]*\b[^<>]*?data-surface=(?:"([a-z-]+)"|\{[^}]*\})[^<>]*?>/g;

const scanned = sourceFiles()
  .filter((path) => path.endsWith(".tsx"))
  .map((path) => ({
    label: path.split(/[\\/]uaeaf-project[\\/]/)[1]?.replace(/\\/g, "/") ?? path,
    // NOT comment-stripped: the exemption is a comment, and this rule has to
    // be able to read one.
    raw: readFileSync(path, "utf-8"),
    source: stripComments(readFileSync(path, "utf-8")),
  }));

describe("a surface with light ink paints its own ground", () => {
  it("scans a real number of files, so the rule below cannot pass vacuously", () => {
    expect(scanned.length).toBeGreaterThan(30);
  });

  it("finds light-ink surfaces at all, so the pattern still matches the code", () => {
    const total = scanned.reduce((n, { source }) => {
      let count = 0;
      for (const [, kind] of source.matchAll(OPENING_TAG)) {
        if (kind !== undefined && LIGHT_INK.includes(kind)) count += 1;
      }
      return n + count;
    }, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("carries brand-surface, or records on the element why it does not", () => {
    const offenders: string[] = [];
    for (const { label, raw, source } of scanned) {
      for (const match of source.matchAll(OPENING_TAG)) {
        const kind = match[1];
        if (kind === undefined || !LIGHT_INK.includes(kind)) continue;
        if (match[0].includes("brand-surface")) continue;

        // The comment above the tag, and the tag itself: a reason written
        // inside the element counts as much as one written over it.
        const at = raw.indexOf(match[0].slice(0, 40));
        const near = at === -1 ? "" : raw.slice(Math.max(0, at - 500), at + 600);
        if (DECLARES_ONLY.test(near)) continue;

        offenders.push(`${label}: data-surface="${kind}" with no paint and no recorded reason`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
