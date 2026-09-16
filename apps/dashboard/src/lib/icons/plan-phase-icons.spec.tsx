import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PLAN_PHASE_ICON_KEYS, PlanPhaseIcon } from "./plan-phase-icons";

/**
 * The phase icon set against the API's own enum.
 *
 * `phases[].iconKey` is closed upstream to four keys (ADR-0075). A picker
 * offering a key the API refuses would have the author's save rejected on a
 * choice the control itself offered, so this reads `plan-phase-icon-keys.ts`
 * rather than restating it.
 */
const API_KEYS = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
  "api",
  "src",
  "common",
  "constants",
  "plan-phase-icon-keys.ts",
);

if (!existsSync(API_KEYS)) {
  throw new Error(`The API's plan-phase-icon-keys.ts is not at ${API_KEYS}. Update this test's path.`);
}

const api = (await import(/* @vite-ignore */ pathToFileURL(API_KEYS).href)) as {
  PLAN_PHASE_ICON_KEYS: readonly string[];
};

describe("the phase icon set", () => {
  // Exact array equality: the order is the order the picker offers, and the
  // API's list is the order the composition prints its four phases in.
  it("offers exactly the keys the API allows, in the API's order", () => {
    expect([...PLAN_PHASE_ICON_KEYS]).toEqual([...api.PLAN_PHASE_ICON_KEYS]);
  });

  it("draws something for every one of them", () => {
    for (const key of api.PLAN_PHASE_ICON_KEYS) {
      const { container } = render(<PlanPhaseIcon iconKey={key} />);
      const svg = container.querySelector("svg");

      expect(svg, `no glyph for ${key}`).not.toBeNull();
      expect(svg?.innerHTML.length, `empty glyph for ${key}`).toBeGreaterThan(20);
    }
  });

  it("hides every glyph from assistive technology", () => {
    for (const key of api.PLAN_PHASE_ICON_KEYS) {
      const { container } = render(<PlanPhaseIcon iconKey={key} />);
      expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("draws nothing rather than throwing on a key it does not know", () => {
    const { container } = render(<PlanPhaseIcon iconKey="not-a-real-key" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
