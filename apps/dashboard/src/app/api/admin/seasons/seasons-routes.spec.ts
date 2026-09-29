import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The season route handlers, called the way Next calls them.
 *
 * `callUpstream` is stubbed and `UpstreamError` is the real class: what is
 * under test is which upstream path and method each handler chooses, that a
 * malformed request never leaves this application, and that the API's answer
 * — success or refusal — reaches the browser under the right status and code.
 */
const callUpstream = vi.fn();

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
vi.mock("@/lib/auth/session-cookies", () => ({ readAccessToken: () => "token" }));
vi.mock("@/lib/api/upstream", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/upstream")>();
  return { ...actual, callUpstream: (path: string, init: unknown) => callUpstream(path, init) as unknown };
});

const { UpstreamError } = await import("@/lib/api/upstream");
const list = await import("./route");
const one = await import("./[id]/route");
const publish = await import("./[id]/publish/route");
const setCurrent = await import("./[id]/set-current/route");
const unarchive = await import("./[id]/unarchive/route");
const submit = await import("./[id]/submit/route");

const ID = "66f0a1b2c3d4e5f607182901";
const params = (id = ID) => ({ params: Promise.resolve({ id }) });
const request = (body?: unknown, method = "POST") =>
  new Request("http://localhost/api/admin/seasons", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const validSeason = {
  name: { ar: "موسم 2026–2027", en: "Season 2026–2027" },
  shortName: "26/27",
  about: { ar: "نبذة", en: "About" },
  startDate: "2026-08-31T20:00:00.000Z",
  endDate: "2027-08-30T20:00:00.000Z",
  phases: [
    {
      name: { ar: "الإعداد", en: "Preparation" },
      type: "preparation",
      from: "2026-08-31T20:00:00.000Z",
      to: "2026-11-29T20:00:00.000Z",
    },
  ],
  keyDates: [{ title: { ar: "فتح التسجيل", en: "Registration opens" }, date: "2026-09-30T20:00:00.000Z" }],
  documentIds: [],
  isVisible: false,
};

type Call = [string, { method: string; body: Record<string, unknown> }];

beforeEach(() => {
  callUpstream.mockReset();
  callUpstream.mockResolvedValue({ _id: ID });
});

describe("GET /api/admin/seasons", () => {
  it("reads the admin list upstream", async () => {
    callUpstream.mockResolvedValue([{ _id: ID }]);
    const response = await list.GET();
    expect(callUpstream).toHaveBeenCalledWith("/seasons", { accessToken: "token" });
    expect(await response.json()).toEqual([{ _id: ID }]);
  });
});

describe("POST /api/admin/seasons", () => {
  it("creates through POST /seasons with the whitelisted body", async () => {
    const response = await list.POST(
      request({ ...validSeason, slug: "2026-2027", publicationState: "Draft", stray: "dropped" }),
    );
    expect(response.status).toBe(200);
    const [path, init] = callUpstream.mock.calls[0] as Call;
    expect(path).toBe("/seasons");
    expect(init.method).toBe("POST");
    expect(init.body.slug).toBe("2026-2027");
    expect(init.body).not.toHaveProperty("stray");
  });

  it("refuses Published at creation and forwards nothing", async () => {
    const response = await list.POST(request({ ...validSeason, slug: "2026-2027", publicationState: "Published" }));
    expect(response.status).toBe(400);
    expect(callUpstream).not.toHaveBeenCalled();
  });

  it("refuses a phase of an unknown type and forwards nothing", async () => {
    const phases = [{ ...validSeason.phases[0], type: "offseason" }];
    const response = await list.POST(request({ ...validSeason, phases, slug: "2026-2027", publicationState: "Draft" }));
    expect(response.status).toBe(400);
    expect(callUpstream).not.toHaveBeenCalled();
  });

  it("names a create's plain conflict as the taken address", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code: "conflict" }));
    const response = await list.POST(request({ ...validSeason, slug: "2026-2027", publicationState: "Draft" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "seasonSlugTaken" });
  });

  it.each([["seasonOverlap"], ["seasonPhaseOverlap"]])("keeps the API's %s on a create", async (code) => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code }));
    const response = await list.POST(request({ ...validSeason, slug: "2026-2027", publicationState: "Draft" }));
    expect(await response.json()).toEqual({ code });
  });

  it("keeps the 422 for a range that ends before it starts, rather than a 502", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(422, { code: "badRequest" }));
    const response = await list.POST(request({ ...validSeason, slug: "2026-2027", publicationState: "Draft" }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: "seasonRangeInvalid" });
  });
});

describe("/api/admin/seasons/[id]", () => {
  it("reads one season", async () => {
    await one.GET(request(undefined, "GET"), params());
    expect(callUpstream).toHaveBeenCalledWith(`/seasons/${ID}`, { accessToken: "token" });
  });

  it("patches without the address or the state, and passes a clear as null", async () => {
    await one.PATCH(
      request({ ...validSeason, slug: "renamed", publicationState: "Archived", tagline: null }, "PATCH"),
      params(),
    );
    const [path, init] = callUpstream.mock.calls[0] as Call;
    expect(path).toBe(`/seasons/${ID}`);
    expect(init.method).toBe("PATCH");
    expect(init.body).not.toHaveProperty("slug");
    expect(init.body).not.toHaveProperty("publicationState");
    expect(init.body.tagline).toBeNull();
  });

  it.each([["seasonOverlap"], ["seasonPhaseOverlap"]])("keeps the API's %s on an edit", async (code) => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code }));
    const response = await one.PATCH(request(validSeason, "PATCH"), params());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code });
  });

  it("does not guess at an edit's plain conflict", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code: "conflict" }));
    const response = await one.PATCH(request(validSeason, "PATCH"), params());
    expect(await response.json()).toEqual({ code: "conflict" });
  });

  it("archives with DELETE and names the still-referenced refusal as the season's own", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code: "stillReferenced" }));
    const response = await one.DELETE(request(undefined, "DELETE"), params());
    expect(callUpstream).toHaveBeenCalledWith(`/seasons/${ID}`, { method: "DELETE", accessToken: "token" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "seasonHasContent" });
  });

  it("reports an empty answer as a missing season, not a success", async () => {
    callUpstream.mockResolvedValue(null);
    const response = await one.DELETE(request(undefined, "DELETE"), params());
    expect(response.status).toBe(404);
  });

  it("refuses a malformed id without calling upstream", async () => {
    const response = await one.PATCH(request(validSeason, "PATCH"), params("not-an-id"));
    expect(response.status).toBe(404);
    expect(callUpstream).not.toHaveBeenCalled();
  });
});

describe("the three season actions", () => {
  it("publishes with the version the editor read", async () => {
    await publish.PATCH(request({ expectedUpdatedAt: "2026-09-29T10:00:00.000Z" }, "PATCH"), params());
    expect(callUpstream).toHaveBeenCalledWith(`/seasons/${ID}/publish`, {
      method: "PATCH",
      body: { expectedUpdatedAt: "2026-09-29T10:00:00.000Z" },
      accessToken: "token",
    });
  });

  it("refuses a publish without a version", async () => {
    const response = await publish.PATCH(request({}, "PATCH"), params());
    expect(response.status).toBe(400);
    expect(callUpstream).not.toHaveBeenCalled();
  });

  it("names the policy's review refusal as the season's own", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code: "workflowRequired" }));
    const response = await publish.PATCH(
      request({ expectedUpdatedAt: "2026-09-29T10:00:00.000Z" }, "PATCH"),
      params(),
    );
    expect(await response.json()).toEqual({ code: "seasonNeedsReview" });
  });

  it("passes a stale-version refusal through under the shared name", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code: "staleRecord" }));
    const response = await publish.PATCH(
      request({ expectedUpdatedAt: "2026-09-29T10:00:00.000Z" }, "PATCH"),
      params(),
    );
    expect(await response.json()).toEqual({ code: "staleRecord" });
  });

  it("names a publish refused for a missing banner", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code: "missingRequiredField" }));
    const response = await publish.PATCH(
      request({ expectedUpdatedAt: "2026-09-29T10:00:00.000Z" }, "PATCH"),
      params(),
    );
    expect(await response.json()).toEqual({ code: "seasonBannerMissing" });
  });

  it("sends for approval through POST :id/submit, with no body", async () => {
    await submit.POST(request({ workflowDefinitionId: "66f0a1b2c3d4e5f607182999" }), params());
    expect(callUpstream).toHaveBeenCalledWith(`/seasons/${ID}/submit`, { method: "POST", accessToken: "token" });
  });

  it("refuses a submit for a malformed id without calling upstream", async () => {
    const response = await submit.POST(request(), params("nope"));
    expect(response.status).toBe(404);
    expect(callUpstream).not.toHaveBeenCalled();
  });

  it.each([
    ["conflict", "seasonPublishDirectly"],
    ["activeWorkflowExists", "seasonReviewInProgress"],
    ["missingRequiredField", "seasonBannerMissing"],
  ])("names a submit refused with %s as %s", async (apiCode, code) => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code: apiCode }));
    const response = await submit.POST(request(), params());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code });
  });

  it("leaves a submit refused for a missing policy under the shared name", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(409, { code: "publishingPolicyMissing" }));
    const response = await submit.POST(request(), params());
    expect(await response.json()).toEqual({ code: "publishingPolicyMissing" });
  });

  it("sets the current season", async () => {
    await setCurrent.PATCH(request(undefined, "PATCH"), params());
    expect(callUpstream).toHaveBeenCalledWith(`/seasons/${ID}/set-current`, { method: "PATCH", accessToken: "token" });
  });

  it("unarchives through its own segment", async () => {
    await unarchive.POST(request(), params());
    expect(callUpstream).toHaveBeenCalledWith(`/seasons/${ID}/unarchive`, { method: "POST", accessToken: "token" });
  });
});
