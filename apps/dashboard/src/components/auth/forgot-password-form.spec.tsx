import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ForgotPasswordForm } from "./forgot-password-form";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function submit(email = "admin@uaeaf.ae") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("البريد الإلكتروني"), email);
  await user.click(screen.getByRole("button", { name: "إرسال رابط الاستعادة" }));
}

describe("ForgotPasswordForm", () => {
  it("sends the address together with the locale, so the mail matches the reader's language", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 202 }));

    renderWithIntl(<ForgotPasswordForm locale="ar" />);
    await submit();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/forgot-password");
    expect(JSON.parse(init.body as string)).toEqual({ email: "admin@uaeaf.ae", locale: "ar" });
  });

  it("replaces the form with a confirmation rather than leaving a live send button under it", async () => {
    stubFetch(new Response(null, { status: 202 }));

    renderWithIntl(<ForgotPasswordForm locale="ar" />);
    await submit();

    expect(await screen.findByRole("status")).toHaveTextContent("تحقّق من بريدك");
    expect(screen.queryByRole("button", { name: "إرسال رابط الاستعادة" })).toBeNull();
  });

  it("says exactly the same thing for an address that has no account", async () => {
    // The API answers 202 either way. If this screen ever branched on the
    // response, the form would become a directory of who holds an account.
    stubFetch(new Response(null, { status: 202 }));

    renderWithIntl(<ForgotPasswordForm locale="ar" />);
    await submit("nobody@example.com");

    const panel = await screen.findByRole("status");
    expect(panel).toHaveTextContent("إن كان هناك حساب مرتبط بهذا البريد");
    expect(panel).toHaveTextContent("nobody@example.com");
  });

  it("never claims a mail was sent when the request failed", async () => {
    // The load-bearing case today: POST /auth/forgot-password does not
    // exist, so this is what an administrator actually sees.
    stubFetch(
      new Response(JSON.stringify({ code: "serviceUnavailable" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );

    renderWithIntl(<ForgotPasswordForm locale="ar" />);
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("تعذّر الوصول إلى الخادم");
    expect(screen.queryByText("تحقّق من بريدك")).toBeNull();
    expect(screen.getByRole("button", { name: "إرسال رابط الاستعادة" })).toBeEnabled();
  });

  it("renders the English catalogue when the locale is English", () => {
    renderWithIntl(<ForgotPasswordForm locale="en" />, "en");

    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });
});
