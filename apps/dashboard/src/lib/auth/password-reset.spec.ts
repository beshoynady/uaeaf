import { describe, expect, it } from "vitest";
import { UpstreamError } from "../api/upstream";
import { translateResetRequestFailure, translateResetSubmitFailure } from "./password-reset";

describe("translateResetRequestFailure", () => {
  it("reports a missing endpoint as an availability problem, never as success", () => {
    // POST /auth/forgot-password does not exist yet. A 404 here means the
    // route is absent, not that the address is unknown — and telling the
    // user "check your email" when nothing was sent is the one outcome this
    // screen must never produce.
    expect(translateResetRequestFailure(new UpstreamError(404, {}))).toEqual({
      status: 502,
      code: "serviceUnavailable",
      retryAfterSeconds: null,
    });
  });

  it("surfaces throttling with the wait when the throttler gave one", () => {
    expect(
      translateResetRequestFailure(new UpstreamError(429, {}, new Headers({ "retry-after": "30" }))),
    ).toEqual({ status: 429, code: "tooManyAttempts", retryAfterSeconds: 30 });
  });

  it("reports anything else as an availability problem", () => {
    expect(translateResetRequestFailure(new Error("connect ECONNREFUSED"))).toEqual({
      status: 502,
      code: "serviceUnavailable",
      retryAfterSeconds: null,
    });
  });
});

describe("translateResetSubmitFailure", () => {
  it.each([400, 404, 410])(
    "collapses %i into one token message, so a used link and an unknown one look identical",
    (status) => {
      expect(translateResetSubmitFailure(new UpstreamError(status, { message: "Invalid token." }))).toEqual({
        status: 400,
        code: "invalidToken",
        retryAfterSeconds: null,
      });
    },
  );

  it("keeps a password rejection separate, because that one the user can fix", () => {
    expect(
      translateResetSubmitFailure(
        new UpstreamError(400, { message: ["password must be longer than or equal to 12 characters"] }),
      ),
    ).toEqual({ status: 400, code: "weakPassword", retryAfterSeconds: null });
  });

  it("surfaces throttling as its own code", () => {
    expect(translateResetSubmitFailure(new UpstreamError(429, {}))).toEqual({
      status: 429,
      code: "tooManyAttempts",
      retryAfterSeconds: null,
    });
  });

  it("reports a transport failure as an availability problem", () => {
    expect(translateResetSubmitFailure(new Error("socket hang up"))).toEqual({
      status: 502,
      code: "serviceUnavailable",
      retryAfterSeconds: null,
    });
  });
});
