import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VALUE_ICON_KEYS, ValueIcon } from "./value-icons";

/**
 * The public site draws the glyph an editor picked, so its set has to be the
 * API's enum exactly: a key the site cannot draw would publish a value card
 * with an empty chip. Read from `value-icon-keys.ts` rather than restated, as
 * the dashboard's own copy of this test does.
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

describe("the public value icon set", () => {
  it("draws exactly the keys the API allows", () => {
    expect([...VALUE_ICON_KEYS]).toEqual([...api.VALUE_ICON_KEYS]);
  });

  it("draws a glyph for every one of them, hidden from assistive technology", () => {
    for (const key of api.VALUE_ICON_KEYS) {
      const { container, unmount } = render(<ValueIcon iconKey={key} />);
      const svg = container.querySelector("svg");
      expect(svg, `no glyph for ${key}`).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg?.innerHTML.length, `empty glyph for ${key}`).toBeGreaterThan(20);
      unmount();
    }
  });

  it("draws nothing for a key it does not know", () => {
    const { container } = render(<ValueIcon iconKey="retired" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
