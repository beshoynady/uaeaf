import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { LoginForm } from "./login-form";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubLogin(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function submitCredentials() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("البريد الإلكتروني"), "admin@uaeaf.ae");
  await user.type(screen.getByLabelText("كلمة المرور"), "secret");
  await user.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
}

describe("LoginForm", () => {
  it("posts the credentials together with the locale the user is looking at", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    const fetchMock = stubLogin(jsonResponse({ locale: "ar", theme: null }, 200));

    renderWithIntl(<LoginForm locale="ar" />);
    await submitCredentials();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "admin@uaeaf.ae",
      password: "secret",
      locale: "ar",
    });
  });

  it("sends the browser to the locale the server chose, not the one it started on", async () => {
    // The user's stored preferredLanguage wins over the page they happened
    // to open — that is the whole point of persisting it.
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    stubLogin(jsonResponse({ locale: "en", theme: "dark" }, 200));

    renderWithIntl(<LoginForm locale="ar" />);
    await submitCredentials();

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/en"));
  });

  it("states the lockout policy, with no clock, when the API sent no Retry-After", async () => {
    // The case that ships today. A countdown here would be invented: the
    // lock started at the fifth failure, which may have been minutes ago.
    stubLogin(jsonResponse({ code: "accountLocked", retryAfterSeconds: null }, 401));

    renderWithIntl(<LoginForm locale="ar" />);
    await submitCredentials();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("الحساب مقفل مؤقتًا");
    expect(alert).toHaveTextContent("خمس عشرة دقيقة");
    expect(alert.querySelector("time")).toBeNull();
  });

  it("runs a real countdown when the API did send one, and re-opens the form at zero", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      stubLogin(jsonResponse({ code: "accountLocked", retryAfterSeconds: 3 }, 401));

      renderWithIntl(<LoginForm locale="ar" />);
      await submitCredentials();

      expect(await screen.findByRole("alert")).toHaveTextContent("00:03");
      expect(screen.getByRole("button", { name: "تسجيل الدخول" })).toBeDisabled();

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // The notice clears itself; the user is not left staring at 00:00
      // wondering whether to reload.
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
      expect(screen.getByRole("button", { name: "تسجيل الدخول" })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tells a throttled user their account is not locked", async () => {
    // 429 is the endpoint's own rate limit (10/60s) and says nothing about
    // the credentials. Reusing the lockout wording would report a lock that
    // does not exist.
    stubLogin(jsonResponse({ code: "tooManyAttempts", retryAfterSeconds: null }, 429));

    renderWithIntl(<LoginForm locale="ar" />);
    await submitCredentials();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("حسابك غير مقفل");
    expect(screen.getByRole("button", { name: "تسجيل الدخول" })).toBeEnabled();
  });

  it("leaves the button usable when a timed refusal carries no wait", async () => {
    // Without Retry-After the wait is unknown, so a disabled button would
    // have no event that ever re-enables it.
    stubLogin(jsonResponse({ code: "accountLocked", retryAfterSeconds: null }, 401));

    renderWithIntl(<LoginForm locale="ar" />);
    await submitCredentials();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "تسجيل الدخول" })).toBeEnabled();
  });

  it("offers the recovery route from the sign-in screen itself", async () => {
    renderWithIntl(<LoginForm locale="ar" />);

    expect(screen.getByRole("link", { name: "نسيت كلمة المرور؟" })).toHaveAttribute(
      "href",
      "/ar/forgot-password",
    );
  });

  it("lets the password be revealed, so a twelve-character entry can be checked", async () => {
    // WCAG 2.2 SC 3.3.8 — typing a long password blind is the memory test
    // the criterion asks us not to impose.
    const user = userEvent.setup();
    renderWithIntl(<LoginForm locale="ar" />);

    const field = screen.getByLabelText("كلمة المرور");
    expect(field).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "إظهار كلمة المرور" }));
    expect(field).toHaveAttribute("type", "text");
  });

  it("shows the credentials message for a rejected sign-in", async () => {
    stubLogin(jsonResponse({ code: "invalidCredentials" }, 401));

    renderWithIntl(<LoginForm locale="ar" />);
    await submitCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent("غير صحيحة");
  });

  it("falls back to the availability message for a code it does not recognise", async () => {
    // Renders a real sentence instead of leaking a raw key into the UI if
    // the BFF ever grows a new code before this component knows about it.
    stubLogin(jsonResponse({ code: "somethingNew" }, 500));

    renderWithIntl(<LoginForm locale="ar" />);
    await submitCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent("تعذّر الوصول إلى الخادم");
  });

  it("re-enables the button after a failure so the user can correct and retry", async () => {
    stubLogin(jsonResponse({ code: "invalidCredentials" }, 401));

    renderWithIntl(<LoginForm locale="ar" />);
    await submitCredentials();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "تسجيل الدخول" })).toBeEnabled();
  });

  it("keeps email and password fields left-to-right inside the Arabic layout", async () => {
    renderWithIntl(<LoginForm locale="ar" />);

    expect(screen.getByLabelText("البريد الإلكتروني")).toHaveAttribute("dir", "ltr");
    expect(screen.getByLabelText("كلمة المرور")).toHaveAttribute("dir", "ltr");
  });

  it("renders the English catalogue when the locale is English", async () => {
    renderWithIntl(<LoginForm locale="en" />, "en");

    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
