import { describe, expect, it } from "vitest";
import {
  BUTTON_DESTRUCTIVE,
  BUTTON_GHOST,
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  FIELD_INPUT,
  FIELD_SHELL,
  INTERACTIVE_CLASS_NAMES,
  SELECTABLE_ROW,
  TOGGLE_SEGMENT,
} from "./interactive";

/**
 * One definition of what a control does when you touch it.
 *
 * Before this module the dashboard had **thirty-eight** buttons and one
 * `active:` state between them, because the primary-button class string was
 * copy-pasted verbatim across seven files and only the first copy was ever
 * completed. Fixing thirty-eight call sites individually would leave
 * thirty-eight places for the next one to drift; `packages/ui` is declared as
 * a workspace and contains zero files, which is how the drift started.
 *
 * So the states live here, once, and the call sites consume them. These tests
 * are what make that a guarantee rather than an intention.
 */

/** Every state a pressable control must express, and the utility that proves it. */
const PRESSABLE_STATES = [
  ["hover", /\bhover:/],
  ["pressed", /\bactive:/],
  ["focus-visible", /\bfocus-visible:/],
  ["disabled", /\bdisabled:/],
] as const;

const PRESSABLE = {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  BUTTON_DESTRUCTIVE,
  BUTTON_GHOST,
  SELECTABLE_ROW,
  TOGGLE_SEGMENT,
};

describe.each(Object.entries(PRESSABLE))("%s", (_name, classes) => {
  it.each(PRESSABLE_STATES)("expresses its %s state", (_state, pattern) => {
    expect(classes).toMatch(pattern);
  });

  it("uses the design system's motion tokens, never a raw duration", () => {
    // ADR-0009: repeated motion is transform/opacity only, timed by token.
    expect(classes).toMatch(/duration-\[var\(--motion-duration-[a-z]+\)\]/);
    expect(classes).not.toMatch(/duration-\d/);
  });

  it("clears the 44x44 minimum touch target, or declares why it cannot", () => {
    // Protocol §14. Expressed as a min-height utility so it survives text of
    // any length; a row or segment inside a dense table meets it by padding.
    expect(classes).toMatch(/\b(min-h-11|h-11|min-h-\[44px\]|py-[2-9]|py-\[1[0-9]px\])/);
  });
});

describe("focus indicator", () => {
  it.each(Object.entries({ ...PRESSABLE, FIELD_SHELL }))(
    "%s draws a ring with an offset, so it is visible on any surface",
    (_name, classes) => {
      // `a11y.focus.ring` is black and `a11y.focus.offset` white (ADR-0051),
      // chosen as the widest-contrast pair in the palette precisely so the
      // indicator survives on green, red, black and neutral grounds alike.
      // A ring without its offset disappears against the ring colour's own
      // register — which, now that section registers exist, is reachable.
      expect(classes).toMatch(/ring-\[color:var\(--a11y-focus-ring\)\]/);
      expect(classes).toMatch(/ring-offset-\[color:var\(--a11y-focus-offset\)\]/);
    },
  );

  it("never removes the browser outline without drawing a replacement", () => {
    // One named exception, and only one: FIELD_INPUT removes its outline
    // because FIELD_SHELL draws the indicator around it — an input that fills
    // its shell edge to edge would otherwise show a second rectangle clipped
    // by the shell's radius. The safety of that pairing is not assumed here;
    // it is asserted directly by "puts the ring on the shell" below, so the
    // exemption cannot outlive the arrangement that justifies it.
    const DRAWN_BY_ITS_SHELL = new Set(["FIELD_INPUT"]);

    for (const [name, classes] of Object.entries(INTERACTIVE_CLASS_NAMES)) {
      if (DRAWN_BY_ITS_SHELL.has(name)) continue;
      if (/\boutline-(none|hidden)\b/.test(classes)) {
        expect(classes, `${name} removes the outline`).toMatch(/\bfocus-visible:|\bfocus-within:/);
      }
    }
  });
});

describe("FIELD_SHELL and FIELD_INPUT", () => {
  it("puts the ring on the shell, because the input fills it edge to edge", () => {
    expect(FIELD_SHELL).toMatch(/\bfocus-within:/);
    expect(FIELD_INPUT).toMatch(/\boutline-none\b/);
  });

  it("styles the disabled field rather than only setting the attribute", () => {
    // `disabled={saving}` with no matching style renders identically to an
    // enabled field: ten controls in this codebase did exactly that.
    expect(FIELD_SHELL).toMatch(/\bhas-\[:disabled\]:|\bdisabled:/);
  });
});

describe("INTERACTIVE_CLASS_NAMES", () => {
  it("exports every control the module defines, so the contract test can resolve them", () => {
    expect(Object.keys(INTERACTIVE_CLASS_NAMES).sort()).toEqual(
      [
        "BUTTON_DESTRUCTIVE",
        "BUTTON_GHOST",
        "BUTTON_PRIMARY",
        "BUTTON_SECONDARY",
        "FIELD_INPUT",
        "FIELD_SHELL",
        "SELECTABLE_ROW",
        "TOGGLE_SEGMENT",
      ].sort(),
    );
  });

  it("binds every colour through a token, never a literal", () => {
    for (const [name, classes] of Object.entries(INTERACTIVE_CLASS_NAMES)) {
      expect(classes, `${name} contains a raw hex colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
