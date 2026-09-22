// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The footer screen's route handler (ADR-0092 D12), called the way Next calls
 * it. `forwardWrite` is stubbed: under test is what leaves for the API and
 * where it goes — the footer's three fields, to the footer's own route, and
 * nothing when the body is not the footer's shape.
 */
const forwardWrite = vi.fn();

vi.mock("@/lib/api/admin-write", () => ({
  forwardWrite: (path: string, init: unknown) => forwardWrite(path, init) as unknown,
}));

const { PUT } = await import("./route");

const put = (body: unknown) =>
  new Request("http://localhost/api/admin/site-settings/footer", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  forwardWrite.mockReset();
  forwardWrite.mockResolvedValue(new Response(null, { status: 200 }));
});

describe("PUT /api/admin/site-settings/footer", () => {
  it("forwards the footer's fields, and only those, to the footer's route", async () => {
    const footer = {
      footerAboutBlurb: { ar: "وصف", en: "About" },
      copyrightText: null,
      footerHeadings: { quickLinks: null, location: { ar: "الموقع", en: "Location" }, contact: null },
    };

    await PUT(put({ ...footer, systemEmailSender: "x@uaeaf.ae" }));

    expect(forwardWrite).toHaveBeenCalledWith("/site-settings/footer", { method: "PUT", body: footer });
  });

  it("refuses a body that is not the footer's shape, and sends nothing", async () => {
    const response = await PUT(put({ copyrightText: "© UAEAF" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "invalidRequest" });
    expect(forwardWrite).not.toHaveBeenCalled();
  });
});
