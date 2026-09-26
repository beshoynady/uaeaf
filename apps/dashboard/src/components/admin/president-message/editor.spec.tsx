import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "@/test/next-navigation";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import type { PresidentMessageResponse } from "@/lib/admin/president-message";
import { PresidentMessageEditor } from "./editor";

// `EditorShell` reads the selected tab from the URL and writes it back, so a
// screen on the shell needs `useSearchParams` and `replace` as well as
// `refresh` (ADR-0102 §D1). The three come from one helper.
vi.mock("next/navigation", () => import("@/test/next-navigation"));


/**
 * The long form as an author works it.
 *
 * The rich-text half is deliberately absent: `BodySection` reaches it through
 * `lazy-rich-text`, which is a dynamic import, and what this file is about is
 * the form around it — reordering, the guard, the counters, and the fact that
 * the date has no input.
 */
vi.mock("@/components/admin/rich-text/lazy-rich-text", () => ({
  LazyBilingualRichText: () => <div data-testid="rich-text" />,
}));

const text = (value: string) => ({ ar: `${value}-ع`, en: `${value}-en` });

const RECORD: PresidentMessageResponse = {
  _id: "msg-1",
  heroImageId: null,
  heroTitle: text("hero"),
  heroSubtitle: text("sub"),
  featuredImageId: null,
  pullQuote: text("quote"),
  messageBody: { ar: null, en: null },
  valuesTitle: text("values"),
  values: [
    { title: text("first"), description: text("d1"), iconKey: "eye", displayOrder: 1 },
    { title: text("second"), description: text("d2"), iconKey: "star", displayOrder: 2 },
    { title: text("third"), description: text("d3"), iconKey: "flag", displayOrder: 3 },
  ],
  signatoryName: text("name"),
  signatoryTitle: text("title"),
  seo: { metaTitle: null, metaDescription: null, ogImageId: null },
  publicationState: "Published",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z",
};

function renderEditor(canEdit = true) {
  return renderWithIntl(
    <ToastProvider>
      <PresidentMessageEditor
        record={RECORD}
        images={[]}
        canEdit={canEdit}
        canPublish={false}
        canReadMedia
        locale="ar"
      />
    </ToastProvider>,
    "ar",
  );
}

beforeEach(() => {
  // The mocked router holds the URL in module state, so a test that opened a
  // tab would otherwise leave the next one on it.
  navigation.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * The hero's own title field.
 *
 * "العنوان" labels both the hero heading and each value's title — the same
 * word for two different things on one screen. A sighted reader is told them
 * apart by the section they sit in, and a screen-reader user by the value
 * rows' `<fieldset>`/`<legend>` grouping, so the collision is in this test's
 * queries rather than in the form.
 */
function heroTitle(): HTMLElement {
  const hero = screen.getByText("الواجهة").closest("details");
  if (!hero) {
    throw new Error("no hero section");
  }
  return within(hero).getByLabelText("العنوان — بالعربية");
}

/** The move buttons of one value row, found by the row's own legend. */
function row(position: number) {
  const legend = screen.getByText(`القيمة ${position} من 3`);
  const fieldset = legend.closest("fieldset");
  if (!fieldset) {
    throw new Error(`value ${position} has no fieldset`);
  }
  return within(fieldset);
}

describe("reordering the values from the keyboard", () => {
  it("moves a value with the keyboard alone, and reorders the list", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(row(2).getByRole("button", { name: "تحريك لأعلى" }));

    // Position 1 now holds what was second — read through the row's own
    // title field rather than through the order of the DOM, so the test
    // fails if the list renumbers without actually moving anything.
    expect(row(1).getByLabelText("العنوان — بالإنجليزية")).toHaveValue("second-en");
    expect(row(2).getByLabelText("العنوان — بالإنجليزية")).toHaveValue("first-en");
  });

  it("keeps focus on the value that moved, not on the row it left", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(row(3).getByRole("button", { name: "تحريك لأعلى" }));

    // The third value is now second; focus is on *its* control, so a second
    // press moves the same value again.
    await waitFor(() =>
      expect(row(2).getByRole("button", { name: "تحريك لأعلى" })).toHaveFocus(),
    );

    await user.keyboard("{Enter}");
    expect(row(1).getByLabelText("العنوان — بالإنجليزية")).toHaveValue("third-en");
  });

  /** At the ends the row's own button is disabled, so focus would be
   *  refused and the reader would be dropped back to the top of the page. */
  it("hands focus to the button that still works when a value reaches an end", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(row(2).getByRole("button", { name: "تحريك لأعلى" }));

    await waitFor(() =>
      expect(row(1).getByRole("button", { name: "تحريك لأسفل" })).toHaveFocus(),
    );
  });

  it("says where the value landed, for a reader who cannot see it move", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();

    await user.click(row(2).getByRole("button", { name: "تحريك لأعلى" }));

    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent("انتقلت إلى الموضع 1 من 3");
  });

  it("offers no move out of the list at either end", () => {
    renderEditor();

    expect(row(1).getByRole("button", { name: "تحريك لأعلى" })).toBeDisabled();
    expect(row(3).getByRole("button", { name: "تحريك لأسفل" })).toBeDisabled();
  });
});

describe("the date under the message", () => {
  /**
   * Not a disabled input — no input at all. The record stores no date; the
   * message's date is the date its publication was made, so an input here
   * would create a second date that could disagree with the real one.
   */
  it("is stated rather than offered for editing", () => {
    renderEditor();

    expect(screen.getByText("يُؤخذ من تاريخ النشر")).toBeInTheDocument();
    for (const field of screen.getAllByRole("textbox")) {
      expect(field.getAttribute("aria-label") ?? "").not.toContain("التاريخ");
    }
    expect(screen.queryByLabelText(/التاريخ/)).toBeNull();
  });
});

/** The header's own saved-state line. The activation bar is a second
 *  `role="status"` on the screen since ADR-0102 §D2, so the one this file means
 *  is named by the attribute the shell puts on it. */
const saveStatus = () => screen.getAllByRole("status").find((node) => node.hasAttribute("data-dirty"))!;

/** Opens the SEO tab, where the search-result fields now live (ADR-0102 §D1).
 *  Pressed rather than set through the URL, so the tab strip is exercised on the
 *  way in. */
const openSeo = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("tab", { name: /SEO/ }));

/** Opens the versions tab, where the version panel now lives (ADR-0102 §D1),
 *  and waits for its list. */
const openVersions = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("tab", { name: /الإصدارات/ }));
  await screen.findByRole("list", { name: "إصدارات هذا السجل" });
};

/** Back to the fields. */
const openContent = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("tab", { name: "المحتوى" }));

describe("the search-result counters", () => {
  it("counts both languages, not only the one being edited in", async () => {
    const user = userEvent.setup();
    renderEditor();
    await openSeo(user);

    await user.type(screen.getByLabelText("عنوان الصفحة — بالإنجليزية"), "Hello");

    // Arabic still reads zero — the point of showing both is that a title
    // written in one language and forgotten in the other is visible.
    expect(screen.getAllByText("يظهر 5 من نحو 60 حرفًا").length).toBeGreaterThan(0);
    expect(screen.getAllByText("يظهر 0 من نحو 60 حرفًا").length).toBeGreaterThan(0);
  });

  /** Guidance, not a limit: the API caps neither field, so the counter
   *  reports the overrun and still accepts every character. */
  it("accepts a title past the guidance and says what will be shown", async () => {
    const user = userEvent.setup();
    renderEditor();
    await openSeo(user);

    const field = screen.getByLabelText("عنوان الصفحة — بالإنجليزية");
    await user.click(field);
    await user.paste("x".repeat(61));

    expect(field).toHaveValue("x".repeat(61));
    expect(screen.getAllByText("61 حرفًا — سيظهر منها نحو 60").length).toBeGreaterThan(0);
  });
});

describe("unsaved work", () => {
  it("starts clean and says so", () => {
    renderEditor();

    expect(saveStatus()).toHaveTextContent("كل التغييرات محفوظة");
    expect(screen.getByRole("button", { name: "حفظ المسودة" })).toBeDisabled();
  });

  it("notices the first keystroke", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(heroTitle(), "!");

    expect(saveStatus()).toHaveTextContent("تغييرات غير محفوظة");
    expect(screen.getByRole("button", { name: "حفظ المسودة" })).toBeEnabled();
  });

  /**
   * The browser's own prompt is the only thing that catches a closed tab,
   * which is the case a long form actually loses work to. It is registered
   * only while there is something to lose.
   */
  it("asks the browser to interrupt a close only once there is something to lose", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(closeIsInterrupted()).toBe(false);

    await user.type(heroTitle(), "!");

    expect(closeIsInterrupted()).toBe(true);
  });
});

describe("saving", () => {
  it("sends only the field that changed", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderEditor();

    await user.type(heroTitle(), "!");
    await user.click(screen.getByRole("button", { name: "حفظ المسودة" }));

    // The save, picked out by its method: the version panel beside this form
    // reads the record's history on mount, so a save is no longer the only
    // request this screen makes.
    const patch = () =>
      (fetchMock.mock.calls as Array<[string, { body: string; method?: string }?]>).find(
        ([, init]) => init?.method === "PATCH",
      );
    await waitFor(() => expect(patch()).toBeDefined());

    const [url, init] = patch() as [string, { body: string; method: string }];
    expect(url).toBe("/api/admin/editorial/presidentMessagePage/msg-1");
    expect(Object.keys(JSON.parse(init.body))).toEqual(["heroTitle"]);
  });

  /** ADR-0016: a failure that stopped the task stays beside the control that
   *  failed, where the reader is already looking, rather than in a toast
   *  that leaves before they have read it. */
  it("reports a refusal in place, in words, without losing the edit", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "staleRecord" }), { status: 409 }),
      ),
    );
    renderEditor();

    await user.type(heroTitle(), "!");
    await user.click(screen.getByRole("button", { name: "حفظ المسودة" }));

    // Scoped to the save's own alert. The stub refuses every request in this
    // test, so the version panel beside the form reports its failed read too
    // — a different task failing, with its own words, which is right.
    const alert = await screen.findByText(/تعذّر حفظ المسودة\./);
    expect(alert).toHaveAttribute("role", "alert");
    // The words the API's code maps to, not the code itself.
    expect(alert.textContent).not.toContain("staleRecord");
    expect(heroTitle()).toHaveValue("hero-ع!");
  });
});

describe("a reviewer who may decide but not rewrite", () => {
  it("gets the message to read, with nothing to change it with", () => {
    renderEditor(false);

    expect(// The shell's own sentence since this screen moved onto it (ADR-0102 §D1):
      // one wording for every editor, rather than one per screen.
      screen.getByText("تستطيع قراءة هذه الصفحة لا تغييرها.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "حفظ المسودة" })).toBeNull();
    expect(heroTitle()).toBeDisabled();
    expect(screen.getByRole("button", { name: "إضافة قيمة" })).toBeDisabled();
  });
});

/**
 * The wiring, not the component.
 *
 * `revisions-panel.spec.tsx` proves the guard refuses when it is told there
 * are unsaved changes. What it cannot prove is that anything ever tells it:
 * `hasUnsavedChanges` is handed over by this component, from the same `dirty`
 * the save button reads. A panel wired to a constant `false` would pass every
 * test in that file and lose an editor's work here.
 */
describe("the version panel, wired to this form", () => {
  const HISTORY = {
    items: [
      {
        id: "rev-1",
        versionNumber: 1,
        createdAt: "2026-09-10T09:00:00.000Z",
        createdBy: { id: "u1", name: { ar: "سارة", en: "Sara" } },
        state: "Live",
        publishedAt: "2026-09-10T09:30:00.000Z",
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  };

  function stub() {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        calls.push(String(url));
        return {
          ok: true,
          status: 200,
          json: async () => (String(url).includes("/revisions") ? HISTORY : {}),
        } as Response;
      }),
    );
    return calls;
  }

  it("refuses a restore while this form has unsaved changes", async () => {
    const user = userEvent.setup();
    const calls = stub();
    renderEditor();

    // Typed on the content tab, restored from the versions tab — the draft
    // survives the switch, which is what makes the guard's question meaningful
    // at all (ADR-0102 §D1).
    await user.type(heroTitle(), "!");
    await openVersions(user);
    await user.click(screen.getByRole("button", { name: "استرجاع" }));

    expect(await screen.findByText("لديك تغييرات غير محفوظة")).toBeInTheDocument();
    expect(calls.some((url) => url.endsWith("/restore"))).toBe(false);
  });

  it("lets it through once the form is clean", async () => {
    const user = userEvent.setup();
    stub();
    renderEditor();

    await openVersions(user);
    await user.click(screen.getByRole("button", { name: "استرجاع" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("لديك تغييرات غير محفوظة")).toBeNull();
  });

  /** Discarding is the editor's own reset, reached from the panel's guard:
   *  the typed text has to actually leave the field, or "discard and restore"
   *  restores over work the form still holds. */
  it("empties the form when the guard's discard is taken", async () => {
    const user = userEvent.setup();
    stub();
    renderEditor();

    await user.type(heroTitle(), "!");
    expect(heroTitle()).toHaveValue("hero-ع!");

    await openVersions(user);
    await user.click(screen.getByRole("button", { name: "استرجاع" }));
    await user.click(await screen.findByRole("button", { name: "تجاهل تغييراتي واسترجع" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    // Back on the fields: the discard has to have actually emptied them, or
    // "discard and restore" restores over work the form still holds.
    await openContent(user);
    expect(heroTitle()).toHaveValue("hero-ع");
  });
});

/**
 * Whether a close would be interrupted.
 *
 * jsdom fires `beforeunload` but never acts on it, so the test dispatches the
 * event itself and reads whether anything cancelled it — which is exactly
 * what a browser checks before showing its prompt.
 */
function closeIsInterrupted(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
