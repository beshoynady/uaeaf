import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PLAN_PHASE_ICON_KEYS, PlanPhaseIcon } from "./plan-phase-icons";

/**
 * The public site draws the glyph an editor picked for a phase, so its set
 * has to be the API's enum exactly. Read from `plan-phase-icon-keys.ts`
 * rather than restated, as `value-icons.spec.tsx` does for the value icons.
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

describe("the public phase icon set", () => {
  it("draws exactly the keys the API allows", () => {
    expect([...PLAN_PHASE_ICON_KEYS]).toEqual([...api.PLAN_PHASE_ICON_KEYS]);
  });

  it("draws every key as a hidden glyph in the current colour, and nothing for an unknown one", () => {
    for (const key of PLAN_PHASE_ICON_KEYS) {
      const { container, unmount } = render(<PlanPhaseIcon iconKey={key} />);
      const svg = container.querySelector("svg")!;
      expect(svg, key).toHaveAttribute("aria-hidden", "true");
      expect(svg.getAttribute("stroke"), key).toBe("currentColor");
      expect(svg.querySelectorAll("path").length, key).toBeGreaterThan(0);
      unmount();
    }
    expect(render(<PlanPhaseIcon iconKey="rocket" />).container.querySelector("svg")).toBeNull();
  });
});
