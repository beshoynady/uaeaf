import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The messages screen's one write, called the way Next calls it.
 *
 * `forwardWrite` is stubbed: under test is which upstream path the request
 * reaches, what body it carries, and what is refused before it leaves.
 */
const forwardWrite = vi.fn();

vi.mock("@/lib/api/admin-write", () => ({
  forwardWrite: (path: string, init: unknown) => forwardWrite(path, init) as unknown,
}));

const { PATCH } = await import("./[id]/status/route");

const ID = "6aaa8685b455d12b5c80d0dd";

const request = (body: unknown) =>
  new Request(`http://localhost/api/admin/contact-messages/${ID}/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

beforeEach(() => {
  forwardWrite.mockReset();
  forwardWrite.mockReturnValue(new Response(null, { status: 200 }));
});

describe("PATCH /api/admin/contact-messages/:id/status", () => {
  it("forwards the status to the message's own status route", async () => {
    await PATCH(request({ status: "Resolved", replyBody: "not this" }), params(ID));

    expect(forwardWrite).toHaveBeenCalledWith(`/contact-messages/${ID}/status`, {
      method: "PATCH",
      body: { status: "Resolved" },
    });
  });

  it("refuses an id that is not one before it reaches the upstream path", async () => {
    const response = await PATCH(request({ status: "Resolved" }), params("../users"));

    expect(response.status).toBe(404);
    expect(forwardWrite).not.toHaveBeenCalled();
  });

  it("refuses a status the API does not know", async () => {
    const response = await PATCH(request({ status: "Archived" }), params(ID));

    expect(response.status).toBe(400);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});
