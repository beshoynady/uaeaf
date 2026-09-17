import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The homepage hero's write handlers, called the way Next calls them.
 *
 * `forwardWrite` is stubbed: under test is which upstream path each request
 * reaches, what body it carries, and what is refused before it leaves.
 */
const forwardWrite = vi.fn();

vi.mock("@/lib/api/admin-write", () => ({
  forwardWrite: (path: string, init: unknown) => forwardWrite(path, init) as unknown,
}));

const { POST } = await import("./route");
const slide = await import("./[id]/route");
const { PATCH: REORDER } = await import("./reorder/route");
const { PATCH: SECTION } = await import("../page-sections/[id]/route");

const ID = "6aaa8685b455d12b5c80d0dd";
const OTHER = "6aaa8685b455d12b5c80d0de";

const request = (body?: unknown, raw?: string) =>
  new Request("http://localhost/api/admin/hero-slides", {
    method: "POST",
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

const params = (values: Record<string, string>) => ({ params: Promise.resolve(values) }) as never;

beforeEach(() => {
  forwardWrite.mockReset();
  forwardWrite.mockReturnValue(new Response(null, { status: 200 }));
});

describe("POST /api/admin/hero-slides", () => {
  it("forwards a new slide with only the fields a slide has", async () => {
    await POST(request({ pageSectionId: ID, mediaType: "IMAGE", displayOrder: 0, active: false, title: { ar: "", en: "" }, injected: true }));

    expect(forwardWrite).toHaveBeenCalledWith("/hero-slides", {
      method: "POST",
      body: { pageSectionId: ID, mediaType: "IMAGE", displayOrder: 0, active: false, title: { ar: "", en: "" } },
    });
  });

  it("refuses a slide with no section, or a body that is not JSON", async () => {
    const missing = await POST(request({ mediaType: "IMAGE", displayOrder: 0 }));
    const broken = await POST(request(undefined, "{not json"));

    expect(missing.status).toBe(400);
    expect(broken.status).toBe(400);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});

describe("PATCH and DELETE /api/admin/hero-slides/[id]", () => {
  it("forwards only a slide's own fields to that slide", async () => {
    await slide.PATCH(request({ title: { ar: "ع", en: "T" }, pageSectionId: OTHER, displayOrder: 3 }), params({ id: ID }));

    expect(forwardWrite).toHaveBeenCalledWith(`/hero-slides/${ID}`, {
      method: "PATCH",
      body: { title: { ar: "ع", en: "T" }, displayOrder: 3 },
    });
  });

  it("deletes the slide it names", async () => {
    await slide.DELETE(request(), params({ id: ID }));

    expect(forwardWrite).toHaveBeenCalledWith(`/hero-slides/${ID}`, { method: "DELETE" });
  });

  it("refuses an id that is not an id, so no path is built from it", async () => {
    const response = await slide.PATCH(request({ active: true }), params({ id: "../users" }));

    expect(response.status).toBe(404);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/hero-slides/reorder", () => {
  it("forwards a section's whole order", async () => {
    await REORDER(request({ pageSectionId: ID, slideIds: [OTHER, ID] }));

    expect(forwardWrite).toHaveBeenCalledWith("/hero-slides/reorder", {
      method: "PATCH",
      body: { pageSectionId: ID, slideIds: [OTHER, ID] },
    });
  });

  it("refuses an order that is not a list of ids", async () => {
    const response = await REORDER(request({ pageSectionId: ID, slideIds: ["x"] }));

    expect(response.status).toBe(400);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/page-sections/[id]", () => {
  it("forwards the hero's settings, and nothing else about the section", async () => {
    const configuration = { playback: { autoplay: true, intervalMs: 7000 } };
    await SECTION(request({ configuration, enabled: false }), params({ id: ID }));

    expect(forwardWrite).toHaveBeenCalledWith(`/page-sections/${ID}`, { method: "PATCH", body: { configuration } });
  });

  it("refuses settings that are not an object", async () => {
    const response = await SECTION(request({ configuration: "none" }), params({ id: ID }));

    expect(response.status).toBe(400);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});
