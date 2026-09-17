import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The sponsors, sponsorships, partnerships and memberships write handlers, and
 * the SPONSORS section's settings, called the way Next calls them (ADR-0085).
 *
 * `forwardWrite` and `forwardRead` are stubbed: under test is which upstream
 * path a request reaches, what body it carries, and what is refused before it
 * leaves — above all a section write aimed at a section that is not SPONSORS,
 * which would replace another section's configuration.
 */
const forwardWrite = vi.fn();
const forwardRead = vi.fn();

vi.mock("@/lib/api/admin-write", () => ({
  forwardWrite: (path: string, init: unknown) => forwardWrite(path, init) as unknown,
  forwardRead: (path: string) => forwardRead(path) as unknown,
}));

const sponsors = await import("./route");
const sponsor = await import("./[id]/route");
const sponsorships = await import("../sponsorships/route");
const partnership = await import("../partnerships/[id]/route");
const memberships = await import("../memberships/route");
const section = await import("../sponsors-section/[id]/route");
const strip = await import("../site-settings/sponsor-strip/route");

const ID = "6aaa8685b455d12b5c80d0dd";

const request = (body?: unknown) =>
  new Request("http://localhost/api/admin/x", { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

const params = (values: Record<string, string>) => ({ params: Promise.resolve(values) }) as never;

beforeEach(() => {
  forwardWrite.mockReset();
  forwardRead.mockReset();
  forwardWrite.mockReturnValue(new Response(null, { status: 200 }));
});

describe("create and edit", () => {
  it("forwards a new sponsor with its own fields only", async () => {
    await sponsors.POST(request({ name: { ar: null, en: "Demo" }, logoId: ID, isDemo: true }));
    expect(forwardWrite).toHaveBeenCalledWith("/sponsors", { method: "POST", body: { name: { ar: null, en: "Demo" }, logoId: ID } });
  });

  it("forwards a sponsor edit and a deletion to that sponsor", async () => {
    await sponsor.PATCH(request({ website: "https://x.test", restricted: {} }), params({ id: ID }));
    await sponsor.DELETE(request(), params({ id: ID }));
    expect(forwardWrite).toHaveBeenNthCalledWith(1, `/sponsors/${ID}`, { method: "PATCH", body: { website: "https://x.test" } });
    expect(forwardWrite).toHaveBeenNthCalledWith(2, `/sponsors/${ID}`, { method: "DELETE" });
  });

  it("routes each entity to its own API path", async () => {
    await sponsorships.POST(request({ sponsorId: ID, tier: "Official" }));
    await partnership.PATCH(request({ isVisible: true }), params({ id: ID }));
    await memberships.POST(request({ organizationName: { ar: "أ", en: null } }));
    expect(forwardWrite.mock.calls.map(([path]) => path)).toEqual(["/sponsorships", `/partnerships/${ID}`, "/memberships"]);
  });

  it("refuses an id that is not an id before anything is forwarded", async () => {
    const response = await sponsor.PATCH(request({}), params({ id: "../roles" }));
    expect(response.status).toBe(404);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/sponsors-section/[id]", () => {
  const body = { configuration: { bannerSponsorshipId: ID }, ctaText: null, ctaUrl: null };

  it("forwards the banner preference and call to action to a SPONSORS section", async () => {
    forwardRead.mockResolvedValue(Response.json({ _id: ID, sectionType: "SPONSORS" }));

    await section.PATCH(request(body), params({ id: ID }));

    expect(forwardRead).toHaveBeenCalledWith(`/page-sections/${ID}`);
    expect(forwardWrite).toHaveBeenCalledWith(`/page-sections/${ID}`, { method: "PATCH", body });
  });

  it("refuses a section that is not SPONSORS, so the hero's settings can never be replaced from here", async () => {
    forwardRead.mockResolvedValue(Response.json({ _id: ID, sectionType: "HERO" }));

    const response = await section.PATCH(request(body), params({ id: ID }));

    expect(response.status).toBe(404);
    expect(forwardWrite).not.toHaveBeenCalled();
  });

  it("passes a refused read through as it came", async () => {
    forwardRead.mockResolvedValue(Response.json({ code: "forbidden" }, { status: 403 }));

    const response = await section.PATCH(request(body), params({ id: ID }));

    expect(response.status).toBe(403);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});

describe("PUT /api/admin/site-settings/sponsor-strip", () => {
  it("forwards the whole strip settings", async () => {
    const settings = { isVisible: true, displayMode: "logo", selection: "allActive", sponsorshipIds: [], order: "tier", pinTopTier: false, speed: "slow" };
    await strip.PUT(request(settings));
    expect(forwardWrite).toHaveBeenCalledWith("/site-settings/sponsor-strip", { method: "PUT", body: settings });
  });

  it("refuses incomplete settings", async () => {
    const response = await strip.PUT(request({ isVisible: true }));
    expect(response.status).toBe(400);
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});
