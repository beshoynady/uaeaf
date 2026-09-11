import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { ContactForm, type MessageTypeOption } from "./contact-form";

/**
 * The form's required contract, asserted by rendering it rather than by
 * reading its class strings.
 *
 * These exist because a source-text guard would have passed on the defect
 * they were written for: the placeholder option carried `hidden`, which is
 * spelled correctly, reads correctly, and makes Chrome silently select the
 * first *real* option instead. The question "what is this select's value
 * before anyone touches it" has one honest answer, and it is the rendered
 * one.
 */

const TYPES: readonly MessageTypeOption[] = [
  { value: "general", label: "استفسار عام" },
  { value: "media", label: "طلب إعلامي" },
];

const renderForm = (locale: "ar" | "en" = "ar") =>
  renderWithIntl(
    <ContactForm title="راسلنا" consentNote={null} messageTypes={TYPES} headingId="h" />,
    locale,
  );

describe("the contact form's message type", () => {
  it("has no answer until the reader gives one", () => {
    renderForm();
    const select = screen.getByLabelText(/نوع الرسالة/) as HTMLSelectElement;

    // Not `TYPES[0].value`. A required question that arrives pre-answered is
    // not a required question: the reader submits, the field passes, and the
    // federation routes a message by a type nobody chose.
    expect(select.value).toBe("");
  });

  it("keeps the empty option reachable so the browser cannot skip past it", () => {
    renderForm();
    const select = screen.getByLabelText(/نوع الرسالة/) as HTMLSelectElement;
    const placeholder = select.options[0];

    expect(placeholder.value).toBe("");
    // Neither marker: "ask for a reset" selects the first option in tree
    // order **that is not disabled**, and a `display: none` one cannot be
    // shown, so `hidden` and `disabled` both hand this required field a real
    // answer. Left plain, the rule lands here by itself.
    expect(placeholder.hidden).toBe(false);
    expect(placeholder.disabled).toBe(false);
    expect(placeholder.dataset.placeholder).toBeDefined();
  });

  it("refuses a submission that never chose one", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /إرسال/ }));

    const select = screen.getByLabelText(/نوع الرسالة/);
    expect(select.getAttribute("aria-invalid")).toBe("true");
  });

  it("still has no answer after a sent message clears the form", async () => {
    // The path that made the first fix incomplete. `form.reset()` restores
    // every option's selectedness from its `selected` *attribute* — none has
    // one — and the browser then runs "ask for a reset", which selects the
    // first option in tree order **that is not disabled**. A `disabled`
    // placeholder is skipped by that rule exactly as a `hidden` one is, so
    // the second message a visitor sends began pre-answered.
    //
    // Read this one honestly: jsdom implements neither skip, so putting
    // `disabled` back leaves this test GREEN — verified by doing exactly
    // that. What bites here is the attribute assertion in the test above;
    // what proves the *rendered* value across a reset is Chrome, in the live
    // sweep. This holds the React half — that a reset actually reaches the
    // control and no retained value survives it — and claims nothing more.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/الاسم/), "سالم");
    await user.type(screen.getByLabelText(/رقم الهاتف/), "0500000000");
    await user.selectOptions(screen.getByLabelText(/نوع الرسالة/), "general");
    await user.type(screen.getByLabelText(/^الرسالة/), "مرحبًا");
    await user.click(screen.getByRole("button", { name: /إرسال/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const select = screen.getByLabelText(/نوع الرسالة/) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe(""));
    vi.unstubAllGlobals();
  });
});

describe("the contact form marks what is required (§F.4)", () => {
  it("pairs every glyph with an `aria-required`, and never one without the other", () => {
    const { container } = renderForm();

    const glyphs = container.querySelectorAll(".field-label > span[aria-hidden]").length;
    const flagged = container.querySelectorAll("[aria-required='true']").length;

    expect(glyphs).toBe(4);
    expect(flagged).toBe(glyphs);
  });

  it("explains the glyph once, at the top, rather than on every field", () => {
    renderForm("en");
    expect(screen.getAllByText("Fields marked with * are required.")).toHaveLength(1);
  });

  it("asks for a phone number and not an email address", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /إرسال/ }));

    expect(screen.getByLabelText(/رقم الهاتف/).getAttribute("aria-required")).toBe("true");
    expect(screen.getByLabelText(/البريد الإلكتروني/).getAttribute("aria-required")).toBeNull();
    expect(screen.getByLabelText(/رقم الهاتف/).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText(/البريد الإلكتروني/).getAttribute("aria-invalid")).toBe("false");
  });
});
