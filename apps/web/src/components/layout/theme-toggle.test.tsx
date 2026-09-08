import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { ThemeToggle } from "./theme-toggle";
import { renderWithIntl } from "@/test/render-with-intl";
import type { AppLocale } from "@/i18n/routing";
import arMessages from "../../../messages/ar.json";
import enMessages from "../../../messages/en.json";

const messagesByLocale = { ar: arMessages, en: enMessages } as const;

describe.each<AppLocale>(["ar", "en"])("ThemeToggle (%s)", (locale) => {
  const messages = messagesByLocale[locale];

  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
  });

  it("defaults to announcing a switch to dark mode when no theme is set", () => {
    renderWithIntl(<ThemeToggle />, locale);
    expect(screen.getByRole("button", { name: messages.Header.switchToDarkMode })).toBeInTheDocument();
  });

  it("picks up a theme already applied to the document (set by the layout bootstrap script) rather than re-deciding it", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    renderWithIntl(<ThemeToggle />, locale);
    expect(screen.getByRole("button", { name: messages.Header.switchToLightMode })).toBeInTheDocument();
  });

  // The label is awaited rather than read synchronously because the button no
  // longer holds its own copy of the theme: it reads the `data-theme`
  // attribute through `useSyncExternalStore`, and the MutationObserver that
  // reports the change delivers on a microtask. The user-visible behaviour is
  // unchanged — attribute, storage and label all still flip on one click.
  it("clicking flips data-theme on <html>, persists to localStorage, and relabels itself", async () => {
    renderWithIntl(<ThemeToggle />, locale);
    const button = screen.getByRole("button", { name: messages.Header.switchToDarkMode });

    fireEvent.click(button);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("uaeaf-theme")).toBe("dark");
    expect(
      await screen.findByRole("button", { name: messages.Header.switchToLightMode }),
    ).toBeInTheDocument();
  });

  it("clicking twice returns to light", async () => {
    renderWithIntl(<ThemeToggle />, locale);
    const button = screen.getByRole("button", { name: messages.Header.switchToDarkMode });

    fireEvent.click(button);
    fireEvent.click(await screen.findByRole("button", { name: messages.Header.switchToLightMode }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("uaeaf-theme")).toBe("light");
    expect(
      await screen.findByRole("button", { name: messages.Header.switchToDarkMode }),
    ).toBeInTheDocument();
  });

  it("is a real button, not a link (acts in place, does not navigate)", () => {
    renderWithIntl(<ThemeToggle />, locale);
    const button = screen.getByRole("button", { name: messages.Header.switchToDarkMode });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });
});
