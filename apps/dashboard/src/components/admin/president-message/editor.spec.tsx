import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import type { PresidentMessageResponse } from "@/lib/admin/president-message";
import { PresidentMessageEditor } from "./editor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

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
  updatedAt: "2026-09-12T00:00:00.000Z",
};

function renderEditor(canEdit = true) {
  return renderWithIntl(
    <ToastProvider>
      <PresidentMessageEditor
        record={RECORD}
        images={[]}
        canEdit={canEdit}
        canReadMedia
        locale="ar"
      />
    </ToastProvider>,
    "ar",
  );
}

beforeEach(() => {
  refresh.mockReset();
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

describe("the search-result counters", () => {
  it("counts both languages, not only the one being edited in", async () => {
    const user = userEvent.setup();
    renderEditor();

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

    expect(screen.getByRole("status")).toHaveTextContent("كل التغييرات محفوظة");
    expect(screen.getByRole("button", { name: "حفظ المسودة" })).toBeDisabled();
  });

  it("notices the first keystroke", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(heroTitle(), "!");

    expect(screen.getByRole("status")).toHaveTextContent("تغييرات غير محفوظة");
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

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string; method: string }];

    expect(url).toBe("/api/admin/editorial/presidentMessagePage/msg-1");
    expect(init.method).toBe("PATCH");
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

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذّر حفظ المسودة.");
    // The words the API's code maps to, not the code itself.
    expect(alert.textContent).not.toContain("staleRecord");
    expect(heroTitle()).toHaveValue("hero-ع!");
  });
});

describe("a reviewer who may decide but not rewrite", () => {
  it("gets the message to read, with nothing to change it with", () => {
    renderEditor(false);

    expect(screen.getByText("تستطيع قراءة هذه الكلمة لا تغييرها.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "حفظ المسودة" })).toBeNull();
    expect(heroTitle()).toBeDisabled();
    expect(screen.getByRole("button", { name: "إضافة قيمة" })).toBeDisabled();
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
