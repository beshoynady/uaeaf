import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { classifyAlbumFailure } from "./route-support";
import { UpstreamError } from "@/lib/api/upstream";

/**
 * The album refusals the shared classifier would fold away. A 422 there
 * becomes a 502 "service unavailable" — the one sentence that sends an editor
 * to wait for a server instead of fixing a field.
 */
describe("classifyAlbumFailure", () => {
  it("names the affiliation 422 as the album's own refusal, keeping its status", () => {
    const error = new UpstreamError(422, { code: "unprocessableEntity", message: "..." });
    expect(classifyAlbumFailure(error, "write")).toEqual({ status: 422, code: "affiliationIncoherent" });
  });

  it("reads a 409 by the route it came from", () => {
    const conflict = new UpstreamError(409, { code: "conflict" });
    expect(classifyAlbumFailure(conflict, "order")).toEqual({ status: 409, code: "photoOrderStale" });
    expect(classifyAlbumFailure(conflict, "create")).toEqual({ status: 409, code: "albumSlugTaken" });
  });

  it("leaves every other failure to the shared vocabulary", () => {
    expect(classifyAlbumFailure(new UpstreamError(403, { code: "forbidden" }), "write")).toEqual({
      status: 403,
      code: "forbidden",
    });
    expect(classifyAlbumFailure(new Error("network"), "write")).toEqual({ status: 502, code: "serviceUnavailable" });
  });
});
