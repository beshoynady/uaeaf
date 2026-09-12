import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { BilingualRichText } from "./bilingual-rich-text";
import { RichTextEditor } from "./rich-text-editor";
import type { AppLocale } from "@/i18n/routing";

/**
 * The editor as an author meets it.
 *
 * The rules under test are not TipTap's — they are this platform's: which
 * controls exist in which language, whether the whole toolbar can be worked
 * without a mouse, and whether a paste that quietly dropped three
 * photographs says so. What TipTap does with a keystroke afterwards is
 * TipTap's own test suite's business.
 */
function renderEditor(ui: ReactElement, locale: AppLocale = "ar") {
  return renderWithIntl(
    // ToastProvider mounts the region itself, exactly as the (app) layout does.
    <ToastProvider>{ui}</ToastProvider>,
    locale,
  );
}

function arabicEditor(onChange = vi.fn()) {
  renderEditor(
    <RichTextEditor id="body" label="نص الرسالة" lang="ar" value={null} onChange={onChange} />,
  );
  return onChange;
}

const toolbar = () => screen.findByRole("toolbar");
const buttons = async () => within(await toolbar()).getAllByRole("button");

describe("which controls the toolbar offers", () => {
  it("offers no italic control in Arabic", async () => {
    arabicEditor();
    const names = (await buttons()).map((button) => button.getAttribute("aria-label"));

    expect(names).not.toContain("مائل");
    expect(names).toContain("عريض");
  });

  it("offers an italic control in English", async () => {
    renderEditor(
      <RichTextEditor
        id="body"
        label="Message body"
        lang="en"
        value={null}
        onChange={vi.fn()}
      />,
      "en",
    );
    const names = (await buttons()).map((button) => button.getAttribute("aria-label"));

    expect(names).toContain("Italic");
  });

  /**
   * Alignment is refused by the API for every language — `textAlign` is
   * simply not an allowed attribute — so there is nothing for a control to
   * do. See `allowlist.spec.ts`, which proves the extension cannot produce it
   * either.
   */
  it.each(["ar", "en"] as const)("offers no alignment control (%s)", async (lang) => {
    renderEditor(
      <RichTextEditor id="body" label="Body" lang={lang} value={null} onChange={vi.fn()} />,
      lang,
    );

    for (const button of await buttons()) {
      expect(button.getAttribute("aria-label")?.toLowerCase()).not.toMatch(/align|محاذا/);
    }
  });

  it("names every control, because an icon is not an accessible name", async () => {
    arabicEditor();

    for (const button of await buttons()) {
      expect(button.getAttribute("aria-label")).toBeTruthy();
      // Whatever is inside is decoration; the name is on the button.
      for (const child of Array.from(button.children)) {
        expect(child.getAttribute("aria-hidden")).toBe("true");
      }
    }
  });

  it("names the toolbar itself", async () => {
    arabicEditor();
    expect(await toolbar()).toHaveAccessibleName("تنسيق النص");
  });
});

describe("working the toolbar from the keyboard", () => {
  /**
   * A toolbar is one stop in the tab sequence, not one stop per button —
   * otherwise reaching the text means tabbing past a dozen controls every
   * time. WAI-ARIA's toolbar pattern: roving `tabindex`, arrows within.
   */
  it("is a single tab stop", async () => {
    arabicEditor();
    const tabbable = (await buttons()).filter((button) => button.tabIndex === 0);

    expect(tabbable).toHaveLength(1);
  });

  it("moves along the toolbar with the arrow that points into the text", async () => {
    const user = userEvent.setup();
    arabicEditor();
    const all = await buttons();

    all[0].focus();
    // Arabic reads right to left, so "next" is the left arrow.
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(all[1]);

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(all[0]);
  });

  it("moves the other way round in English", async () => {
    const user = userEvent.setup();
    renderEditor(
      <RichTextEditor id="body" label="Body" lang="en" value={null} onChange={vi.fn()} />,
      "en",
    );
    const all = await buttons();

    all[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(all[1]);
  });

  it("reaches both ends with Home and End", async () => {
    const user = userEvent.setup();
    arabicEditor();
    const all = await buttons();

    all[0].focus();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(all[all.length - 1]);

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(all[0]);
  });

  /**
   * An unavailable control keeps its place in the sequence rather than
   * disappearing from it. A natively disabled button is unfocusable, so the
   * number of arrow stops would change as the document changes — the reader
   * would be counting a moving target.
   */
  it("keeps an unavailable control focusable and says it is unavailable", async () => {
    arabicEditor();
    const undo = within(await toolbar()).getByRole("button", { name: "تراجع" });

    expect(undo).toHaveAttribute("aria-disabled", "true");
    expect(undo).not.toBeDisabled();
  });

  it("reports a toggle's state", async () => {
    const user = userEvent.setup();
    arabicEditor();
    const bold = within(await toolbar()).getByRole("button", { name: "عريض" });

    expect(bold).toHaveAttribute("aria-pressed", "false");
    await user.click(bold);
    await waitFor(() => expect(bold).toHaveAttribute("aria-pressed", "true"));
  });
});

describe("the editable region", () => {
  it("carries the field's name, so it is not an unnamed box", async () => {
    arabicEditor();
    const region = await screen.findByRole("textbox");

    expect(region).toHaveAccessibleName("نص الرسالة");
    expect(region).toHaveAttribute("aria-multiline", "true");
  });

  it("reads in its own direction, whatever the surrounding page does", async () => {
    renderEditor(
      <RichTextEditor id="body" label="Body" lang="en" value={null} onChange={vi.fn()} />,
      "ar",
    );
    const region = await screen.findByRole("textbox");

    expect(region).toHaveAttribute("dir", "ltr");
    expect(region).toHaveAttribute("lang", "en");
  });
});

describe("leaving the editor with the keyboard", () => {
  /**
   * WCAG 2.1.2. TipTap binds `Tab` inside a list to *indent* and `Shift-Tab`
   * to *outdent*, so from any list item forward tabbing never leaves the
   * editor and backward tabbing leaves it only by unmaking the author's list
   * on the way out. Neither is an exit.
   *
   * Escape is the exit. 2.1.2 allows a method other than plain Tab as long as
   * the user is told what it is, so the editor carries a hint that names it
   * and points `aria-describedby` at it — otherwise the exit exists but only
   * for whoever already knew.
   */
  it("lets Escape put focus back outside the text", async () => {
    const user = userEvent.setup();
    arabicEditor();
    const region = await screen.findByRole("textbox");

    (region as HTMLElement).focus();
    expect(region).toHaveFocus();

    // TipTap defers the actual blur into a frame, so the assertion waits for
    // one rather than reading the DOM in the same tick as the keystroke.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(region).not.toHaveFocus());
  });

  it("tells the reader that Escape is the way out", async () => {
    arabicEditor();
    const region = await screen.findByRole("textbox");

    expect(region).toHaveAccessibleDescription(expect.stringContaining("Escape"));
  });

  it("keeps describing the field as well, when there is something to describe", async () => {
    const body = (text: string) => ({
      type: "doc",
      content: text
        .split("|")
        .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] })),
    });

    renderEditor(
      <BilingualRichText
        id="body"
        labelAr="النص بالعربية"
        labelEn="النص بالإنجليزية"
        valueAr={body("أ|ب|ج")}
        valueEn={body("A|B")}
        onChangeAr={vi.fn()}
        onChangeEn={vi.fn()}
      />,
    );

    const [arabic] = await screen.findAllByRole("textbox");
    // Both: the standing warning about the two languages, and the way out.
    expect(arabic).toHaveAccessibleDescription(expect.stringContaining("Escape"));
    expect(arabic).toHaveAccessibleDescription(expect.stringContaining("النص العربي في 3 فقرة"));
  });
});

describe("adding a link", () => {
  const openLinkForm = async (user: ReturnType<typeof userEvent.setup>) => {
    const control = within(await toolbar()).getByRole("button", { name: "إضافة رابط" });
    await user.click(control);
    return control;
  };

  /**
   * Not `window.prompt`: it cannot be styled, cannot be translated, cannot
   * show a validation message, and on some platforms is suppressed entirely
   * — leaving the control silently dead.
   */
  it("opens an inline form and puts the caret in it", async () => {
    const user = userEvent.setup();
    arabicEditor();
    await openLinkForm(user);

    const input = await screen.findByLabelText("عنوان الرابط");
    expect(input).toHaveFocus();
  });

  it("refuses an address the platform cannot store, in place, without closing", async () => {
    const user = userEvent.setup();
    arabicEditor();
    await openLinkForm(user);

    await user.type(await screen.findByLabelText("عنوان الرابط"), "tel:+97100000000");
    await user.click(screen.getByRole("button", { name: "تطبيق" }));

    // Announced the way every other field on this dashboard announces a
    // refusal: as the field's own description, reachable from the control
    // the reader is standing on.
    const input = screen.getByLabelText("عنوان الرابط");
    await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"));
    expect(input).toHaveAccessibleDescription(expect.stringContaining("https://"));
    expect(input).toBeInTheDocument();
  });

  it("closes on Escape and gives focus back to the control that opened it", async () => {
    const user = userEvent.setup();
    arabicEditor();
    const control = await openLinkForm(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByLabelText("عنوان الرابط")).not.toBeInTheDocument());
    expect(control).toHaveFocus();
  });
});

describe("pasting", () => {
  /**
   * The removal itself is `paste-cleanup.spec.ts`'s subject. What matters
   * here is that the author is *told*: a paste that silently dropped three
   * photographs is the defect, not the dropping.
   */
  it("says what a paste lost, with counts", async () => {
    arabicEditor();
    const region = await screen.findByRole("textbox");

    paste(
      region,
      '<p>Text</p><img src="https://x.example/a.jpg"><table><tr><td>1</td></tr></table>',
    );

    // A warning, not an error: the paste succeeded. `ToastRegion` gives
    // anything short of an error `role="status"`.
    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("أُزيلت صورة");
    expect(notice).toHaveTextContent("أُزيل جدول");
  });

  it("says nothing when a paste lost nothing", async () => {
    arabicEditor();
    const region = await screen.findByRole("textbox");

    paste(region, "<p>Ordinary sentence.</p>");

    await expect.poll(() => screen.queryByRole("status")).toBeNull();
  });
});

describe("the two languages side by side", () => {
  const body = (text: string) => ({
    type: "doc",
    content: text
      .split("|")
      .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] })),
  });

  it("warns when the two are built differently", async () => {
    renderEditor(
      <BilingualRichText
        id="body"
        labelAr="النص بالعربية"
        labelEn="النص بالإنجليزية"
        valueAr={body("أ|ب|ج")}
        valueEn={body("A|B")}
        onChangeAr={vi.fn()}
        onChangeEn={vi.fn()}
      />,
    );

    // Asserted as one sentence rather than two loose numbers, so a warning
    // that reported the counts the wrong way round still fails.
    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("النص العربي في 3 فقرة والإنجليزي في 2");
  });

  it("stays quiet when they match", async () => {
    renderEditor(
      <BilingualRichText
        id="body"
        labelAr="النص بالعربية"
        labelEn="النص بالإنجليزية"
        valueAr={body("أ|ب")}
        valueEn={body("A|B")}
        onChangeAr={vi.fn()}
        onChangeEn={vi.fn()}
      />,
    );

    await screen.findAllByRole("textbox");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays quiet while one language is still empty", async () => {
    renderEditor(
      <BilingualRichText
        id="body"
        labelAr="النص بالعربية"
        labelEn="النص بالإنجليزية"
        valueAr={body("أ|ب|ج")}
        valueEn={null}
        onChangeAr={vi.fn()}
        onChangeEn={vi.fn()}
      />,
    );

    await screen.findAllByRole("textbox");
    expect(screen.queryByRole("status")).toBeNull();
  });
});

/**
 * A paste, as ProseMirror sees one.
 *
 * jsdom builds no `clipboardData`, so the event carries a hand-made one. Only
 * the two members ProseMirror reads are provided — anything more would be
 * describing a clipboard rather than using one.
 */
function paste(target: Element, html: string): void {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: {
      types: ["text/html"],
      getData: (type: string) => (type === "text/html" ? html : ""),
      files: [],
    },
  });
  target.dispatchEvent(event);
}
