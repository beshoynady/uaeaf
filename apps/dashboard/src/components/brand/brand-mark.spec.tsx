import { afterEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import arabic from "../../../messages/ar.json";
import { renderWithIntl } from "@/test/render";
import { BrandMark } from "./brand-mark";

/**
 * The federation's mark, where the shell used to say "Dashboard".
 *
 * Two things this has to get right that a plain image tag would not. The
 * accessible name is the federation's own name, because a screen-reader user
 * needs to know whose dashboard this is, not that there is a logo. And the
 * artwork follows the theme on <html>, which the theme toggle rewrites
 * without refreshing the server: a mark chosen once from the theme cookie
 * would stay the black-lettered colour artwork on a dark ground until the
 * next page load.
 */

/** What the root layout does on the server: the page's theme is this attribute. */
function stampTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

const mark = () => screen.getByRole("img", { name: arabic.Auth.federation });

describe("BrandMark", () => {
  it("is named for the federation, not as a logo", () => {
    stampTheme("light");
    renderWithIntl(<BrandMark initialTheme="light" />);

    expect(mark()).toBeInTheDocument();
  });

  it("draws the full-colour mark on the light ground", () => {
    stampTheme("light");
    renderWithIntl(<BrandMark initialTheme="light" />);

    expect(mark().getAttribute("src")).toContain("uaeaf-logo-color.svg");
  });

  it("draws the white mark on the dark ground", () => {
    stampTheme("dark");
    renderWithIntl(<BrandMark initialTheme="dark" />);

    expect(mark().getAttribute("src")).toContain("uaeaf-logo-white.svg");
  });

  it("follows the theme when it is switched without a reload", async () => {
    stampTheme("light");
    renderWithIntl(<BrandMark initialTheme="light" />);

    stampTheme("dark");

    await waitFor(() => expect(mark().getAttribute("src")).toContain("uaeaf-logo-white.svg"));
  });

  it("is never mirrored, rotated or stretched", () => {
    // Guide §9.1. The shell mirrors under RTL; an identity mark does not.
    stampTheme("light");
    renderWithIntl(<BrandMark initialTheme="light" />);

    expect(mark().getAttribute("class") ?? "").not.toMatch(/scale-x|rotate|rtl:|ltr:/);
  });
});
