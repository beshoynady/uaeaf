import { describe, expect, it } from "vitest";
import { chunkCookieValue, chunkName, readChunkedCookie, staleChunkNames } from "./cookie-chunks";

describe("chunkCookieValue", () => {
  it("leaves a small value as a single chunk", () => {
    expect(chunkCookieValue("short-token")).toEqual(["short-token"]);
  });

  it("splits a value that exceeds the per-cookie budget", () => {
    const value = "x".repeat(9000);

    const chunks = chunkCookieValue(value);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(value);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(3600);
    }
  });

  it("splits a real-sized admin token into four chunks", () => {
    // The token that forced this module to exist: 164 permissions embedded
    // in the JWT produce ~11.4 KB, against a 4096-byte per-cookie limit.
    expect(chunkCookieValue("x".repeat(11384))).toHaveLength(4);
  });
});

describe("readChunkedCookie", () => {
  function jar(entries: Record<string, string>) {
    return (name: string) => entries[name];
  }

  it("reads back a single-chunk value", () => {
    expect(readChunkedCookie(jar({ "tok.0": "abc" }), "tok")).toBe("abc");
  });

  it("reassembles chunks in order", () => {
    expect(readChunkedCookie(jar({ "tok.0": "aaa", "tok.1": "bbb", "tok.2": "ccc" }), "tok")).toBe(
      "aaabbbccc",
    );
  });

  it("returns null when no chunk is present", () => {
    expect(readChunkedCookie(jar({}), "tok")).toBeNull();
  });

  it("returns null when a middle chunk is missing rather than silently truncating", () => {
    // A partially-delivered cookie must read as "no session", not as a
    // corrupt token — the API would reject the truncated JWT with a 401 the
    // user would experience as a random logout with no explanation.
    expect(readChunkedCookie(jar({ "tok.0": "aaa", "tok.2": "ccc" }), "tok")).toBeNull();
  });

  it("round-trips a value that had to be split", () => {
    const value = "y".repeat(11384);
    const entries = Object.fromEntries(
      chunkCookieValue(value).map((chunk, index) => [chunkName("tok", index), chunk]),
    );

    expect(readChunkedCookie(jar(entries), "tok")).toBe(value);
  });
});

describe("staleChunkNames", () => {
  it("names the chunks a shorter value leaves behind", () => {
    // A user whose permissions shrink gets a smaller token. Without this,
    // chunk 3 from the previous login would survive and be appended to the
    // new token, producing an unparseable value on every later request.
    expect(staleChunkNames("tok", 2, 4)).toEqual(["tok.2", "tok.3"]);
  });

  it("names nothing when the value grew or stayed the same size", () => {
    expect(staleChunkNames("tok", 4, 4)).toEqual([]);
    expect(staleChunkNames("tok", 5, 3)).toEqual([]);
  });
});
