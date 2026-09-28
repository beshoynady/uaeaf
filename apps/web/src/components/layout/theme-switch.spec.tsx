import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { ThemeSwitch } from "./theme-switch";

describe("ThemeSwitch", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-switching");
    localStorage.clear();
  });

  // Locale-independent: `toggle`, `readTheme`, `subscribe` and the mark never
  // read a message. English keeps the assertions readable; `header-tools-
  // capsule.spec.tsx` already exercises the Arabic render of this control.
  it("clicking flips data-theme on <html>, persists to localStorage, and flips aria-checked", async () => {
    renderWithIntl(<ThemeSwitch />, "en");
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    fireEvent.click(toggle);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("uaeaf-theme")).toBe("dark");
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
  });

  it("clicking twice returns to light", async () => {
    renderWithIntl(<ThemeSwitch />, "en");
    const toggle = screen.getByRole("switch");

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    fireEvent.click(toggle);

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("uaeaf-theme")).toBe("light");
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
  });

  // Pins the DOUBLE `requestAnimationFrame` by invoking the captured
  // callbacks directly rather than waiting on jsdom's real frame timer — the
  // timer batches callbacks per-interval across the whole file, so which tick
  // two independently-awaited `requestAnimationFrame` calls land in is not
  // stable test-to-test, while calling back the exact function the component
  // registered is. A single rAF collapses this to one registered call and
  // removes the mark on the first invocation, failing the second assertion
  // below (verified locally — see task-B2-report.md).
  it("marks the document across two frames, not one, then takes the mark away", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    renderWithIntl(<ThemeSwitch />, "en");

    fireEvent.click(screen.getByRole("switch"));
    expect(document.documentElement.hasAttribute("data-theme-switching")).toBe(true);
    expect(raf).toHaveBeenCalledTimes(1);

    raf.mock.calls[0][0](0);
    expect(document.documentElement.hasAttribute("data-theme-switching")).toBe(true);
    expect(raf).toHaveBeenCalledTimes(2);

    raf.mock.calls[1][0](0);
    expect(document.documentElement.hasAttribute("data-theme-switching")).toBe(false);

    raf.mockRestore();
  });

  it("reads an already-applied light or dark theme rather than re-deciding it", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    renderWithIntl(<ThemeSwitch />, "en");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("defaults to unchecked when nothing is stored and no attribute is set", () => {
    renderWithIntl(<ThemeSwitch />, "en");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("is a real button, not a link (acts in place, does not navigate)", () => {
    renderWithIntl(<ThemeSwitch />, "en");
    const toggle = screen.getByRole("switch");
    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle).toHaveAttribute("type", "button");
  });
});
