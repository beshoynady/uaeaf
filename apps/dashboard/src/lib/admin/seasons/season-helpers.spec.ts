import { describe, expect, it } from "vitest";
import { publishModeOf } from "./publish-mode";
import { dayToInstant, formatSeasonDay, instantToDay } from "./season-dates";
import { toDocumentOptions, toSeasonSponsors } from "./editor-screen";

describe("publishModeOf", () => {
  it("offers the direct door when the policy says no review", () => {
    expect(publishModeOf({ workflowRequired: false }, true)).toBe("direct");
  });

  it("offers approval when the policy requires a review", () => {
    expect(publishModeOf({ workflowRequired: true }, true)).toBe("approval");
  });

  it("treats no policy as direct, as the API does (noPolicy publishes by permission)", () => {
    expect(publishModeOf(null, true)).toBe("direct");
  });

  it("claims nothing when the policy could not be read", () => {
    expect(publishModeOf({ workflowRequired: true }, false)).toBe("unknown");
    expect(publishModeOf({ unexpected: 1 }, true)).toBe("unknown");
  });
});

describe("season dates on the Dubai calendar", () => {
  it("stores a day as Dubai midnight in UTC", () => {
    expect(dayToInstant("2026-09-01")).toBe("2026-08-31T20:00:00.000Z");
  });

  it("reads that instant back as the same day, not the UTC day before", () => {
    expect(instantToDay("2026-08-31T20:00:00.000Z")).toBe("2026-09-01");
  });

  it("refuses a malformed day rather than storing an Invalid Date", () => {
    expect(dayToInstant("")).toBeNull();
    expect(dayToInstant("1/9/2026")).toBeNull();
  });

  it("prints the Dubai day with Latin digits in Arabic", () => {
    expect(formatSeasonDay("2026-08-31T20:00:00.000Z", "ar")).toMatch(/^1 .+ 2026$/);
    expect(formatSeasonDay("2026-08-31T20:00:00.000Z", "en")).toBe("1 September 2026");
  });
});

describe("the documents and sponsors the form offers", () => {
  it("labels a document by its file name in each language, falling back to the other", () => {
    const options = toDocumentOptions([
      { _id: "d1", file: { ar: { filename: "روزنامة.pdf" }, en: { filename: "calendar.pdf" } } },
      { _id: "d2", file: { en: { filename: "only-en.pdf" } } },
      { file: {} },
    ]);
    expect(options).toEqual([
      { id: "d1", label: { ar: "روزنامة.pdf", en: "calendar.pdf" } },
      { id: "d2", label: { ar: "only-en.pdf", en: "only-en.pdf" } },
    ]);
  });

  it("lists only the sponsorships that target this season", () => {
    const sponsorships = [
      { _id: "s1", sponsorId: "p1", targetType: "Season", targetId: "season-1" },
      { _id: "s2", sponsorId: "p2", targetType: "Season", targetId: "season-2" },
      { _id: "s3", sponsorId: "p3", targetType: "Federation", targetId: null },
    ];
    const sponsors = [{ _id: "p1", name: { ar: "راعٍ", en: "Sponsor" } }];
    expect(toSeasonSponsors(sponsorships, sponsors, "season-1", "ar")).toEqual([{ id: "p1", name: "راعٍ" }]);
  });
});
