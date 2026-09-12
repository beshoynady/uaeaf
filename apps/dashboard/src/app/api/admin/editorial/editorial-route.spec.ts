import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The generic editorial handlers, called the way Next calls them.
 *
 * `forwardWrite` is stubbed: what is under test here is which upstream path
 * this app decides to send a request to, and whether it refuses the requests
 * it must refuse. Whether the forward itself maps the API's codes correctly
 * is `admin-write.spec.ts`'s job.
 */
const forwardWrite = vi.fn();

vi.mock("@/lib/api/admin-write", () => ({
  forwardWrite: (path: string, init: unknown) => forwardWrite(path, init) as unknown,
}));

const { POST } = await import("./[entityType]/[id]/[action]/route");
const { PATCH } = await import("./[entityType]/[id]/route");

function request(body?: unknown): Request {
  return new Request("http://localhost/api/admin/editorial/x/y/z", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function params(values: Record<string, string>) {
  return { params: Promise.resolve(values) } as never;
}

beforeEach(() => {
  forwardWrite.mockReset();
  forwardWrite.mockReturnValue(new Response(null, { status: 200 }));
});

describe("POST /api/admin/editorial/[entityType]/[id]/[action]", () => {
  it("forwards a registered action on a registered type", async () => {
    await POST(
      request({ expectedUpdatedAt: "2026-09-12T00:00:00.000Z" }),
      params({ entityType: "presidentMessagePage", id: "abc", action: "publish" }),
    );

    expect(forwardWrite).toHaveBeenCalledWith("/president-message-page/abc/publish", {
      method: "POST",
      body: { expectedUpdatedAt: "2026-09-12T00:00:00.000Z" },
    });
  });

  it("sends a review decision to the workflow instance, not to the record", async () => {
    await POST(
      request({ reason: "Needs a stronger lede" }),
      params({ entityType: "presidentMessagePage", id: "wf1", action: "reject" }),
    );

    expect(forwardWrite).toHaveBeenCalledWith("/workflow-instances/wf1/reject", {
      method: "POST",
      body: { reason: "Needs a stronger lede" },
    });
  });

  // The point of the registry: without it the URL chooses the upstream
  // module, and nothing here would stop it.
  it("refuses an unregistered entity type and forwards nothing", async () => {
    const response = await POST(
      request({}),
      params({ entityType: "users", id: "abc", action: "publish" }),
    );

    expect(response.status).toBe(404);
    expect(forwardWrite).not.toHaveBeenCalled();
  });

  it("refuses delegate, which is disabled upstream", async () => {
    const response = await POST(
      request({}),
      params({ entityType: "presidentMessagePage", id: "abc", action: "delegate" }),
    );

    expect(response.status).toBe(404);
    expect(forwardWrite).not.toHaveBeenCalled();
  });

  it("refuses any other invented action", async () => {
    for (const action of ["delete", "archive", "unpublish"]) {
      const response = await POST(
        request({}),
        params({ entityType: "presidentMessagePage", id: "abc", action }),
      );
      expect(response.status).toBe(404);
    }
    expect(forwardWrite).not.toHaveBeenCalled();
  });

  // `submit` and `approve` carry nothing, so an empty body is legitimate and
  // must not be read as a malformed one.
  it("accepts an empty body", async () => {
    await POST(
      new Request("http://localhost/x", { method: "POST" }),
      params({ entityType: "presidentMessagePage", id: "abc", action: "submit" }),
    );

    expect(forwardWrite).toHaveBeenCalledWith("/president-message-page/abc/submit", {
      method: "POST",
      body: {},
    });
  });

  it("refuses a malformed body", async () => {
    const response = await POST(
      new Request("http://localhost/x", { method: "POST", body: "{not json" }),
      params({ entityType: "presidentMessagePage", id: "abc", action: "publish" }),
    );

    expect(response.status).toBe(400);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/editorial/[entityType]/[id]", () => {
  it("patches the record itself", async () => {
    await PATCH(
      new Request("http://localhost/x", {
        method: "PATCH",
        body: JSON.stringify({ heroTitle: { ar: "ع", en: "e" } }),
      }),
      params({ entityType: "presidentMessagePage", id: "abc" }),
    );

    expect(forwardWrite).toHaveBeenCalledWith("/president-message-page/abc", {
      method: "PATCH",
      body: { heroTitle: { ar: "ع", en: "e" } },
    });
  });

  it("refuses an unregistered entity type", async () => {
    const response = await PATCH(
      new Request("http://localhost/x", { method: "PATCH", body: "{}" }),
      params({ entityType: "siteSettings", id: "abc" }),
    );

    expect(response.status).toBe(404);
    expect(forwardWrite).not.toHaveBeenCalled();
  });

  it("refuses a malformed body rather than saving an empty draft", async () => {
    const response = await PATCH(
      new Request("http://localhost/x", { method: "PATCH", body: "{not json" }),
      params({ entityType: "presidentMessagePage", id: "abc" }),
    );

    expect(response.status).toBe(400);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});
