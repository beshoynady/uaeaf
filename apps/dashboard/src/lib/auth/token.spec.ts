import { describe, expect, it } from "vitest";
import { decodeAccessToken, isAccessTokenUsable } from "./token";

/** Builds a structurally valid JWT with an arbitrary payload. The signature
 *  is deliberately garbage: this module must never be understood as
 *  *verifying* a token — the NestJS API is the only verifier. Everything
 *  here exists to answer "what does the browser's cookie claim, and is it
 *  worth sending at all", which is a UX question, not a security one. */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.not-a-real-signature`;
}

const validPayload = {
  sub: "6501f2a4c3b2a10012345678",
  type: "access",
  roleIds: ["6501f2a4c3b2a10087654321"],
  exp: 2_000_000_000,
};

describe("decodeAccessToken", () => {
  it("reads sub, roleIds and exp out of a well-formed access token", () => {
    const claims = decodeAccessToken(makeToken(validPayload));

    expect(claims).toEqual({
      userId: "6501f2a4c3b2a10012345678",
      roleIds: ["6501f2a4c3b2a10087654321"],
      expiresAt: 2_000_000_000,
    });
  });

  it("carries no permissions, because the token no longer has any", () => {
    // Owner decision 2026-09-07: authority is read from the database on
    // every request. What the dashboard may show comes from GET /users/me,
    // not from here — so there is nothing in this claims object that can
    // disagree with what the API will actually allow.
    const claims = decodeAccessToken(makeToken(validPayload));

    expect(claims).not.toHaveProperty("permissions");
  });

  it("accepts a user who holds no roles at all", () => {
    // A real, valid state: an Active account with no roles assigned yet.
    // It must log in and see an empty dashboard, not be treated as broken.
    const claims = decodeAccessToken(makeToken({ ...validPayload, roleIds: [] }));

    expect(claims?.roleIds).toEqual([]);
  });

  it("rejects a pre-migration token that carries permissions instead of roleIds", () => {
    // The shape minted before 2026-09-07. Returning null here is what makes
    // the migration self-healing: the proxy reads "no usable token", calls
    // /auth/refresh, and the still-valid refresh cookie mints the new shape.
    const legacy = makeToken({
      sub: validPayload.sub,
      type: "access",
      permissions: [{ resourceType: "users", action: "Read" }],
      exp: 2_000_000_000,
    });

    expect(decodeAccessToken(legacy)).toBeNull();
  });

  it("rejects a refresh token presented as an access token", () => {
    // Mirrors JwtStrategy's own `type` check server-side — a refresh token
    // names no roles, so accepting one here would render a shell for an
    // identity the API will refuse on every call.
    const refresh = makeToken({ sub: validPayload.sub, type: "refresh", sessionId: "abc", exp: 2_000_000_000 });

    expect(decodeAccessToken(refresh)).toBeNull();
  });

  it.each([
    ["an empty string", ""],
    ["a value with no dots", "not-a-jwt"],
    ["a value with too few segments", "header.payload"],
    ["a payload that is not valid base64", "header.!!!!.sig"],
  ])("returns null for %s", (_label, token) => {
    expect(decodeAccessToken(token)).toBeNull();
  });

  it("returns null when the payload decodes but is not JSON", () => {
    const notJson = Buffer.from("plain text").toString("base64url");

    expect(decodeAccessToken(`header.${notJson}.sig`)).toBeNull();
  });

  it.each([
    ["sub", { ...validPayload, sub: undefined }],
    ["exp", { ...validPayload, exp: undefined }],
  ])("returns null when %s is missing", (_label, payload) => {
    expect(decodeAccessToken(makeToken(payload))).toBeNull();
  });

  it("returns null when roleIds is present but not an array", () => {
    expect(decodeAccessToken(makeToken({ ...validPayload, roleIds: "all" }))).toBeNull();
  });

  it("decodes a payload containing non-ASCII text correctly", () => {
    // Guards the UTF-8 path of the hand-rolled base64url decoder: reading
    // the binary string straight out of atob() would turn Arabic into
    // mojibake, silently, in whatever field carried it.
    // The token's own fields are all ASCII ids, so this drives the decoder
    // through a payload that is not — the same code path every Arabic
    // display name travels.
    const claims = decodeAccessToken(makeToken({ ...validPayload, note: "مسؤول المنصة" }));

    expect(claims?.userId).toBe(validPayload.sub);
  });

  it("does not depend on Buffer, which the proxy runtime may not provide", () => {
    // The regression guard for a login that succeeded and bounced straight
    // back to the login screen: `Buffer` was undefined inside the proxy
    // bundle, the ReferenceError was caught as "malformed token", and every
    // valid session read as no session at all.
    const token = makeToken(validPayload);
    const original = globalThis.Buffer;
    try {
      // @ts-expect-error deliberately removing a global for the duration
      delete globalThis.Buffer;
      expect(decodeAccessToken(token)).not.toBeNull();
    } finally {
      globalThis.Buffer = original;
    }
  });
});

describe("isAccessTokenUsable", () => {
  const claims = { userId: "u1", roleIds: [], expiresAt: 1_000 };

  it("is usable well before expiry", () => {
    expect(isAccessTokenUsable(claims, 900_000)).toBe(true);
  });

  it("is not usable after expiry", () => {
    expect(isAccessTokenUsable(claims, 1_001_000)).toBe(false);
  });

  it("is not usable inside the skew window, so a token cannot expire mid-flight", () => {
    // 995s: still technically valid, but a request issued now could easily
    // arrive after 1000s. Treating it as spent triggers a refresh early
    // rather than producing a 401 the user would see as a random logout.
    expect(isAccessTokenUsable(claims, 995_000)).toBe(false);
  });

  it("treats null claims as unusable", () => {
    expect(isAccessTokenUsable(null, 0)).toBe(false);
  });
});
