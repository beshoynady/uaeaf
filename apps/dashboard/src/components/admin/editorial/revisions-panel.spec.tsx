import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import type { RevisionDetail, RevisionHistoryPage } from "@/lib/admin/revisions";
import { EditorialRevisionsPanel } from "./revisions-panel";

/**
 * Version history, and the one destructive thing this screen can do.
 *
 * Restoring overwrites the stored draft and keeps no copy of what it replaced
 * — `PublishingService.restore` writes the snapshot over the record and
 * freezes nothing first. So most of this file is about the two guards in
 * front of it: unsaved work in the browser, and a confirmation that says in
 * words what is about to be replaced.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const PAGE: RevisionHistoryPage = {
  items: [
    {
      id: "rev-3",
      versionNumber: 3,
      createdAt: "2026-09-11T10:00:00.000Z",
      createdBy: { id: "u1", name: { ar: "سارة", en: "Sara" } },
      state: "Live",
      publishedAt: "2026-09-11T10:05:00.000Z",
    },
    {
      id: "rev-2",
      versionNumber: 2,
      createdAt: "2026-09-10T09:00:00.000Z",
      createdBy: { id: "u2", name: null },
      state: "Archived",
      publishedAt: "2026-09-10T09:30:00.000Z",
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

const DETAIL: RevisionDetail = {
  ...PAGE.items[1],
  entityType: "presidentMessagePage",
  entityId: "rec-1",
  content: {
    heroTitle: { ar: "كلمة الرئيس", en: "President's Message" },
    pullQuote: { ar: "اقتباس قديم", en: "An old quote" },
    featuredImageId: "64b0000000000000000000aa",
    valuesTitle: null,
    messageBody: {
      ar: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "فقرة عربية" }] }] },
      en: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "An English paragraph" }] }] },
    },
  },
};

type Reply = { ok: boolean; body?: unknown; status?: number };

function stubFetch(byUrl: (url: string) => Reply) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      const reply = byUrl(String(url));
      return {
        ok: reply.ok,
        status: reply.status ?? (reply.ok ? 200 : 409),
        json: async () => reply.body ?? {},
      } as Response;
    }),
  );
  return calls;
}

/** The happy path every test starts from unless it says otherwise. */
const defaultReplies = (url: string): Reply => {
  if (url.includes("/revisions/rev-")) return { ok: true, body: DETAIL };
  if (url.includes("/revisions")) return { ok: true, body: PAGE };
  return { ok: true, body: { restoredFromVersion: 2 } };
};

function mount(
  overrides: Partial<Parameters<typeof EditorialRevisionsPanel>[0]> = {},
) {
  const props = {
    entityType: "presidentMessagePage",
    entityId: "rec-1",
    canRestore: true,
    hasUnsavedChanges: false,
    onSaveFirst: vi.fn(async () => true),
    onDiscard: vi.fn(),
    ...overrides,
  };
  const view = renderWithIntl(
    <ToastProvider>
      <EditorialRevisionsPanel {...props} />
    </ToastProvider>,
  );
  return { ...view, props };
}

beforeEach(() => {
  refresh.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the list", () => {
  it("reads the record's history on open, newest first", async () => {
    const calls = stubFetch(defaultReplies);
    mount();

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0].url).toBe(
      "/api/admin/editorial/presidentMessagePage/rec-1/revisions?page=1&limit=20",
    );

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("الإصدار 3");
    expect(rows[0]).toHaveTextContent("سارة");
    expect(rows[0]).toHaveTextContent("المنشور الآن");
    expect(rows[1]).toHaveTextContent("الإصدار 2");
    // History outlives accounts: a deleted author is named as unknown rather
    // than left blank, which would read as "nobody saved this".
    expect(rows[1]).toHaveTextContent("حساب غير معروف");
    expect(rows[1]).toHaveTextContent("مؤرشف");
  });

  it("says the history is empty rather than drawing an empty list", async () => {
    stubFetch(() => ({ ok: true, body: { items: [], total: 0, page: 1, limit: 20 } }));
    mount();

    expect(await screen.findByText(/لا إصدارات بعد/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "إصدارات هذا السجل" })).toBeNull();
  });

  it("loads older versions on request and appends them", async () => {
    const user = userEvent.setup();
    const second: RevisionHistoryPage = {
      items: [
        {
          id: "rev-1",
          versionNumber: 1,
          createdAt: "2026-09-09T08:00:00.000Z",
          createdBy: { id: "u1", name: { ar: "سارة", en: "Sara" } },
          state: "Draft",
          publishedAt: null,
        },
      ],
      total: 3,
      page: 2,
      limit: 2,
    };
    const calls = stubFetch((url) =>
      url.includes("page=2")
        ? { ok: true, body: second }
        : { ok: true, body: { ...PAGE, total: 3, limit: 2 } },
    );
    mount();

    await screen.findByRole("list", { name: "إصدارات هذا السجل" });
    await user.click(screen.getByRole("button", { name: "إصدارات أقدم" }));

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].url).toContain("page=2");
    const rows = within(screen.getByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveTextContent("الإصدار 1");
  });

  it("offers no more button once every version is loaded", async () => {
    stubFetch(defaultReplies);
    mount();

    await screen.findByRole("list", { name: "إصدارات هذا السجل" });
    expect(screen.queryByRole("button", { name: "إصدارات أقدم" })).toBeNull();
  });
});

describe("reading a version", () => {
  it("fetches the content and shows it as text, not as markup", async () => {
    const user = userEvent.setup();
    const calls = stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "اقرأ" }));

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].url).toBe("/api/admin/editorial/presidentMessagePage/rec-1/revisions/rev-2");

    const reader = await screen.findByRole("region", { name: "محتوى الإصدار 2" });
    expect(reader).toHaveTextContent("كلمة الرئيس");
    expect(reader).toHaveTextContent("An old quote");
    // Rich text comes through as the words it held. No allowlisted markup is
    // re-rendered here, and there is no word-level comparison anywhere.
    expect(reader).toHaveTextContent("فقرة عربية");
    expect(reader).toHaveTextContent("An English paragraph");
    // An empty field is a dash, not a missing row: the reader must be able to
    // see that the version had nothing there.
    expect(reader).toHaveTextContent("—");
  });

  it("closes the reader again", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "اقرأ" }));
    const reader = await screen.findByRole("region", { name: "محتوى الإصدار 2" });

    // The reader's own close names the version it closes. The row's toggle
    // beside it closes the same thing, and two controls sharing one
    // accessible name is a reader hearing the same button twice.
    await user.click(within(reader).getByRole("button", { name: "إغلاق قراءة الإصدار 2" }));

    expect(screen.queryByRole("region", { name: "محتوى الإصدار 2" })).toBeNull();
  });
});

describe("the unsaved-changes guard", () => {
  it("refuses to restore, says why, and sends nothing", async () => {
    const user = userEvent.setup();
    const calls = stubFetch(defaultReplies);
    mount({ hasUnsavedChanges: true });

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("لديك تغييرات غير محفوظة");
    expect(notice).toHaveTextContent(/الاسترجاع يستبدل المحتوى المخزَّن/);
    // The list read is the only request that has happened.
    expect(calls).toHaveLength(1);
    // And the confirmation is not reachable behind the guard.
    expect(screen.queryByText(/استرجاع الإصدار 2؟/)).toBeNull();
  });

  it("offers exactly two ways past it", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    mount({ hasUnsavedChanges: true });

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));

    const notice = await screen.findByRole("alert");
    expect(within(notice).getByRole("button", { name: "احفظ تغييراتي ثم استرجع" })).toBeInTheDocument();
    expect(within(notice).getByRole("button", { name: "تجاهل تغييراتي واسترجع" })).toBeInTheDocument();
  });

  it("saves first when asked, then asks for confirmation", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    const onSaveFirst = vi.fn(async () => true);
    const { rerender } = mount({ hasUnsavedChanges: true, onSaveFirst });

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    await user.click(await screen.findByRole("button", { name: "احفظ تغييراتي ثم استرجع" }));

    await waitFor(() => expect(onSaveFirst).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("dialog")).toHaveTextContent("استرجاع الإصدار 2؟");
    void rerender;
  });

  // A failed save must not become a silent restore over the work it failed to
  // keep.
  it("stops when the save it was asked for did not succeed", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    const onSaveFirst = vi.fn(async () => false);
    mount({ hasUnsavedChanges: true, onSaveFirst });

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    await user.click(await screen.findByRole("button", { name: "احفظ تغييراتي ثم استرجع" }));

    await waitFor(() => expect(onSaveFirst).toHaveBeenCalled());
    expect(screen.queryByText(/استرجاع الإصدار 2؟/)).toBeNull();
  });

  it("discards when asked, then asks for confirmation", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    const onDiscard = vi.fn();
    mount({ hasUnsavedChanges: true, onDiscard });

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    await user.click(await screen.findByRole("button", { name: "تجاهل تغييراتي واسترجع" }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("dialog")).toHaveTextContent("استرجاع الإصدار 2؟");
  });
});

describe("confirming a restore", () => {
  it("names the version, its date, what is replaced, and what comes back", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));

    const panel = await screen.findByRole("dialog");
    expect(panel).toHaveTextContent("استرجاع الإصدار 2؟");
    expect(panel).toHaveTextContent(/محلّ المحتوى الحالي بالكامل/);
    expect(panel).toHaveTextContent(/يعود السجل مسودة/);
    // The date the version was saved, rendered — not the raw ISO string.
    expect(panel).not.toHaveTextContent("2026-09-10T09:00:00.000Z");
  });

  /**
   * Focus moves into the confirmation when it appears, and lands on the choice
   * that changes nothing: the first key the reader presses must not be the one
   * that overwrites the draft. The consequence is its description, so it is
   * read out with the question.
   */
  it("moves focus into the confirmation, onto the choice that changes nothing", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));

    const panel = await screen.findByRole("dialog");
    await waitFor(() => expect(within(panel).getByRole("button", { name: "إلغاء" })).toHaveFocus());
    expect(panel).toHaveAccessibleDescription(/محلّ المحتوى الحالي بالكامل/);
  });

  /**
   * The check belongs to the moment of the press, not the moment of asking
   * (CLAUDE.md §31). The modal closes the typing path; what it cannot close is
   * the state changing under it, so unsaved changes that arrive while it is
   * open still stop the restore.
   */
  it("refuses at the press if the form picked up unsaved changes while it was open", async () => {
    const user = userEvent.setup();
    const calls = stubFetch(defaultReplies);
    const view = mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    const panel = await screen.findByRole("dialog");

    view.rerender(
      <ToastProvider>
        <EditorialRevisionsPanel {...view.props} hasUnsavedChanges />
      </ToastProvider>,
    );
    await user.click(within(panel).getByRole("button", { name: "استرجع هذا الإصدار" }));

    expect(calls.some((call) => call.url.endsWith("/restore"))).toBe(false);
    expect(await screen.findByText("لديك تغييرات غير محفوظة")).toBeInTheDocument();
  });

  /**
   * The native `<dialog>`, opened with `showModal()`, not a panel given a
   * dialog role. The page behind it going inert is the browser's doing, and is
   * verified by opening the page — the test shim does not reproduce it. What
   * this pins is that the element which provides it is the one in use.
   */
  it("asks in a native modal dialog", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("open");
  });

  /** Esc changes nothing, and focus goes back to the restore button that
   *  opened the question, so a keyboard reader lands where they left off. */
  it("closes on Esc without restoring, and returns focus to the button that opened it", async () => {
    const user = userEvent.setup();
    const calls = stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    const opener = within(rows[1]).getByRole("button", { name: "استرجاع" });
    await user.click(opener);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(opener).toHaveFocus();
    expect(calls.every((call) => !call.url.endsWith("/restore"))).toBe(true);
  });

  /** The page behind a modal is inert, so a refusal drawn there while the
   *  dialog stayed open could be neither seen nor heard. */
  it("closes the confirmation when the restore is refused, so the refusal can be read", async () => {
    const user = userEvent.setup();
    stubFetch((url) =>
      url.endsWith("/restore")
        ? { ok: false, status: 403, body: { code: "underReview" } }
        : defaultReplies(url),
    );
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "استرجع هذا الإصدار" }));

    expect(await screen.findByText("لم يتم الاسترجاع")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sends the restore to the record's own route, with the version id", async () => {
    const user = userEvent.setup();
    const calls = stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    await user.click(await screen.findByRole("button", { name: "استرجع هذا الإصدار" }));

    await waitFor(() => expect(calls.length).toBeGreaterThan(1));
    const restore = calls.find((call) => call.url.endsWith("/restore"));
    expect(restore?.url).toBe("/api/admin/editorial/presidentMessagePage/rec-1/restore");
    expect(restore?.init?.method).toBe("POST");
    expect(JSON.parse(String(restore?.init?.body))).toEqual({ revisionId: "rev-2" });
  });

  it("announces which version came back, and re-reads the record", async () => {
    const user = userEvent.setup();
    stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    await user.click(await screen.findByRole("button", { name: "استرجع هذا الإصدار" }));

    // The version number is in the words, not only in the toast's title: a
    // restore that says "done" and nothing else leaves the reader to guess
    // which of three versions is now in the form.
    const spoken = await screen.findAllByText(/عاد المحتوى إلى الإصدار 2/);
    expect(spoken).toHaveLength(2);

    // And it is announced exactly once. The toast is the announcement
    // (ADR-0016); the line left behind in the panel is the record of it, and
    // a second live region carrying the same sentence would make a screen
    // reader say it twice for one event.
    const live = spoken.filter((node) =>
      node.closest("[role='status'], [role='alert'], [aria-live]"),
    );
    expect(live).toHaveLength(1);

    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("can be abandoned without restoring anything", async () => {
    const user = userEvent.setup();
    const calls = stubFetch(defaultReplies);
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "إلغاء" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls.every((call) => !call.url.endsWith("/restore"))).toBe(true);
  });

  it("explains a refusal in the shared words, not as a code", async () => {
    const user = userEvent.setup();
    stubFetch((url) =>
      url.endsWith("/restore")
        ? { ok: false, status: 403, body: { code: "underReview" } }
        : defaultReplies(url),
    );
    mount();

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    await user.click(within(rows[1]).getByRole("button", { name: "استرجاع" }));
    await user.click(await screen.findByRole("button", { name: "استرجع هذا الإصدار" }));

    const alert = await screen.findByText("لم يتم الاسترجاع");
    expect(alert).toBeInTheDocument();
    expect(screen.queryByText("underReview")).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("when the account may not restore", () => {
  it("still shows the history, and offers no restore at all", async () => {
    stubFetch(defaultReplies);
    mount({ canRestore: false });

    const rows = within(await screen.findByRole("list", { name: "إصدارات هذا السجل" })).getAllByRole(
      "listitem",
    );
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("button", { name: "اقرأ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "استرجاع" })).toBeNull();
    expect(screen.getByText("الاسترجاع غير متاح لحسابك على هذا السجل.")).toBeInTheDocument();
  });
});
