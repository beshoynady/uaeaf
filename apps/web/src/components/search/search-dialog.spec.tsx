import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { renderWithIntl } from "@/test/render-with-intl";
import { loadMessages } from "@/i18n/messages";
import { SearchDialog } from "./search-dialog";

const enMessages = loadMessages("en");

/**
 * One in-flight request per query string, held open until the test resolves
 * or rejects it. This is what makes the cancellation tests below meaningful:
 * a mock that resolves immediately could never show a slow "nad" landing
 * after a fast "nadi", because there would be no window for it to land in.
 */
interface Deferred {
  resolve: (groups: unknown[]) => void;
  reject: (error: unknown) => void;
}
const pending = new Map<string, Deferred>();

const hit = (id: string, title: string, href: string) => ({
  id,
  title,
  subtitle: null,
  href,
  thumbnailId: null,
});

const fetchMock = vi.fn((url: string) => {
  const q = new URL(url, "http://localhost").searchParams.get("q") ?? "";
  return new Promise((resolve, reject) => {
    pending.set(q, {
      resolve: (groups) => resolve({ ok: true, json: async () => ({ groups }) } as Response),
      reject,
    });
  });
});

const resolveQuery = (q: string, groups: unknown[]) => pending.get(q)?.resolve(groups);

beforeEach(() => {
  pending.clear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("نافذة البحث", () => {
  it("combobox موصول بقائمته", () => {
    renderWithIntl(<SearchDialog open onClose={vi.fn()} />, "en");
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-controls");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("الأسهم تحرك aria-activedescendant دون نقل التركيز الحقيقي عن الحقل", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchDialog open onClose={vi.fn()} />, "en");
    const input = screen.getByRole("combobox");

    await user.type(input, "club");
    await waitFor(() => expect(pending.has("club")).toBe(true));
    resolveQuery("club", [{ type: "clubs", total: 1, items: [hit("1", "Sharjah Club", "/clubs#sharjah")] }]);
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowDown}");
    const activeId = input.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)).toHaveAttribute("aria-selected", "true");
    // The whole point of the combobox pattern: real focus never left the field.
    expect(input).toHaveFocus();
  });

  it("Escape يغلق من داخل الحقل — لا يكتفي بمسحه", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithIntl(<SearchDialog open onClose={onClose} />, "en");

    await user.type(screen.getByRole("combobox"), "club");
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("يعرض حالة تحميل مؤقتة ثم رسالة فراغ منفصلة عن رسالة الخطأ", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchDialog open onClose={vi.fn()} />, "en");

    await user.type(screen.getByRole("combobox"), "zzzz");
    expect(await screen.findByRole("status")).toBeInTheDocument();

    await waitFor(() => expect(pending.has("zzzz")).toBe(true));
    resolveQuery("zzzz", []);

    expect(await screen.findByText(/No results/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("يعرض رسالة خطأ لا تشارك جملتها مع رسالة الفراغ عندما يفشل الطلب", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchDialog open onClose={vi.fn()} />, "en");

    await user.type(screen.getByRole("combobox"), "marathon");
    await waitFor(() => expect(pending.has("marathon")).toBe(true));
    pending.get("marathon")!.reject(new Error("network down"));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/No results/i)).not.toBeInTheDocument();
  });

  it("لا يسمح لردّ متأخر لاستعلام قديم أن يكتب فوق نتيجة استعلام أحدث", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchDialog open onClose={vi.fn()} />, "en");
    const input = screen.getByRole("combobox");

    await user.type(input, "nad");
    await waitFor(() => expect(pending.has("nad")).toBe(true));
    await user.type(input, "i");
    await waitFor(() => expect(pending.has("nadi")).toBe(true));

    resolveQuery("nadi", [{ type: "clubs", total: 1, items: [hit("2", "Nadi Club", "/clubs#nadi")] }]);
    await screen.findByText("Nadi Club");

    // The stale "nad" response arrives last. It must be dropped, not shown.
    resolveQuery("nad", [{ type: "articles", total: 1, items: [hit("1", "Nad Article", "/news/nad")] }]);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByText("Nad Article")).not.toBeInTheDocument();
    expect(screen.getByText("Nadi Club")).toBeInTheDocument();
  });

  it("تظهر تبويبات النوع بعددها عند وجود نتائج، وتُصفّي القائمة", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SearchDialog open onClose={vi.fn()} />, "en");
    const input = screen.getByRole("combobox");

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

    await user.type(input, "sport");
    await waitFor(() => expect(pending.has("sport")).toBe(true));
    resolveQuery("sport", [
      { type: "articles", total: 2, items: [hit("a1", "Sport News", "/news/a1")] },
      { type: "clubs", total: 1, items: [hit("c1", "Sport Club", "/clubs#c1")] },
    ]);

    const tablist = await screen.findByRole("tablist");
    expect(within(tablist).getByRole("tab", { name: /All/ })).toHaveTextContent("3");
    expect(within(tablist).getByRole("tab", { name: /News/ })).toHaveTextContent("2");
    expect(within(tablist).getByRole("tab", { name: /Clubs/ })).toHaveTextContent("1");

    await user.click(within(tablist).getByRole("tab", { name: /Clubs/ }));
    expect(screen.getByText("Sport Club")).toBeInTheDocument();
    expect(screen.queryByText("Sport News")).not.toBeInTheDocument();
  });

  it("يحتفظ بآخر كلمة بحث عند الإغلاق وإعادة الفتح في نفس الصفحة", async () => {
    const user = userEvent.setup();
    // `render`'s own `wrapper` option, not `renderWithIntl`: `rerender` must
    // re-apply the intl provider on every call, which only `wrapper` does —
    // `renderWithIntl` builds the provider once around the first render only.
    const { rerender } = render(<SearchDialog open onClose={vi.fn()} />, {
      wrapper: ({ children }) => (
        <NextIntlClientProvider locale="en" messages={enMessages}>
          {children}
        </NextIntlClientProvider>
      ),
    });

    await user.type(screen.getByRole("combobox"), "archive");

    // Same element, same position — `HeaderShell` toggles `open`, never
    // mounts a second `SearchDialog` — so this is the same component
    // instance a real close/reopen would be, not a fresh one.
    rerender(<SearchDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    rerender(<SearchDialog open onClose={vi.fn()} />);
    expect(screen.getByRole("combobox")).toHaveValue("archive");
  });
});
