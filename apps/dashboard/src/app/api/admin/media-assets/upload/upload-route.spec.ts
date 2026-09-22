// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The upload handler, called the way Next calls it.
 *
 * `callUpstream` is stubbed: under test is which upstream path the bytes are
 * sent to. The browser may ask for the icon purpose; it may not choose the
 * path, so anything else it puts in the query reaches the page path.
 */
const callUpstream = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/lib/auth/session-cookies", () => ({
  readAccessToken: () => "token",
}));
vi.mock("@/lib/api/upstream", () => ({
  callUpstream: (path: string, init: unknown) => callUpstream(path, init) as unknown,
}));

const { POST } = await import("./route");

const upload = (query = "") => {
  const form = new FormData();
  form.set("file", new File([new Uint8Array([1])], "icon.png", { type: "image/png" }));
  return new Request(`http://localhost/api/admin/media-assets/upload${query}`, { method: "POST", body: form });
};

const forwardedPath = () => callUpstream.mock.calls[0]?.[0] as string;

beforeEach(() => {
  callUpstream.mockReset();
  callUpstream.mockResolvedValue({ _id: "n1" });
});

describe("POST /api/admin/media-assets/upload", () => {
  it("sends a page image to the page path", async () => {
    await POST(upload());
    expect(forwardedPath()).toBe("/media-assets/upload");
  });

  it("sends an icon to the icon purpose (owner request 2026-09-22)", async () => {
    await POST(upload("?purpose=icon"));
    expect(forwardedPath()).toBe("/media-assets/upload?purpose=icon");
  });

  it("does not let the query reach the upstream path", async () => {
    await POST(upload("?purpose=icon%26scope%3Dlibrary"));
    await POST(upload("?purpose=../../users"));

    expect(callUpstream.mock.calls.map(([path]) => path)).toEqual(["/media-assets/upload", "/media-assets/upload"]);
  });
});
