import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminLiveStream } from "@/lib/admin/videos/types";

/**
 * Going live is a manual act, start to finish.
 *
 * No YouTube Data API, no detection, no polling — an explicit product
 * decision. The editor states when they expect it to end, and that time is the
 * only thing that takes the broadcast down by itself.
 *
 * Which makes the end time the most important field on the screen: get it
 * wrong and either the site claims a broadcast that finished hours ago, or one
 * that is still running disappears mid-race.
 *
 * Real timers throughout. `userEvent` drives its own waits through the timer
 * queue, and Vitest's fake timers deadlock it. The one assertion that needs a
 * fixed "now" is about `expectedEndDefault`, which takes the instant as an
 * argument precisely so it can be tested without touching the clock.
 *
 * Inherited from `go-live-dialog.spec.tsx` when the dialog became a page.
 */
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: unknown }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const toastShow = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ show: toastShow, dismiss: vi.fn() }) }));

const { LiveForm } = await import("./live-form");
const { expectedEndDefault } = await import("@/lib/admin/videos/dubai-time");

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const running: AdminLiveStream = {
  id: "6ab4c51a319a66003190e53f",
  title: { ar: "اليوم الختامي", en: "Final day" },
  venue: { ar: "استاد زايد", en: "Zayed Stadium" },
  videoId: "LIVEID",
  url: "https://www.youtube.com/live/LIVEID",
  startedAt: hoursFromNow(-1),
  expectedEndAt: hoursFromNow(2),
  endedAt: null,
  isActive: true,
  state: "live",
  thumbnailId: null,
  associations: [],
};

const setup = (
  props: Partial<Parameters<typeof LiveForm>[0]> = {},
) => {
  const writes: { path: string; body: unknown; method?: string }[] = [];
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    writes.push({
      path: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  render(
    <LiveForm
      record={null}
      template={null}
      active={null}
      canEnd
      associationOptions={[]}
      locale="ar"
      {...props}
    />,
  );
  return { writes, user: userEvent.setup() };
};

/** The clock moves while the test runs, so the chip is compared against the
 *  minute it lands in rather than an exact instant. */
const dubaiTime = (at: number) =>
  new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });

beforeEach(() => {
  push.mockReset();
  toastShow.mockReset();
});

describe("LiveForm — starting", () => {
  it("defaults the end time to three hours out", () => {
    // The design's default. Long enough for a session, short enough that a
    // forgotten broadcast does not linger overnight.
    const now = new Date("2026-03-14T18:00:00.000Z");

    expect(expectedEndDefault(now).getTime() - now.getTime()).toBe(3 * 60 * 60 * 1000);
  });

  it.each([
    ["goLiveQuick1", 1],
    ["goLiveQuick2", 2],
    ["goLiveQuick3", 3],
    ["goLiveQuick5", 5],
  ])("sets the end time from the %s chip", async (label, hours) => {
    const { user } = setup();

    const before = Date.now();
    await user.click(screen.getByRole("button", { name: label }));
    const after = Date.now();

    // The input shows Dubai time, which is the clock the editor is reading.
    const shown = (screen.getByLabelText("liveEndTimeLabel") as HTMLInputElement).value;
    const offset = hours * 60 * 60 * 1000;
    expect([dubaiTime(before + offset), dubaiTime(after + offset)]).toContain(shown);
  });

  it("refuses a link that is not YouTube", async () => {
    // Format only — nothing here claims the stream is genuinely live.
    const { user, writes } = setup();

    await user.type(screen.getByLabelText("liveUrlLabel"), "https://www.tiktok.com/@uaeaf/video/7300");
    await user.type(screen.getByLabelText("titleArLabel"), "اليوم الختامي");
    await user.click(screen.getByRole("button", { name: "startLive" }));

    expect(screen.getAllByText("goLiveUrlInvalid").length).toBeGreaterThan(0);
    expect(writes).toHaveLength(0);
  });

  it.each([
    "https://www.youtube.com/live/LIVEID",
    "https://www.youtube.com/watch?v=LIVEID",
    "https://youtu.be/LIVEID",
  ])("accepts the YouTube shape %s", async (url) => {
    const { user, writes } = setup();

    await user.type(screen.getByLabelText("liveUrlLabel"), url);
    await user.type(screen.getByLabelText("titleArLabel"), "اليوم الختامي");
    await user.click(screen.getByRole("button", { name: "startLive" }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].path).toBe("/api/admin/live-streams");
  });

  it("tells the editor the live state disappears by itself", () => {
    // Without this the end time reads like a label rather than a mechanism,
    // and an editor would come back expecting to have to end it.
    setup();

    expect(screen.getByText("liveEndNote")).toBeInTheDocument();
  });

  it("will not start a broadcast with no title", async () => {
    const { user, writes } = setup();

    await user.type(screen.getByLabelText("liveUrlLabel"), "https://www.youtube.com/live/LIVEID");
    await user.click(screen.getByRole("button", { name: "startLive" }));

    expect(writes).toHaveLength(0);
  });

  it("hides the championship field while there is nothing to link to", () => {
    setup();

    expect(screen.queryByLabelText("associationLabel")).toBeNull();
  });

  it("warns that starting a second broadcast ends the first", () => {
    // One press from taking a live event off the air, if nobody says so.
    setup({ active: running });

    expect(screen.getByText(/liveReplacesActive/)).toBeInTheDocument();
  });

  it("fills the form from a finished broadcast, both languages and all", () => {
    // The "start another like this" path: a championship ran long and the
    // editor wants to carry on showing it.
    setup({ template: { ...running, expectedEndAt: hoursFromNow(-1), state: "expired" as const } });

    expect(screen.getByLabelText("titleArLabel")).toHaveValue("اليوم الختامي");
    expect(screen.getByLabelText("titleEnLabel")).toHaveValue("Final day");
    expect(screen.getByLabelText("labelAr:liveVenueLabel")).toHaveValue("استاد زايد");
    expect(screen.getByLabelText("labelEn:liveVenueLabel")).toHaveValue("Zayed Stadium");
    expect(screen.getByLabelText("liveUrlLabel")).toHaveValue(running.url);
    expect(screen.getByText("liveTemplateNotice")).toBeInTheDocument();
  });

  it("does not carry the copied broadcast's end time, which is in the past", async () => {
    // The whole reason for copying one is that it needs a new window.
    const { user, writes } = setup({ template: { ...running, expectedEndAt: hoursFromNow(-1), state: "expired" as const } });

    await user.click(screen.getByRole("button", { name: "startLive" }));

    await waitFor(() => expect(writes).toHaveLength(1));
    const body = writes[0].body as { expectedEndAt: string };
    expect(new Date(body.expectedEndAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("LiveForm — correcting the running one", () => {
  it("keeps both languages when only one is edited", async () => {
    // The defect this replaced: one title field sent as both `ar` and `en`,
    // so fixing an Arabic typo overwrote the English title with the Arabic
    // one and nothing said so.
    const { user, writes } = setup({ record: running });

    await user.clear(screen.getByLabelText("titleArLabel"));
    await user.type(screen.getByLabelText("titleArLabel"), "اليوم الأخير");
    await user.click(screen.getByRole("button", { name: "saveChanges" }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].body).toMatchObject({
      title: { ar: "اليوم الأخير", en: "Final day" },
      venue: { ar: "استاد زايد", en: "Zayed Stadium" },
    });
  });

  it("patches the running record rather than starting a second broadcast", async () => {
    // `POST` ends whatever is live and inserts a new row. Sending one here
    // would take the broadcast off the air, give it a new id and a new start
    // time, and look like it worked.
    const { user, writes } = setup({ record: running });

    await user.click(screen.getByRole("button", { name: "saveChanges" }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].path).toBe(`/api/admin/live-streams/${running.id}`);
    expect(writes[0].method).toBe("PATCH");
  });

  it("never sends the URL, which would swap what visitors are watching", async () => {
    const { user, writes } = setup({ record: running });

    await user.click(screen.getByRole("button", { name: "saveChanges" }));

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].body).not.toHaveProperty("url");
    expect(screen.getByLabelText("liveUrlLabel")).toBeDisabled();
  });

  it("asks before ending the broadcast", async () => {
    const { user, writes } = setup({ record: running });

    await user.click(screen.getByRole("button", { name: "endLive" }));
    expect(writes).toHaveLength(0);

    // The dialog's own confirm carries the same label.
    const confirms = screen.getAllByRole("button", { name: "endLive" });
    await user.click(confirms[confirms.length - 1]);

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].path).toBe(`/api/admin/live-streams/${running.id}/end`);
  });

  it("refuses an end time that has already passed", async () => {
    // A broadcast whose expected end is in the past never appears on the site
    // at all: the editor would press save and see nothing happen.
    const { user, writes } = setup({ record: running });

    const date = screen.getByLabelText("liveEndDateLabel");
    await user.clear(date);
    await user.type(date, "2020-01-01");
    await user.click(screen.getByRole("button", { name: "saveChanges" }));

    expect(writes).toHaveLength(0);
    expect(screen.getAllByText("errEndInPast").length).toBeGreaterThan(0);
  });
});
