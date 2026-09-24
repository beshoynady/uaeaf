import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PermissionGrant } from "@/lib/auth/permissions";

/**
 * Which of the five answers each address gets.
 *
 * The distinction this file exists for is the one an editor feels: a
 * broadcast that ran past its end time is *over*, not *missing*. The site
 * stops showing it with nobody pressing anything, so the moment arrives on
 * its own while a championship is still being held — and an editor told "not
 * found" about it goes looking for a record nothing deleted.
 */
const readGrants = vi.fn<() => Promise<PermissionGrant[]>>();
const fetchAsUser = vi.fn<(path: string) => Promise<unknown>>();

vi.mock("@/lib/auth/session", () => ({
  readGrants: () => readGrants(),
  fetchAsUser: (path: string) => fetchAsUser(path),
}));

const { isFinished, loadLiveEditor, toAdminLiveStream } = await import("./editor-screen");
const { UpstreamError } = await import("@/lib/api/upstream");

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const broadcast = (overrides: Record<string, unknown> = {}) => ({
  id: "6ab4c51a319a66003190e53f",
  title: { ar: "اليوم الختامي", en: "Final day" },
  venue: { ar: "استاد زايد", en: "Zayed Stadium" },
  videoId: "TESTLIVE01",
  url: "https://www.youtube.com/live/TESTLIVE01",
  startedAt: hoursFromNow(-1),
  expectedEndAt: hoursFromNow(2),
  endedAt: null,
  isActive: true,
  state: "live",
  thumbnailId: null,
  associations: [],
  ...overrides,
});

const everything: PermissionGrant[] = [
  { resourceType: "videos", action: "Create" },
  { resourceType: "videos", action: "Read" },
  { resourceType: "videos", action: "Update" },
  { resourceType: "videos", action: "Delete" },
];

beforeEach(() => {
  readGrants.mockReset();
  fetchAsUser.mockReset();
  readGrants.mockResolvedValue(everything);
});

describe("loadLiveEditor", () => {
  it("opens a running broadcast for editing", async () => {
    fetchAsUser.mockResolvedValue(broadcast());

    const screen = await loadLiveEditor("ar", "6ab4c51a319a66003190e53f");

    expect(screen.status).toBe("ready");
    if (screen.status !== "ready") return;
    expect(screen.data.record?.videoId).toBe("TESTLIVE01");
  });

  it("reports a broadcast whose time has passed as finished, not missing", async () => {
    // The championship ran long. The banner went dark on its own; the record
    // is still there, and the editor is standing in front of it.
    fetchAsUser.mockResolvedValue(
      broadcast({ startedAt: hoursFromNow(-4), expectedEndAt: hoursFromNow(-1), state: "expired" }),
    );

    const screen = await loadLiveEditor("ar", "6ab4c51a319a66003190e53f");

    expect(screen.status).toBe("finished");
  });

  it("carries the finished broadcast's details, so another can start from them", async () => {
    fetchAsUser.mockResolvedValue(
      broadcast({ startedAt: hoursFromNow(-4), expectedEndAt: hoursFromNow(-1), state: "expired" }),
    );

    const screen = await loadLiveEditor("ar", "6ab4c51a319a66003190e53f");

    expect(screen.status).toBe("finished");
    if (screen.status !== "finished") return;
    // Both languages, or "start another like this" quietly empties one.
    expect(screen.data.record.title).toEqual({ ar: "اليوم الختامي", en: "Final day" });
    expect(screen.data.record.venue).toEqual({ ar: "استاد زايد", en: "Zayed Stadium" });
    expect(screen.data.record.url).toBe("https://www.youtube.com/live/TESTLIVE01");
  });

  it("reports a broadcast somebody ended as finished too", async () => {
    fetchAsUser.mockResolvedValue(broadcast({ isActive: false, endedAt: hoursFromNow(-0.5), state: "ended" }));

    const screen = await loadLiveEditor("ar", "6ab4c51a319a66003190e53f");

    expect(screen.status).toBe("finished");
  });

  it("still reports an id that names nothing as not found", async () => {
    // The whole point of separating the two: a wrong address stays a wrong
    // address, and does not get offered a broadcast to copy.
    fetchAsUser.mockRejectedValue(new UpstreamError(404, { message: "No broadcast with that id." }));

    const screen = await loadLiveEditor("ar", "6ab4c51a319a66003190e53f");

    expect(screen.status).toBe("notFound");
  });

  it("refuses the edit screen to a reader who cannot update", async () => {
    readGrants.mockResolvedValue([{ resourceType: "videos", action: "Read" }]);

    expect((await loadLiveEditor("ar", "6ab4c51a319a66003190e53f")).status).toBe("denied");
  });

  describe("starting a new one", () => {
    it("carries the running broadcast as the warning, not as the record", async () => {
      fetchAsUser.mockImplementation(async (path) =>
        path === "/live-streams/public/active" ? broadcast() : null,
      );

      const screen = await loadLiveEditor("ar", null);

      expect(screen.status).toBe("ready");
      if (screen.status !== "ready") return;
      expect(screen.data.record).toBeNull();
      expect(screen.data.active?.id).toBe("6ab4c51a319a66003190e53f");
    });

    it("fills the form from the broadcast named by ?from=", async () => {
      // The championship ran long: the editor pressed "start another with the
      // same details" on the finished screen, and landed here.
      fetchAsUser.mockImplementation(async (path) =>
        path === "/live-streams/public/active"
          ? null
          : broadcast({ expectedEndAt: hoursFromNow(-1), state: "expired" }),
      );

      const screen = await loadLiveEditor("ar", null, "6ab4c51a319a66003190e53f");

      expect(screen.status).toBe("ready");
      if (screen.status !== "ready") return;
      expect(screen.data.template?.title).toEqual({ ar: "اليوم الختامي", en: "Final day" });
      expect(screen.data.template?.venue).toEqual({ ar: "استاد زايد", en: "Zayed Stadium" });
    });

    it("still draws the form when the template cannot be read", async () => {
      // A head start that failed is not worth an error screen.
      fetchAsUser.mockImplementation(async (path) => {
        if (path === "/live-streams/public/active") return null;
        throw new UpstreamError(404, {});
      });

      const screen = await loadLiveEditor("ar", null, "6ab4c51a319a66003190e53f");

      expect(screen.status).toBe("ready");
      if (screen.status !== "ready") return;
      expect(screen.data.template).toBeNull();
    });
  });
});

describe("isFinished", () => {
  it("counts the clock passing the stated end, with nobody pressing anything", () => {
    const stream = toAdminLiveStream(broadcast({ expectedEndAt: hoursFromNow(-1), state: "expired" }))!;

    expect(isFinished(stream)).toBe(true);
  });

  it("leaves a broadcast inside its window running", () => {
    const stream = toAdminLiveStream(broadcast())!;

    expect(isFinished(stream)).toBe(false);
  });

  it("takes the API's word for it rather than re-reading the flags", () => {
    // The whole point of the API publishing `state`: one rule, in the place
    // that owns the clock. If this screen recomputed the verdict, the two
    // could disagree — and the disagreement would show only at the boundary.
    const stream = toAdminLiveStream(broadcast({ state: "expired" }))!;

    expect(stream.expectedEndAt > new Date().toISOString()).toBe(true);
    expect(isFinished(stream)).toBe(true);
  });

  it("derives the verdict when an older build sends no state at all", () => {
    // Fails safe: without this a finished broadcast from an un-upgraded API
    // would open the edit form instead of the "this one is over" screen.
    const noState = broadcast({ expectedEndAt: hoursFromNow(-1) });
    delete (noState as Record<string, unknown>).state;

    expect(isFinished(toAdminLiveStream(noState)!)).toBe(true);
    expect(isFinished(toAdminLiveStream({ ...broadcast(), state: undefined })!)).toBe(false);
  });
});

describe("toAdminLiveStream", () => {
  it("keeps both languages of every pair", () => {
    const stream = toAdminLiveStream(broadcast())!;

    expect(stream.title).toEqual({ ar: "اليوم الختامي", en: "Final day" });
    expect(stream.venue).toEqual({ ar: "استاد زايد", en: "Zayed Stadium" });
  });

  it("reads a broadcast with no venue without inventing one", () => {
    const stream = toAdminLiveStream(broadcast({ venue: null }))!;

    expect(stream.venue).toBeNull();
  });

  it("answers null for a body that is not a broadcast", () => {
    expect(toAdminLiveStream(null)).toBeNull();
    expect(toAdminLiveStream({ title: { ar: "", en: "" } })).toBeNull();
  });
});
