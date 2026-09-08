import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, assessPassword } from "./password-strength";

describe("MIN_PASSWORD_LENGTH", () => {
  it("mirrors the only rule the API actually enforces", () => {
    // api/src/.../dto/create-user.dto.ts declares @MinLength(12) and nothing
    // else. The meter must never reject what the API would accept.
    expect(MIN_PASSWORD_LENGTH).toBe(12);
  });
});

describe("assessPassword", () => {
  it.each(["", "short", "elevenchars"])("reports %p as too short and unusable", (value) => {
    const result = assessPassword(value);
    expect(result.meetsMinimum).toBe(false);
    expect(result.strength).toBe("tooShort");
    expect(result.score).toBe(0);
  });

  it("accepts a twelve-character password even when it is only one character class", () => {
    // The advisory rating is separate from acceptance: this password is weak
    // advice-wise, but the API takes it, so the form must too.
    const result = assessPassword("abcdefghijkl");
    expect(result.meetsMinimum).toBe(true);
    expect(result.strength).toBe("weak");
  });

  it.each([
    ["abcdefghijK1", "fair"],
    ["abcdefghijK1!", "good"],
    ["abcdefghijklmnopK1!", "strong"],
  ])("rates %p as %s", (value, strength) => {
    expect(assessPassword(value).strength).toBe(strength);
  });

  it("does not let sheer length disguise a repeated character", () => {
    // 20 characters would otherwise earn the length bonus twice. Four
    // distinct characters is not entropy, however long the string is.
    expect(assessPassword("abababababababababab").strength).toBe("weak");
  });

  it("counts each character class once, so repetition inside a class adds nothing", () => {
    expect(assessPassword("aaaaaaaaaaaaaaaaaaaa").strength).toBe("weak");
  });
});
