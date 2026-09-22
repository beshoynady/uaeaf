import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./site-footer";
import { FOOTER_QUICK_LINKS, LEGAL_LINKS } from "@/lib/navigation";
import type { FooterContent } from "@/lib/pages/footer-content";
import type { MediaAssetPublic } from "@/lib/api/types";
import { renderWithIntl } from "@/test/render-with-intl";
import type { AppLocale } from "@/i18n/routing";
import arMessages from "../../../messages/ar.json";
import enMessages from "../../../messages/en.json";

const messagesByLocale = { ar: arMessages, en: enMessages } as const;

const ICON = {
  id: "i1",
  file: { url: "https://cdn.test/threads.png", mimeType: "image/png", width: 128, height: 128, size: 1, photographer: null, captureDate: null },
  caption: { ar: "", en: "" },
  altText: { ar: "", en: "" },
  displayOrder: 0,
  isFeatured: false,
} as MediaAssetPublic;

/** The footer as the layout reads it: the contact page's record in the
 *  page's language, and the footer's own words from the site settings. */
const CONTENT: Record<AppLocale, FooterContent> = {
  ar: {
    place: "١ شارع النهدة، النهدة الأولى",
    region: "دبي، الإمارات العربية المتحدة",
    latitude: 25.286069,
    longitude: 55.3642228,
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=25.286069,55.3642228",
    email: "info@uaeaf.ae",
    officeHours: "الأحد – الخميس، ٨:٠٠ – ١٥:٠٠",
    channels: [
      { platform: "Instagram", url: "https://www.instagram.com/uaeaf" },
      { platform: "Threads", url: "https://www.threads.net/@uaeaf", iconId: "i1" },
      { platform: "X", url: "javascript:alert(1)" },
    ],
    icons: new Map([["i1", ICON]]),
    aboutBlurb: "وصف الاتحاد كما حفظه المحرر.",
    copyright: "© ٢٠٢٦ حقوق الاتحاد.",
    headings: { quickLinks: "روابط الموقع", location: "أين نحن", contact: "راسلنا" },
  },
  en: {
    place: "1 Al Nahda Street, Al Nahda 1",
    region: "Dubai, United Arab Emirates",
    latitude: 25.286069,
    longitude: 55.3642228,
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=25.286069,55.3642228",
    email: "info@uaeaf.ae",
    officeHours: "Sunday – Thursday, 08:00 – 15:00",
    channels: [
      { platform: "Instagram", url: "https://www.instagram.com/uaeaf" },
      { platform: "Threads", url: "https://www.threads.net/@uaeaf", iconId: "i1" },
      { platform: "X", url: "javascript:alert(1)" },
    ],
    icons: new Map([["i1", ICON]]),
    aboutBlurb: "The federation, as the editor saved it.",
    copyright: "© 2026 the federation's rights.",
    headings: { quickLinks: "Site links", location: "Where we are", contact: "Write to us" },
  },
};

/** What the layout passes when neither record can be read. */
const NOTHING: FooterContent = {
  place: null,
  region: null,
  latitude: null,
  longitude: null,
  directionsUrl: null,
  email: null,
  officeHours: null,
  channels: [],
  icons: new Map(),
  aboutBlurb: null,
  copyright: null,
  headings: { quickLinks: null, location: null, contact: null },
};

const classes = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);

// The map frame draws its map once it is on screen (`footer-map-frame.test.tsx`
// covers the waiting). Here every frame is on screen as soon as it is observed.
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private readonly callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe = () => this.callback([{ isIntersecting: true }]);
      disconnect = () => undefined;
    },
  );
});

describe.each<AppLocale>(["ar", "en"])("SiteFooter (%s)", (locale) => {
  const messages = messagesByLocale[locale];
  const localePath = (href: string) => `/${locale}${href === "/" ? "" : href}`;
  const content = CONTENT[locale];
  const renderFooter = (value: FooterContent = content) => renderWithIntl(<SiteFooter content={value} />, locale);
  const column = (name: string) => screen.getByRole("heading", { level: 2, name }).closest("[data-footer-column]");

  describe("the live map (ADR-0092 D3)", () => {
    it("draws the contact page's map, at the record's coordinates, in the location column", () => {
      renderFooter();
      const frame = screen.getByTitle(messages.Contact.map.frameTitle);
      const source = new URL(frame.getAttribute("src") ?? "");

      expect(frame.tagName).toBe("IFRAME");
      expect(source.searchParams.get("q")).toBe("25.286069,55.3642228");
      expect(source.searchParams.get("hl")).toBe(locale);
      expect(column(content.headings.location!)).toContainElement(frame);
    });

    it("loads the map only when the reader nears it", () => {
      // The footer is on every page; a third-party frame on every visit would
      // cost every reader a cross-origin request, including those who never
      // scroll to it.
      renderFooter();
      expect(screen.getByTitle(messages.Contact.map.frameTitle).getAttribute("loading")).toBe("lazy");
    });

    it("names the place under the map, not over it", () => {
      renderFooter();
      const frame = screen.getByTestId("footer-map-frame");
      const place = screen.getByTestId("footer-place");

      expect(place).toHaveTextContent(content.place!);
      expect(place).toHaveTextContent(content.region!);
      expect(frame.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(frame).not.toContainElement(place);
    });

    it("draws no map, and no empty frame, when the record has no coordinates", () => {
      renderFooter({ ...content, latitude: null, longitude: null });

      expect(screen.queryByTestId("footer-map-frame")).toBeNull();
      expect(screen.queryByTitle(messages.Contact.map.frameTitle)).toBeNull();
      expect(screen.getByTestId("footer-place")).toHaveTextContent(content.place!);
    });

    it("offers directions from the record, and no longer a link to the same map on another page", () => {
      renderFooter();
      const directions = screen.getByRole("link", { name: messages.Contact.map.openDirections });

      expect(directions).toHaveAttribute("href", content.directionsUrl);
      expect(directions).toHaveAttribute("target", "_blank");
      expect(directions.getAttribute("rel")).toContain("noopener");
      expect(document.querySelector('a[href*="contact-map-heading"]')).toBeNull();
      expect(messages.Footer).not.toHaveProperty("locationLink");
    });

    it("offers no directions when the record has none", () => {
      renderFooter({ ...content, directionsUrl: null });
      expect(screen.queryByRole("link", { name: messages.Contact.map.openDirections })).toBeNull();
    });
  });

  describe("the contact column, read from the contact page's record (ADR-0092 D6, D7)", () => {
    it("gives the email as an actionable link and the office hours as the record states them", () => {
      renderFooter();
      const contact = column(content.headings.contact!)!;

      expect(within(contact as HTMLElement).getByRole("link", { name: content.email! })).toHaveAttribute(
        "href",
        `mailto:${content.email}`,
      );
      expect(contact).toHaveTextContent(content.officeHours!);
    });

    it("does not repeat the address the location column already shows beside it", () => {
      renderFooter();
      expect(column(content.headings.contact!)).not.toHaveTextContent(content.place!);
    });

    it("keeps no contact fact of its own in the message catalogue", () => {
      // The catalogue said "08:00-15:00" while the record said "٨:٠٠ – ١٥:٠٠",
      // and the address constant said Abu Dhabi while the map showed Dubai:
      // two sources for one fact drift apart.
      expect(messages.Footer).not.toHaveProperty("hours");
      expect(messages.Footer).not.toHaveProperty("address");
      expect(messages.Footer).not.toHaveProperty("mapCardCity");
      expect(JSON.stringify(messages.Footer)).not.toContain("@uaeaf.ae");
    });

    it("leaves out a fact it cannot read, rather than showing a remembered one", () => {
      renderFooter(NOTHING);

      expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
      expect(screen.queryByTestId("footer-place")).toBeNull();
      // The help centre is the site's own route, so it is always there.
      expect(screen.getByRole("link", { name: messages.Footer.helpCenter })).toHaveAttribute("href", localePath("/help"));
    });
  });

  describe("the channels, read from the contact page's record (ADR-0092 D8)", () => {
    it("gives every channel a name, a 44px target and a safe new tab", () => {
      renderFooter();
      const list = screen.getByRole("list", { name: messages.Contact.social.title });
      const links = within(list).getAllByRole("link");

      expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([messages.Social.instagram, "Threads"]);
      for (const link of links) {
        expect(classes(link)).toContain("size-11");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link.getAttribute("rel")).toContain("noopener");
      }
    });

    it("draws the icon an editor uploaded, and the platform's own artwork otherwise", () => {
      renderFooter();

      expect(screen.getByRole("link", { name: "Threads" }).querySelector("img")?.getAttribute("src")).toContain("threads.png");
      expect(screen.getByRole("link", { name: messages.Social.instagram }).querySelector("img")?.getAttribute("src")).toContain(
        "instagram.svg",
      );
    });

    it("drops a destination that is not a web address", () => {
      renderFooter();
      expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
    });

    it("draws no row at all when the record has no channels", () => {
      renderFooter({ ...content, channels: [] });
      expect(screen.queryByRole("list", { name: messages.Contact.social.title })).toBeNull();
    });
  });

  describe("the footer's own words, from the site settings", () => {
    it("shows what the editor saved", () => {
      renderFooter();

      expect(screen.getByTestId("footer-brand-description")).toHaveTextContent(content.aboutBlurb!);
      expect(screen.getByText(content.copyright!)).toBeInTheDocument();
      for (const heading of Object.values(content.headings)) {
        expect(screen.getByRole("heading", { level: 2, name: heading! })).toBeInTheDocument();
      }
    });

    it("shows its built-in text for whatever the editor has not saved", () => {
      renderFooter(NOTHING);

      expect(screen.getByTestId("footer-brand-description")).toHaveTextContent(messages.Footer.brandDescription);
      expect(screen.getByText(messages.Footer.copyright)).toBeInTheDocument();
      for (const key of ["quickLinksTitle", "locationTitle", "contactTitle"] as const) {
        expect(screen.getByRole("heading", { level: 2, name: messages.Footer[key] })).toBeInTheDocument();
      }
    });
  });

  describe("the structure", () => {
    it("renders a contentinfo landmark with the four columns in the approved order", () => {
      renderFooter();
      const footer = screen.getByRole("contentinfo");
      const headings = [...footer.querySelectorAll("[data-footer-column] > h2")].map((node) => node.textContent);

      expect(headings).toEqual([
        messages.Footer.brandName,
        content.headings.quickLinks,
        content.headings.location,
        content.headings.contact,
      ]);
    });

    it("renders every approved quick link, translated, inside a labelled navigation landmark", () => {
      renderFooter();
      const nav = screen.getByRole("navigation", { name: messages.Footer.quickLinksNav });
      const links = within(nav).getAllByRole("link");
      expect(links).toHaveLength(FOOTER_QUICK_LINKS.length);
      for (const item of FOOTER_QUICK_LINKS) {
        const label = messages.Nav[item.key as keyof typeof messages.Nav];
        expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", localePath(item.href));
      }
    });

    it("renders the legal strip links, translated, inside their own labelled landmark", () => {
      renderFooter();
      const nav = screen.getByRole("navigation", { name: messages.Footer.legalNav });
      expect(within(nav).getAllByRole("link")).toHaveLength(LEGAL_LINKS.length);
    });

    it("hides purely decorative brand swooshes from assistive tech", () => {
      const { container } = renderFooter();
      const decorations = container.querySelectorAll('[data-decorative="true"]');
      expect(decorations).toHaveLength(4);
      for (const node of decorations) {
        expect(node).toHaveAttribute("aria-hidden", "true");
      }
    });
  });

  describe("the design studio's credit (owner request 2026-09-22)", () => {
    it("credits NOTIME, linked to its site in a new tab", () => {
      renderFooter();
      const studio = screen.getByRole("link", { name: "NOTIME" });

      expect(studio).toHaveAttribute("href", "https://notimehub.com/");
      expect(studio).toHaveAttribute("target", "_blank");
      expect(studio.getAttribute("rel")).toContain("noopener");
      // A brand name is not translated, and is pronounced as English inside
      // the Arabic sentence (Chapter 4 §4.3: family follows language).
      expect(studio).toHaveAttribute("lang", "en");
      expect(studio.closest("p")).toHaveTextContent(messages.Footer.designedBy.replace(/<studio><\/studio>/, "NOTIME"));
    });

    it("is the last thing in the footer, in reading order and in tab order", () => {
      renderFooter();
      const links = within(screen.getByRole("contentinfo")).getAllByRole("link");
      expect(links.at(-1)).toHaveAccessibleName("NOTIME");
    });
  });
});

/**
 * Layout contracts jsdom can check. The rendered geometry — the height at each
 * width, the real column count, nothing overflowing — is measured on a live
 * browser by `e2e/footer.spec.ts`.
 */
describe("SiteFooter layout contracts", () => {
  const renderFooter = () => renderWithIntl(<SiteFooter content={CONTENT.ar} />, "ar");

  it("keeps the Chapter 5 grid: one column, two from md, four from lg, the approved gap from xl", () => {
    renderFooter();
    const row = classes(screen.getByTestId("footer-columns"));

    expect(row).toEqual(expect.arrayContaining(["grid", "grid-cols-1", "md:grid-cols-2", "lg:grid-cols-4", "xl:gap-12"]));
    expect(row).not.toContain("flex-wrap");
    for (const column of screen.getByTestId("footer-columns").querySelectorAll(":scope > [data-footer-column]")) {
      expect(classes(column)).not.toContain("flex-1");
    }
  });

  it("is the screen minus the header from lg, and gives the map what is left over (ADR-0092 D4, D5)", () => {
    renderFooter();

    // The rule itself, lg-only and a minimum, is guarded in surface-standard.spec.ts.
    expect(classes(screen.getByRole("contentinfo"))).toContain("footer-first-screen");
    expect(classes(screen.getByTestId("footer-columns"))).toContain("lg:flex-1");
    expect(classes(screen.getByTestId("footer-map-frame"))).toEqual(expect.arrayContaining(["min-h-[220px]", "lg:flex-1"]));
  });

  it("keeps fixed-width children fluid inside a narrower column", () => {
    renderFooter();
    const description = classes(screen.getByTestId("footer-brand-description"));
    expect(description).toEqual(expect.arrayContaining(["w-full", "max-w-[260px]"]));
    expect(description).not.toContain("w-[260px]");
  });
});
