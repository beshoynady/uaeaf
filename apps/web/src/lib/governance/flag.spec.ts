import { describe, expect, it } from "vitest";

import { governanceV2Enabled } from "./flag";

describe("governanceV2Enabled", () => {
  it("is on for the one value that means on", () => {
    expect(governanceV2Enabled("1")).toBe(true);
  });

  // The default has to be off: on, four served addresses would show sample
  // names, and one of them shows real ones today.
  it.each([undefined, "", "0", "true", "yes", " 1"])("is off for %j", (raw) => {
    expect(governanceV2Enabled(raw)).toBe(false);
  });
});
