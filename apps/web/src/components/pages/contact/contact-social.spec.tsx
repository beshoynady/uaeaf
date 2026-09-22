import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { ContactSocial } from "./contact-social";
import type { MediaAssetPublic } from "@/lib/api/types";

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

/** A published image, in the shape `fetchPublicMedia` returns. */
const image = (id: string, url: string) =>
  ({
    id,
    file: { url, mimeType: "image/png", width: 128, height: 128, size: 1, photographer: null, captureDate: null },
    caption: { ar: "", en: "" },
    altText: { ar: "أيقونة", en: "Icon" },
    displayOrder: 0,
    isFeatured: false,
  }) as MediaAssetPublic;

describe("ContactSocial — an icon the editor uploaded (owner request 2026-09-21)", () => {
  const iconOf = (name: string) => screen.getByRole("link", { name }).querySelector("img");

  it("draws the uploaded icon instead of the platform's own", () => {
    renderWithIntl(
      <ContactSocial
        links={[{ platform: "Instagram", url: "https://www.instagram.com/uaeaf", iconId: "i1" }]}
        icons={new Map([["i1", image("i1", "https://cdn.test/instagram-custom.png")]])}
      />,
    );

    // Still named by the platform: the picture changed, the channel did not.
    expect(iconOf("إنستغرام")?.getAttribute("src")).toContain("instagram-custom.png");
  });

  it("keeps the platform's own icon when a link has none", () => {
    renderWithIntl(<ContactSocial links={[{ platform: "Instagram", url: "https://www.instagram.com/uaeaf" }]} icons={new Map()} />);

    expect(iconOf("إنستغرام")?.getAttribute("src")).toContain("instagram.svg");
  });

  it("falls back to the platform's own icon when the uploaded one is not published", () => {
    // A hidden or deleted asset does not resolve: the channel must still
    // look like itself rather than go blank.
    renderWithIntl(
      <ContactSocial
        links={[{ platform: "Instagram", url: "https://www.instagram.com/uaeaf", iconId: "gone" }]}
        icons={new Map()}
      />,
    );

    expect(iconOf("إنستغرام")?.getAttribute("src")).toContain("instagram.svg");
  });

  it("gives a platform with no built-in artwork its uploaded icon rather than two letters", () => {
    renderWithIntl(
      <ContactSocial
        links={[{ platform: "Threads", url: "https://www.threads.net/@uaeaf", iconId: "t1" }]}
        icons={new Map([["t1", image("t1", "https://cdn.test/threads.png")]])}
      />,
    );

    expect(iconOf("Threads")?.getAttribute("src")).toContain("threads.png");
    expect(screen.getByRole("link", { name: "Threads" }).className).toMatch(/\bsize-11\b/);
  });
});

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
