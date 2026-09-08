import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ResetPasswordForm } from "./reset-password-form";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const STRONG = "Falcon-Ascent-2026";

function saveButton() {
  return screen.getByRole("button", { name: "حفظ كلمة المرور" });
}

async function fill(password: string, confirmation = password) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("كلمة المرور الجديدة"), password);
  if (confirmation.length > 0) {
    await user.type(screen.getByLabelText("تأكيد كلمة المرور"), confirmation);
  }
  return user;
}

describe("ResetPasswordForm", () => {
  it("keeps the button closed until the entry is long enough and both fields agree", async () => {
    renderWithIntl(<ResetPasswordForm token="abc" locale="ar" />);
    expect(saveButton()).toBeDisabled();

    await fill("short", "short");
    expect(saveButton()).toBeDisabled();
  });

  it("names the mismatch instead of just refusing", async () => {
    renderWithIntl(<ResetPasswordForm token="abc" locale="ar" />);
    await fill(STRONG, "Falcon-Ascent-2027");

    expect(screen.getByText("الحقلان غير متطابقين.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("counts down to the requirement while the user types", async () => {
    // The rule is the only thing that can block submission, so it states
    // both the target and where the user currently is.
    renderWithIntl(<ResetPasswordForm token="abc" locale="ar" />);
    await fill("abcdef", "");

    expect(screen.getByText(/الحد الأدنى 12 حرفًا/)).toHaveTextContent("كتبتَ 6");
  });

  it("rates a long, varied password as strong without ever requiring it", async () => {
    renderWithIntl(<ResetPasswordForm token="abc" locale="ar" />);
    await fill(STRONG);

    expect(screen.getByText("قوية")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("accepts a twelve-character password the meter calls weak, because the API does", async () => {
    stubFetch(new Response(null, { status: 204 }));
    renderWithIntl(<ResetPasswordForm token="abc" locale="ar" />);
    await fill("abcdefghijkl");

    expect(screen.getByText("ضعيفة")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it("posts the token from the URL and never renders it", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    renderWithIntl(<ResetPasswordForm token="tok-9f3a" locale="ar" />);
    const user = await fill(STRONG);
    await user.click(saveButton());

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/reset-password");
    expect(JSON.parse(init.body as string)).toEqual({ token: "tok-9f3a", password: STRONG });
    expect(document.body.textContent).not.toContain("tok-9f3a");
  });

  it("ends at sign-in rather than pretending the session survived", async () => {
    stubFetch(new Response(null, { status: 204 }));

    renderWithIntl(<ResetPasswordForm token="abc" locale="ar" />);
    const user = await fill(STRONG);
    await user.click(saveButton());

    expect(await screen.findByRole("status")).toHaveTextContent("تم تغيير كلمة المرور");
    expect(screen.getByRole("link", { name: "تسجيل الدخول" })).toHaveAttribute("href", "/ar/login");
  });

  it("offers a fresh link when the token is refused, instead of a dead end", async () => {
    stubFetch(
      new Response(JSON.stringify({ code: "invalidToken" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    renderWithIntl(<ResetPasswordForm token="expired" locale="ar" />);
    const user = await fill(STRONG);
    await user.click(saveButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("غير صالح أو انتهت صلاحيته");
    expect(screen.getByRole("link", { name: "اطلب رابطًا جديدًا" })).toHaveAttribute(
      "href",
      "/ar/forgot-password",
    );
  });

  it("renders the English catalogue when the locale is English", () => {
    renderWithIntl(<ResetPasswordForm token="abc" locale="en" />, "en");

    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save password" })).toBeInTheDocument();
  });
});
