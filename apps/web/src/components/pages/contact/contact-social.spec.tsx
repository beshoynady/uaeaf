import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { ContactSocial } from "./contact-social";

/**
 * The federation's social channels, read from the page's own record.
 *
 * `ContactUsPage.socialLinks` has existed on the API contract from the
 * beginning and the admin panel has always saved it. The public page read it,
 * received it, and rendered none of it — an editor could fill the field and
 * watch nothing happen. This component is what closes that, and these are the
 * properties it has to hold to be worth having.
 */

const LINKS = [
  { platform: "Instagram", url: "https://www.instagram.com/uaeaf" },
  { platform: "X", url: "https://x.com/uaeaf" },
];

describe("ContactSocial", () => {
  it("renders one labelled link per stored channel", () => {
    renderWithIntl(<ContactSocial links={LINKS} />);

    // The accessible name is the platform in the reading language, not the
    // URL: an icon-only control with no name is invisible to a screen reader
    // and unusable by voice.
    expect(screen.getByRole("link", { name: "إنستغرام" })).toHaveProperty(
      "href",
      "https://www.instagram.com/uaeaf",
    );
    expect(screen.getByRole("link", { name: "إكس" })).toBeTruthy();
  });

  it("names the channels in English under the English locale", () => {
    renderWithIntl(<ContactSocial links={LINKS} />, "en");
    expect(screen.getByRole("link", { name: "Instagram" })).toBeTruthy();
  });

  it("meets the 44px touch target on every channel", () => {
    // WCAG 2.5.8 and the project's own acceptance gate. The footer's own
    // social buttons are 32px, which is why this is asserted rather than
    // copied from there.
    renderWithIntl(<ContactSocial links={LINKS} />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.className, link.getAttribute("aria-label") ?? "").toMatch(/\bsize-11\b|\bmin-h-11\b/);
    }
  });

  it("opens an external destination safely", () => {
    renderWithIntl(<ContactSocial links={LINKS} />);
    const link = screen.getByRole("link", { name: "إكس" });

    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("matches a platform however the editor cased or spaced it", () => {
    // The field is free text in the admin panel. "instagram", "Instagram"
    // and "Insta gram " are the same channel to a person and must be to us.
    renderWithIntl(<ContactSocial links={[{ platform: " instagram ", url: "https://x.test" }]} />);
    expect(screen.getByRole("link", { name: "إنستغرام" })).toBeTruthy();
  });

  it("still shows a channel it has no icon for, named by the editor's own word", () => {
    // Dropping it would repeat the defect this component exists to fix:
    // something saved in the panel that never appears on the site.
    renderWithIntl(<ContactSocial links={[{ platform: "LinkedIn", url: "https://li.test" }]} />);
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeTruthy();
  });

  it("renders nothing at all when the record carries no channels", () => {
    // An empty heading over an empty row is a gap in the vertical rhythm
    // that reads as a bug.
    const { container } = renderWithIntl(<ContactSocial links={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("drops a destination that is not a web address", () => {
    // The field is free text, and `javascript:` in an href is a script the
    // page runs on click.
    renderWithIntl(
      <ContactSocial
        links={[
          { platform: "X", url: "javascript:alert(1)" },
          { platform: "Instagram", url: "https://ok.test" },
        ]}
      />,
    );
    expect(screen.queryByRole("link", { name: "إكس" })).toBeNull();
    expect(screen.getByRole("link", { name: "إنستغرام" })).toBeTruthy();
  });
});
