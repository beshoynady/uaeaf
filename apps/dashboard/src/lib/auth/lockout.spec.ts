import { describe, expect, it } from "vitest";
import { formatCountdown, parseRetryAfter } from "./lockout";

const NOW = Date.parse("2026-09-08T12:00:00Z");

describe("parseRetryAfter", () => {
  it("returns null when the API sent no header", () => {
    // The load-bearing case today: the API does not send Retry-After on a
    // lockout, so the UI must say "up to 15 minutes" rather than run a
    // countdown it cannot honour. The moment the header appears, the
    // countdown turns itself on with no further change here.
    expect(parseRetryAfter(null, NOW)).toBeNull();
    expect(parseRetryAfter("", NOW)).toBeNull();
  });

  it("reads delta-seconds", () => {
    expect(parseRetryAfter("900", NOW)).toBe(900);
    expect(parseRetryAfter("  60  ", NOW)).toBe(60);
  });

  it("reads an HTTP-date, rounding up so the form never unlocks a moment early", () => {
    expect(parseRetryAfter("Tue, 08 Sep 2026 12:05:30 GMT", NOW)).toBe(330);
  });

  it("treats an elapsed deadline as zero rather than a negative wait", () => {
    expect(parseRetryAfter("Tue, 08 Sep 2026 11:59:00 GMT", NOW)).toBe(0);
    expect(parseRetryAfter("-30", NOW)).toBe(0);
  });

  it.each(["soon", "15m", "NaN", "1e3"])("returns null for the unparseable %p", (value) => {
    expect(parseRetryAfter(value, NOW)).toBeNull();
  });

  it("refuses an implausible wait instead of showing a four-hour clock", () => {
    // A day-long countdown is far more likely to be a bad header than a real
    // lockout; falling back to the static message is the safe direction.
    expect(parseRetryAfter("86400", NOW)).toBeNull();
  });
});

describe("formatCountdown", () => {
  it.each([
    [900, "15:00"],
    [61, "01:01"],
    [9, "00:09"],
    [0, "00:00"],
  ])("renders %i seconds as %s", (seconds, expected) => {
    expect(formatCountdown(seconds)).toBe(expected);
  });

  it("never renders a negative clock", () => {
    expect(formatCountdown(-5)).toBe("00:00");
  });

  it("keeps minutes past the hour rather than wrapping to zero", () => {
    expect(formatCountdown(3661)).toBe("61:01");
  });
});
