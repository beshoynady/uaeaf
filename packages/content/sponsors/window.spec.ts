import { isInWindow, sponsorshipState } from "./window";

/**
 * When a sponsorship counts as running (ADR-0077 D2, ADR-0085 D1).
 *
 * The contract names calendar days in Dubai, so the window opens at Dubai
 * midnight of the start day and closes at the end of the end day — whatever
 * time of day the stored instants carry. Nothing is written at expiry: the
 * question is asked at every read, with the clock passed in.
 */
describe("sponsorship window", () => {
  // The real sponsor's provisional dates, as the seed stores them.
  const start = "2026-08-31T20:00:00.000Z"; // 2026-09-01 00:00 Dubai
  const end = "2027-08-31T19:59:59.000Z"; // 2027-08-31 23:59:59 Dubai

  it("opens at Dubai midnight of the start day", () => {
    expect(isInWindow(start, end, new Date("2026-08-31T20:00:00.000Z"))).toBe(true);
    expect(isInWindow(start, end, new Date("2026-08-31T19:59:00.000Z"))).toBe(false);
  });

  it("opens at Dubai midnight even when the stored start is later in that day", () => {
    const noon = "2026-09-01T08:00:00.000Z"; // 2026-09-01 12:00 Dubai
    expect(isInWindow(noon, end, new Date("2026-08-31T20:00:00.000Z"))).toBe(true);
  });

  it("stays open through the last minute of the end day in Dubai", () => {
    expect(isInWindow(start, end, new Date("2027-08-31T19:59:00.000Z"))).toBe(true);
  });

  it("closes at Dubai midnight after the end day", () => {
    expect(isInWindow(start, end, new Date("2027-08-31T20:00:00.000Z"))).toBe(false);
  });

  it("closes at the end of the end day even when the stored end is earlier in that day", () => {
    const morning = "2027-08-31T05:00:00.000Z"; // 2027-08-31 09:00 Dubai
    expect(isInWindow(start, morning, new Date("2027-08-31T19:00:00.000Z"))).toBe(true);
    expect(isInWindow(start, morning, new Date("2027-08-31T20:00:00.000Z"))).toBe(false);
  });

  it("treats a missing end as open-ended", () => {
    expect(isInWindow(start, null, new Date("2099-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("is closed for an unreadable start", () => {
    expect(isInWindow("not a date", end, new Date("2027-01-01T00:00:00.000Z"))).toBe(false);
  });

  describe("sponsorshipState", () => {
    const at = (iso: string) => new Date(iso);

    it("is upcoming before the window, active inside it and expired after it", () => {
      const base = { startDate: start, endDate: end, status: "Active" as const };
      expect(sponsorshipState(base, at("2026-01-01T00:00:00.000Z"))).toBe("upcoming");
      expect(sponsorshipState(base, at("2027-01-01T00:00:00.000Z"))).toBe("active");
      expect(sponsorshipState(base, at("2028-01-01T00:00:00.000Z"))).toBe("expired");
    });

    it("never runs while cancelled, whatever the dates", () => {
      expect(sponsorshipState({ startDate: start, endDate: end, status: "Cancelled" }, at("2027-01-01T00:00:00.000Z"))).toBe(
        "cancelled",
      );
    });

    it("reports a manually archived sponsorship as expired even inside its dates", () => {
      expect(sponsorshipState({ startDate: start, endDate: end, status: "Expired" }, at("2027-01-01T00:00:00.000Z"))).toBe(
        "expired",
      );
    });
  });
});
