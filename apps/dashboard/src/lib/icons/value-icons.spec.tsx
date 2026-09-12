import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VALUE_ICON_KEYS, ValueIcon } from "./value-icons";

/**
 * The icon set against the API's own enum.
 *
 * `values[].iconKey` is an enum upstream, not a free string — that enum is
 * the refusal that stopped five off-palette icon hues reaching the approved
 * frames (defect PM-D23). A picker offering a key the API refuses would put
 * the author back where the enum was written to stop them, so this reads
 * `value-icon-keys.ts` rather than restating it.
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
  "value-icon-keys.ts",
);

if (!existsSync(API_KEYS)) {
  throw new Error(`The API's value-icon-keys.ts is not at ${API_KEYS}. Update this test's path.`);
}

const api = (await import(/* @vite-ignore */ pathToFileURL(API_KEYS).href)) as {
  VALUE_ICON_KEYS: readonly string[];
};

describe("the icon set", () => {
  /**
   * Exact array equality, not set equality: the order is the order the
   * picker offers, and the API's list is deliberately ordered — the five
   * keys the approved frames already use come first.
   */
  it("offers exactly the keys the API allows, in the API's order", () => {
    expect([...VALUE_ICON_KEYS]).toEqual([...api.VALUE_ICON_KEYS]);
  });

  it("draws something for every one of them", () => {
    for (const key of api.VALUE_ICON_KEYS) {
      const { container } = render(<ValueIcon iconKey={key} />);
      const svg = container.querySelector("svg");

      expect(svg, `no glyph for ${key}`).not.toBeNull();
      // A drawing with no strokes is a blank square that passes a
      // "renders an svg" assertion and shows the author nothing.
      expect(svg?.innerHTML.length, `empty glyph for ${key}`).toBeGreaterThan(20);
    }
  });

  it("hides every glyph from assistive technology", () => {
    // The icon repeats a choice the author made in a named control; it is
    // decoration, and announcing it would read the value's name twice.
    for (const key of api.VALUE_ICON_KEYS) {
      const { container } = render(<ValueIcon iconKey={key} />);
      expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("draws nothing rather than throwing on a key it does not know", () => {
    // Content already stored can name a key retired from the enum later.
    const { container } = render(<ValueIcon iconKey="not-a-real-key" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
