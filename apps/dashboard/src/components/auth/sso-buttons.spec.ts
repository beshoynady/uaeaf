import { describe, expect, it } from "vitest";
import { configuredProviders } from "./sso-buttons";

/**
 * The flag exists because `AUTH_PROVIDERS` in the user schema lists Google
 * and Microsoft while the API exposes no OAuth endpoint. These tests pin the
 * default that keeps the buttons off until it does.
 */
describe("configuredProviders", () => {
  it.each([undefined, "", "   "])("renders nothing when the flag is %p", (value) => {
    expect(configuredProviders(value)).toEqual([]);
  });

  it("reads a comma-separated list, tolerating spacing and case", () => {
    expect(configuredProviders(" Google , MICROSOFT ")).toEqual(["google", "microsoft"]);
  });

  it("ignores a provider the app has no button for", () => {
    // A typo in a deployment variable must not render a link to an endpoint
    // that does not exist.
    expect(configuredProviders("google,facebook")).toEqual(["google"]);
  });

  it("returns providers in the app's own order, not the variable's", () => {
    expect(configuredProviders("microsoft,google")).toEqual(["google", "microsoft"]);
  });
});
