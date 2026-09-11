import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import english from "../../../messages/en.json";
import { renderWithIntl } from "@/test/render";
import { ThemeToggle } from "./theme-toggle";

const { switchToLightMode, switchToDarkMode } = english.Shell;

/** What the root layout does on the server: the page's theme is this attribute. */
function stampTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ThemeToggle", () => {
  it("offers the theme the page is not in", () => {
    stampTheme("dark");
    renderWithIntl(<ThemeToggle initialTheme="dark" />, "en");

    expect(screen.getByRole("button", { name: switchToLightMode })).toHaveTextContent("☀");
  });

  it("is labelled for the theme on <html> from its first paint, without relabelling after mount", () => {
    // The attribute is what the page shows, so it wins over the prop, and a
    // button that first renders the prop and then corrects itself announces a
    // state the page was never in.
    stampTheme("dark");
    const relabels = new MutationObserver(() => {});
    relabels.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-label"] });

    renderWithIntl(<ThemeToggle initialTheme="light" />, "en");

    expect(screen.getByRole("button", { name: switchToLightMode })).toBeInTheDocument();
    expect(relabels.takeRecords()).toHaveLength(0);
    relabels.disconnect();
  });

  it("falls back to the server's theme when <html> carries no theme it knows", () => {
    document.documentElement.setAttribute("data-theme", "high-contrast");
    renderWithIntl(<ThemeToggle initialTheme="dark" />, "en");

    expect(screen.getByRole("button", { name: switchToLightMode })).toBeInTheDocument();
  });

  it("never writes the page's theme while mounting", () => {
    stampTheme("light");
    const writes = new MutationObserver(() => {});
    writes.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    renderWithIntl(<ThemeToggle initialTheme="light" />, "en");

    expect(writes.takeRecords()).toHaveLength(0);
    writes.disconnect();
  });

  it("switches the page and saves the choice", async () => {
    const save = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", save);
    stampTheme("light");
    renderWithIntl(<ThemeToggle initialTheme="light" />, "en");

    await userEvent.click(screen.getByRole("button", { name: switchToDarkMode }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(await screen.findByRole("button", { name: switchToLightMode })).toHaveTextContent("☀");
    expect(save).toHaveBeenCalledWith(
      "/api/preferences",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ preferredTheme: "dark" }) }),
    );
  });

  it("keeps the chosen theme when saving it fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    stampTheme("dark");
    renderWithIntl(<ThemeToggle initialTheme="dark" />, "en");

    await userEvent.click(screen.getByRole("button", { name: switchToLightMode }));

    expect(await screen.findByRole("button", { name: switchToDarkMode })).toHaveTextContent("☾");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("hydrates the server's markup without a mismatch", async () => {
    // The server renders the button from the same cookie it stamps on <html>.
    stampTheme("dark");
    const ui = (
      <NextIntlClientProvider locale="en" messages={english}>
        <ThemeToggle initialTheme="dark" />
      </NextIntlClientProvider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.append(container);
    const problems: unknown[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      problems.push(args);
    });

    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, ui, { onRecoverableError: (error) => problems.push(error) });
    });

    expect(problems).toEqual([]);
    expect(screen.getByRole("button", { name: switchToLightMode })).toBeInTheDocument();
    act(() => root?.unmount());
    container.remove();
  });
});
