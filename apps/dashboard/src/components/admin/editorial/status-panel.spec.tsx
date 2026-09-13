import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import type { EditorialState } from "@/lib/admin/editorial-state";
import { EditorialStatusPanel } from "./status-panel";

/**
 * The panel that decides nothing.
 *
 * Every assertion here is a version of one rule: what this component draws is
 * what the server said, and nothing it worked out for itself. The API resolves
 * the publishing policy, four permissions, whether a review is running and
 * whether this reader is handling its step — so a test that lets the panel
 * infer an action from `mode` or `publicationState` would be testing a second
 * implementation of rules that already have one.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const BASE: EditorialState = {
  publicationState: "Draft",
  mode: "direct",
  blockedReason: null,
  publishedAt: null,
  publishedBy: null,
  workflowInstanceId: null,
  workflowStatus: null,
  currentStepId: null,
  canEdit: true,
  availableActions: ["save"],
  blockedByReadiness: [],
  updatedAt: "2026-09-12T16:07:26.063Z",
  publishBlockers: [],
  workflow: null,
  history: [],
};

const state = (patch: Partial<EditorialState> = {}): EditorialState => ({ ...BASE, ...patch });

function mount(value: EditorialState, onAction = vi.fn(), locale: "ar" | "en" = "ar") {
  const view = renderWithIntl(
    <ToastProvider>
      <EditorialStatusPanel
        entityType="presidentMessagePage"
        entityId="rec-1"
        state={value}
        onAction={onAction}
      />
    </ToastProvider>,
    locale,
  );
  return { ...view, onAction };
}

/** One fetch stub for the whole file: actions POST, the refresh GETs. */
function stubFetch(responses: Array<{ ok: boolean; body?: unknown; status?: number }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const queue = [...responses];
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const next = queue.shift() ?? { ok: true, body: {} };
    return {
      ok: next.ok,
      status: next.status ?? (next.ok ? 200 : 409),
      json: async () => next.body ?? {},
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

beforeEach(() => {
  refresh.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the actions come from the server", () => {
  // The rule this whole component exists to keep.
  it("draws no decision the state did not offer", () => {
    mount(state({ availableActions: ["save"] }));

    for (const label of [/نشر الآن/, /إرسال للمراجعة/, /اعتماد/, /^رفض$/, /إعادة للتعديل/]) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }
    expect(screen.getByText("لا إجراءات متاحة لك على هذا السجل الآن.")).toBeInTheDocument();
  });

  it("draws publish when, and only when, the state offers it", () => {
    const { unmount } = mount(state({ availableActions: ["save", "publish"] }));
    expect(screen.getByRole("button", { name: "نشر الآن" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "إرسال للمراجعة" })).toBeNull();
    unmount();

    mount(state({ mode: "workflow", availableActions: ["save", "submit"] }));
    expect(screen.getByRole("button", { name: "إرسال للمراجعة" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "نشر الآن" })).toBeNull();
  });

  // `mode: "direct"` plus `publicationState: "Draft"` is exactly the shape a
  // panel that reasoned for itself would read as "publishable".
  it("offers nothing when the mode says direct but the actions do not include publish", () => {
    mount(state({ mode: "direct", publicationState: "Draft", availableActions: ["save"] }));

    expect(screen.queryByRole("button", { name: "نشر الآن" })).toBeNull();
  });

  // `delegate` is disabled upstream and absent from the BFF's route list; it
  // must be absent here too however it arrives.
  it("ignores an action it has no button for", () => {
    mount(state({ availableActions: ["save", "delegate"] as never }));

    expect(screen.getByText("لا إجراءات متاحة لك على هذا السجل الآن.")).toBeInTheDocument();
  });
});

describe("the readiness list", () => {
  it("lists every blocker and explains each in words, not field paths alone", () => {
    mount(
      state({
        availableActions: ["save", "publish"],
        publishBlockers: [
          { kind: "pendingContent", field: "pullQuote.en" },
          { kind: "missingRequired", field: "featuredImageId" },
        ],
      }),
    );

    const list = screen.getByRole("list", { name: "قبل النشر" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("نص ينتظر العميل");
    expect(items[0]).toHaveTextContent("pullQuote.en");
    expect(items[1]).toHaveTextContent("حقل مطلوب وما زال فارغًا");
  });

  /**
   * The heart of the step: a disabled button whose accessible description is
   * the reason it is disabled. Without this a screen-reader user is told
   * "publish, dimmed" and nothing else — the one piece of information they
   * came for is on screen, unannounced.
   */
  it("disables publish and points its description at the list", () => {
    // The shape the server actually produces: publish is out of
    // `availableActions` because the draft is not ready, and named in
    // `blockedByReadiness` because that — and only that — is why.
    mount(
      state({
        availableActions: ["save"],
        blockedByReadiness: ["publish"],
        publishBlockers: [{ kind: "missingRequired", field: "featuredImageId" }],
      }),
    );

    const button = screen.getByRole("button", { name: "نشر الآن" });
    expect(button).toBeDisabled();

    const describedBy = button.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const description = document.getElementById(describedBy as string);
    expect(description).not.toBeNull();
    expect(description).toHaveTextContent("حقل مطلوب وما زال فارغًا");
  });

  it("enables publish and says so when nothing is blocking", () => {
    mount(state({ availableActions: ["save", "publish"], publishBlockers: [] }));

    expect(screen.getByRole("button", { name: "نشر الآن" })).toBeEnabled();
    expect(screen.getByText("لا يوجد ما يمنع النشر.")).toBeInTheDocument();
  });

  /** A readiness-held button is a label with a reason, not a control. */
  it("sends nothing when a readiness-held button is pressed", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([{ ok: true, body: {} }]);
    mount(
      state({
        availableActions: ["save"],
        blockedByReadiness: ["publish"],
        publishBlockers: [{ kind: "missingRequired", field: "featuredImageId" }],
      }),
    );

    await user.click(screen.getByRole("button", { name: "نشر الآن" }));

    expect(calls).toHaveLength(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  /** Withheld for a reason readiness cannot fix — no permission, a review in
   *  progress — is not a disabled button. Showing one would blame the
   *  portrait for a refusal the portrait has nothing to do with. */
  it("draws nothing for an action the server withheld for another reason", () => {
    mount(
      state({
        availableActions: ["save"],
        blockedByReadiness: [],
        publishBlockers: [{ kind: "missingRequired", field: "featuredImageId" }],
      }),
    );

    expect(screen.queryByRole("button", { name: "نشر الآن" })).toBeNull();
    expect(screen.getByText("لا إجراءات متاحة لك على هذا السجل الآن.")).toBeInTheDocument();
  });

  it("renames the fields it is given names for, and leaves the rest as paths", () => {
    renderWithIntl(
      <ToastProvider>
        <EditorialStatusPanel
          entityType="presidentMessagePage"
          entityId="rec-1"
          state={state({
            availableActions: ["save", "publish"],
            publishBlockers: [
              { kind: "missingRequired", field: "featuredImageId" },
              { kind: "pendingContent", field: "pullQuote.en" },
            ],
          })}
          onAction={vi.fn()}
          fieldLabels={{ featuredImageId: "صورة الرئيس" }}
        />
      </ToastProvider>,
    );

    expect(screen.getByText(/صورة الرئيس/)).toBeInTheDocument();
    expect(screen.getByText(/pullQuote\.en/)).toBeInTheDocument();
  });
});

describe("a blocked publishing policy", () => {
  it("says why, and offers no way to publish or submit", () => {
    mount(state({ mode: "blocked", blockedReason: "noPolicy", availableActions: ["save"] }));

    expect(screen.getByText(/لا توجد سياسة نشر لهذا النوع من المحتوى/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "نشر الآن" })).toBeNull();
    expect(screen.queryByRole("button", { name: "إرسال للمراجعة" })).toBeNull();
  });

  it("names a misconfigured workflow rather than a generic refusal", () => {
    mount(state({ mode: "blocked", blockedReason: "definitionMissing", availableActions: ["save"] }));

    expect(screen.getByText(/لا تسمّي مسار مراجعة صالحًا/)).toBeInTheDocument();
  });

  // An unknown reason must still read as a sentence, not as a raw key.
  it("falls back to a readable sentence for a reason it does not know", () => {
    mount(state({ mode: "blocked", blockedReason: "somethingNew", availableActions: ["save"] }));

    expect(screen.getByText("النشر غير مُهيّأ لهذا النوع من المحتوى.")).toBeInTheDocument();
    expect(screen.queryByText("somethingNew")).toBeNull();
  });
});

const REVIEW: Partial<EditorialState> = {
  mode: "workflow",
  publicationState: "Draft",
  workflowInstanceId: "wf-1",
  workflowStatus: "InProgress",
  currentStepId: "step-a",
  availableActions: ["approve", "reject", "return"],
  workflow: {
    instanceId: "wf-1",
    definitionName: { ar: "مراجعة بخطوتين", en: "Two step review" },
    status: "InProgress",
    steps: [
      {
        id: "step-a",
        sequenceOrder: 0,
        stepType: "Sequential",
        requiredApprovals: 1,
        approvals: 0,
        assignees: [{ id: "u1", name: { ar: "سارة", en: "Sara" } }],
        isCurrent: true,
      },
      {
        id: "step-b",
        sequenceOrder: 1,
        stepType: "Parallel",
        requiredApprovals: 2,
        approvals: 1,
        assignees: [
          { id: "u2", name: { ar: "خالد", en: "Khaled" } },
          { id: "u3", name: null },
        ],
        isCurrent: false,
      },
    ],
  },
};

describe("the review path", () => {
  /**
   * The approver names are joined in this component, not in the catalogue, so
   * the separator was a literal — and the literal was Arabic. The dashboard
   * serves both languages from the same component, so an English reader was
   * shown "Khaled، Sara": correct names, another language's punctuation.
   */
  it("punctuates the approver list in the reader's own language", () => {
    const { container } = mount(state(REVIEW), vi.fn(), "en");

    expect(container.textContent).toContain("Khaled");
    expect(container.textContent).not.toContain("،");
  });

  it("lists the steps in order, with their type, approvers and progress", () => {
    mount(state(REVIEW));

    const steps = within(screen.getByRole("list", { name: "مسار المراجعة" })).getAllByRole("listitem");
    expect(steps).toHaveLength(2);

    expect(steps[0]).toHaveTextContent("الخطوة 1 من 2");
    expect(steps[0]).toHaveTextContent("الخطوة الحالية");
    expect(steps[0]).toHaveTextContent("بالتتابع");
    expect(steps[0]).toHaveTextContent("سارة");

    expect(steps[1]).toHaveTextContent("الخطوة 2 من 2");
    expect(steps[1]).toHaveTextContent("بالتوازي");
    // The owner's "1 of 2": approvals recorded against what the step needs.
    expect(steps[1]).toHaveTextContent("1 من 2 من الموافقات المطلوبة");
    expect(steps[1]).toHaveTextContent("خالد");
    // A deleted account still occupies the step; it is named as unknown
    // rather than dropped, or the list would understate who must approve.
    expect(steps[1]).toHaveTextContent("حساب غير معروف");
  });

  it("names the review and its status", () => {
    mount(state(REVIEW));

    expect(screen.getByText("مراجعة بخطوتين")).toBeInTheDocument();
    expect(screen.getByText("قيد المراجعة")).toBeInTheDocument();
  });

  it("draws no review section at all when none is running", () => {
    mount(state({ availableActions: ["save", "publish"] }));

    expect(screen.queryByRole("list", { name: "مسار المراجعة" })).toBeNull();
  });
});

describe("the action history", () => {
  it("reads as a list, newest first, naming actor, action, reason and date", () => {
    mount(
      state({
        ...REVIEW,
        history: [
          {
            id: "h2",
            action: "Rejected",
            actor: { id: "u1", name: { ar: "سارة", en: "Sara" } },
            reason: "الصورة بقصّة خاطئة.",
            actionDate: "2026-09-11T10:00:00.000Z",
            workflowStepId: "step-a",
            returnedToStepId: null,
          },
          {
            id: "h1",
            action: "Submitted",
            actor: { id: "u4", name: { ar: "ليلى", en: "Layla" } },
            reason: null,
            actionDate: "2026-09-10T09:00:00.000Z",
            workflowStepId: "step-a",
            returnedToStepId: null,
          },
        ],
      }),
    );

    const entries = within(screen.getByRole("list", { name: "سجل الإجراءات" })).getAllByRole("listitem");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent("سارة");
    expect(entries[0]).toHaveTextContent("رفضه");
    expect(entries[0]).toHaveTextContent("السبب: الصورة بقصّة خاطئة.");
    expect(entries[1]).toHaveTextContent("ليلى");
    expect(entries[1]).toHaveTextContent("أرسله للمراجعة");
    // No reason was given, so no empty "Reason:" label is printed.
    expect(entries[1]).not.toHaveTextContent("السبب:");
    // The date is rendered, not the raw ISO string.
    expect(entries[0]).not.toHaveTextContent("2026-09-11T10:00:00.000Z");
  });

  it("says the history is empty rather than drawing an empty list", () => {
    mount(state({ availableActions: ["save", "publish"] }));

    expect(screen.getByText("لم يُتّخذ أي إجراء على هذا السجل بعد.")).toBeInTheDocument();
  });
});

describe("taking a decision", () => {
  it("publishes through the record's own route, after a confirmation", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([
      { ok: true, body: { publicationId: "p1" } },
      { ok: true, body: BASE },
    ]);
    const { onAction } = mount(state({ availableActions: ["save", "publish"] }));

    await user.click(screen.getByRole("button", { name: "نشر الآن" }));
    // Publishing replaces what visitors see, so it is confirmed first.
    await user.click(await screen.findByRole("button", { name: "نشر" }));

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0].url).toBe("/api/admin/editorial/presidentMessagePage/rec-1/publish");
    expect(calls[0].init?.method).toBe("POST");
    // The concurrency check the API demands, taken from the state rather than
    // from anything the browser tracked itself.
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      expectedUpdatedAt: "2026-09-12T16:07:26.063Z",
    });
    await waitFor(() => expect(onAction).toHaveBeenCalledWith("publish"));
  });

  it("sends a review decision to the workflow instance, not to the record", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([
      { ok: true, body: {} },
      { ok: true, body: BASE },
    ]);
    mount(state(REVIEW));

    await user.click(screen.getByRole("button", { name: "اعتماد" }));
    // The panel's button and the dialog's confirm share a label, which is
    // right in a modal — so the press is scoped to the dialog rather than
    // the label being made artificially different for the test's benefit.
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "اعتماد" }));

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0].url).toBe("/api/admin/editorial/presidentMessagePage/wf-1/approve");
  });

  it("locks the button from the press until the answer arrives", async () => {
    const user = userEvent.setup();
    let release: (value: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await pending;
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      }),
    );
    mount(state({ availableActions: ["save", "publish"] }));

    await user.click(screen.getByRole("button", { name: "نشر الآن" }));
    const confirm = await screen.findByRole("button", { name: "نشر" });
    await user.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    release(null);
  });

  it("refuses to send a rejection with no reason", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([{ ok: true, body: {} }]);
    mount(state(REVIEW));

    await user.click(screen.getByRole("button", { name: "رفض" }));
    const send = await screen.findByRole("button", { name: "تأكيد الرفض" });
    expect(send).toBeDisabled();
    expect(calls).toHaveLength(0);

    await user.type(screen.getByLabelText(/السبب/), "الصورة ناقصة");
    expect(send).toBeEnabled();
  });

  it("sends the reason it was given", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([
      { ok: true, body: {} },
      { ok: true, body: BASE },
    ]);
    mount(state(REVIEW));

    await user.click(screen.getByRole("button", { name: "رفض" }));
    await user.type(screen.getByLabelText(/السبب/), "الصورة ناقصة");
    await user.click(screen.getByRole("button", { name: "تأكيد الرفض" }));

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0].url).toBe("/api/admin/editorial/presidentMessagePage/wf-1/reject");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ reason: "الصورة ناقصة" });
  });

  it("re-reads the state after a decision, without polling for it", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([
      { ok: true, body: {} },
      { ok: true, body: { ...BASE, publicationState: "Published", availableActions: ["save"] } },
    ]);
    mount(state({ availableActions: ["save", "publish"] }));

    await user.click(screen.getByRole("button", { name: "نشر الآن" }));
    await user.click(await screen.findByRole("button", { name: "نشر" }));

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].url).toBe("/api/admin/editorial/presidentMessagePage/rec-1/state");
    await waitFor(() => expect(screen.getByText("منشور")).toBeInTheDocument());
  });

  // The form above this panel was server-rendered from the record as it was.
  // Publishing stamps a new `publicationState` and `updatedAt` on it, so the
  // page around the panel has to be re-read too, or the two halves of the
  // screen describe different versions of the same record.
  it("re-reads the page as well as its own state", async () => {
    const user = userEvent.setup();
    stubFetch([
      { ok: true, body: {} },
      { ok: true, body: BASE },
    ]);
    mount(state({ availableActions: ["save", "publish"] }));

    await user.click(screen.getByRole("button", { name: "نشر الآن" }));
    await user.click(await screen.findByRole("button", { name: "نشر" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("leaves the page alone when the decision was refused", async () => {
    const user = userEvent.setup();
    stubFetch([{ ok: false, status: 409, body: { code: "staleRecord" } }]);
    mount(state({ availableActions: ["save", "publish"] }));

    await user.click(screen.getByRole("button", { name: "نشر الآن" }));
    await user.click(await screen.findByRole("button", { name: "نشر" }));

    await screen.findByRole("alert");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("when the answer is a refusal", () => {
  it("explains a stale record in words, with a way to reload", async () => {
    const user = userEvent.setup();
    stubFetch([{ ok: false, status: 409, body: { code: "staleRecord" } }]);
    mount(state({ availableActions: ["save", "publish"] }));

    await user.click(screen.getByRole("button", { name: "نشر الآن" }));
    await user.click(await screen.findByRole("button", { name: "نشر" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("عُدِّل السجل بعد أن فتحتَه");
    expect(alert).not.toHaveTextContent("staleRecord");
    expect(screen.getByRole("button", { name: "إعادة تحميل الصفحة" })).toBeInTheDocument();
  });

  it("uses the shared failure copy for every other refusal", async () => {
    const user = userEvent.setup();
    stubFetch([{ ok: false, status: 409, body: { code: "publishingPolicyMissing" } }]);
    mount(state({ availableActions: ["save", "publish"] }));

    await user.click(screen.getByRole("button", { name: "نشر الآن" }));
    await user.click(await screen.findByRole("button", { name: "نشر" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("لم يُنفَّذ الإجراء");
    expect(alert).not.toHaveTextContent("publishingPolicyMissing");
  });
});

describe("refreshing and collapsing", () => {
  it("re-reads the state when the refresh button is pressed", async () => {
    const user = userEvent.setup();
    const calls = stubFetch([
      { ok: true, body: { ...BASE, publicationState: "Published" } },
    ]);
    mount(state({ availableActions: ["save", "publish"] }));

    await user.click(screen.getByRole("button", { name: "تحديث الحالة" }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].url).toBe("/api/admin/editorial/presidentMessagePage/rec-1/state");
    expect(calls[0].init?.method ?? "GET").toBe("GET");
    await waitFor(() => expect(screen.getByText("منشور")).toBeInTheDocument());
  });

  // The panel is a top bar below 1024px, where it would otherwise push the
  // form it describes off the first screen.
  it("collapses behind a labelled disclosure", async () => {
    const user = userEvent.setup();
    mount(state({ availableActions: ["save", "publish"] }));

    const toggle = screen.getByRole("button", { name: "إخفاء لوحة الحالة" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);

    expect(screen.getByRole("button", { name: "إظهار لوحة الحالة" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  // A state that changes without the reader asking has to be announced, or a
  // screen-reader user presses publish and hears nothing at all.
  it("announces the state where a screen reader will hear it change", () => {
    mount(state({ availableActions: ["save", "publish"] }));

    const live = screen.getByRole("status");
    expect(live).toHaveTextContent("مسودة");
  });
});
