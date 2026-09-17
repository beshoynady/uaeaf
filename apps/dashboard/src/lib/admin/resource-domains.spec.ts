import { describe, expect, it } from "vitest";
import {
  MAPPED_RESOURCE_COUNT,
  RESOURCE_DOMAINS,
  UNCLASSIFIED_DOMAIN_KEY,
  domainKeyFor,
  domainOrder,
} from "./resource-domains";

describe("resource domains", () => {
  it("covers every resource the API declares", () => {
    // PERMISSION_RESOURCES had 63 entries when this map was derived, and 64
    // once `auditLogs` was added later the same day with the trail's read
    // endpoint, and 68 once Domain 9 (sponsors, sponsorships, partnerships,
    // memberships) was built on 2026-09-17 (ADR-0085). If the API grows
    // another, this figure moves and the failure is the reminder to re-derive
    // rather than let a resource fall silently into the unclassified bucket.
    expect(MAPPED_RESOURCE_COUNT).toBe(68);
  });

  it("names a domain for every module the API actually has", () => {
    expect(Object.keys(RESOURCE_DOMAINS)).toHaveLength(10);
  });

  it.each([
    ["users", "platform-administration"],
    ["albums", "media-center"],
    ["athletes", "people-organizations"],
    ["workflowSteps", "workflow"],
    ["auditLogs", "workflow"],
    ["heroSlides", "cms-page-composition"],
    ["sponsors", "sponsorship-relations"],
    ["sponsorships", "sponsorship-relations"],
    ["partnerships", "sponsorship-relations"],
    ["memberships", "sponsorship-relations"],
  ])("places %s in %s", (resource, domain) => {
    expect(domainKeyFor(resource)).toBe(domain);
  });

  it("puts a resource it has never heard of somewhere visible rather than dropping it", () => {
    // Hiding an unknown resource would hide a real permission from the only
    // screen that can grant it.
    expect(domainKeyFor("somethingAddedLater")).toBe(UNCLASSIFIED_DOMAIN_KEY);
  });

  it("sorts the unclassified bucket last", () => {
    expect(domainOrder(UNCLASSIFIED_DOMAIN_KEY)).toBeGreaterThan(domainOrder("cms-page-composition"));
  });

  it("orders groups by the schema specification's own domain numbering", () => {
    const keys = Object.keys(RESOURCE_DOMAINS).sort((a, b) => domainOrder(a) - domainOrder(b));
    expect(keys[0]).toBe("federation-governance");
    expect(keys.at(-1)).toBe("cms-page-composition");
  });
});
