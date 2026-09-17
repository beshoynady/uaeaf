import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OrganizationCardPublic, SponsorStripSettingsPublic, SponsorshipPublic } from "@/lib/api/types";
import { OrganizationLogo } from "./organization-logo";
import { OrganizationName } from "./organization-name";
import { SponsorBanner } from "./sponsor-banner";
import { SponsorsSection } from "./sponsors-section";
import { OrganizationsSection } from "./organizations-section";
import { SponsorStrip } from "./sponsor-strip";

/**
 * The homepage's sponsor strip, sponsors, partners and memberships (ADR-0085).
 * What is asserted here is structure and semantics: which language a name is
 * declared in, when a logo is announced, what is hidden when nothing
 * qualifies, and that the strip's copy for the loop is out of the reading
 * order. Geometry, contrast and motion are measured in a browser.
 */

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./sponsor-strip-controls", () => ({
  SponsorStripControls: ({ labels }: { labels: { pause: string } }) => <button type="button">{labels.pause}</button>,
}));

vi.mock("@/components/pages/president/reveal-once", () => ({ RevealOnce: () => null }));

const NOW = new Date("2027-03-01T08:00:00.000Z");

const logo = (name: string) => ({ url: `https://res.cloudinary.com/aodzt1lz/image/upload/v1/${name}.png`, altText: { ar: "شعار", en: "logo" }, width: 480, height: 240 });

const sponsorship = (id: string, tier: SponsorshipPublic["tier"], overrides: Partial<SponsorshipPublic> = {}): SponsorshipPublic => ({
  id,
  sponsor: {
    id: `sponsor-${id}`,
    name: { ar: null, en: `Sponsor ${id}` },
    logo: logo(id),
    website: null,
    categoryLabel: null,
  },
  tier,
  targetType: "Federation",
  scopeLabel: null,
  isFeatured: false,
  displayOrder: 0,
  startDate: "2026-08-31T20:00:00.000Z",
  endDate: "2027-08-31T19:59:59.000Z",
  ...overrides,
});

const ups = sponsorship("ups", "Official", {
  sponsor: {
    id: "sponsor-ups",
    name: { ar: null, en: "Ultimate Power Solution" },
    logo: logo("ups"),
    website: "https://upsgenerator.com/",
    categoryLabel: null,
  },
});

const card = (id: string, name: OrganizationCardPublic["name"], withLogo = true): OrganizationCardPublic => ({
  id,
  name,
  logo: withLogo ? logo(id) : null,
  displayOrder: 0,
});

const strip = (overrides: Partial<SponsorStripSettingsPublic> = {}): SponsorStripSettingsPublic => ({
  isVisible: true,
  displayMode: "logoName",
  selection: "allActive",
  sponsorshipIds: [],
  order: "tier",
  pinTopTier: true,
  speed: "medium",
  ...overrides,
});

describe("OrganizationName", () => {
  it("isolates an English-only name on the Arabic page and declares it English", () => {
    const { container } = render(<OrganizationName name={{ ar: null, en: "Ultimate Power Solution" }} locale="ar" />);

    const bdi = container.querySelector("bdi");
    expect(bdi).toHaveTextContent("Ultimate Power Solution");
    expect(bdi).toHaveAttribute("lang", "en");
  });

  it("isolates an Arabic-only name on the English page and declares it Arabic", () => {
    const { container } = render(<OrganizationName name={{ ar: "مؤسسة الرمال", en: null }} locale="en" />);

    expect(container.querySelector("bdi")).toHaveAttribute("lang", "ar");
  });

  it("writes a name in the page's language without isolation", () => {
    const { container } = render(<OrganizationName name={{ ar: "شركة النخبة", en: "Elite Co" }} locale="ar" />);

    expect(container.querySelector("bdi")).toBeNull();
    expect(container).toHaveTextContent("شركة النخبة");
  });
});

describe("OrganizationLogo", () => {
  it("hides the logo from readers when the name is printed beside it", () => {
    const { container } = render(
      <OrganizationLogo logo={logo("a")} name={{ ar: null, en: "Elite Co" }} locale="ar" size="card" decorative />,
    );

    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img.className).toContain("object-contain");
  });

  it("names the organisation in the alt text, in the name's own language, when the logo stands alone", () => {
    const { container } = render(<OrganizationLogo logo={logo("a")} name={{ ar: null, en: "Elite Co" }} locale="ar" size="strip" />);

    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "Elite Co");
    expect(img).toHaveAttribute("lang", "en");
  });

  it("never announces a stored alt like «شعار»: the organisation's name is the text", () => {
    const { container } = render(<OrganizationLogo logo={logo("a")} name={{ ar: "شركة النخبة", en: null }} locale="ar" size="strip" />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "شركة النخبة");
  });

  it("draws the name in the logo's place when there is no logo, never an empty plate", () => {
    const { container } = render(<OrganizationLogo logo={null} name={{ ar: null, en: "Elite Co" }} locale="ar" size="card" decorative />);

    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("Elite Co");
  });
});

describe("SponsorBanner", () => {
  it("names the tier and the sponsor, and links out in a new tab with a readable notice", async () => {
    render(await SponsorBanner({ sponsorship: ups, locale: "ar" }));

    // The tier in the page's language, then in English inside `bdi lang="en"`.
    expect(screen.getByText(/tiers\.Official/)).toBeInTheDocument();
    expect(screen.getByText("tiersEnglish.Official")).toHaveAttribute("lang", "en");
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.querySelector("bdi")).toHaveAttribute("lang", "en");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://upsgenerator.com/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("sponsors.opensInNewTab");
  });

  it("carries no link when the sponsor has no website", async () => {
    render(await SponsorBanner({ sponsorship: sponsorship("x", "Official"), locale: "ar" }));

    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("SponsorsSection", () => {
  it("renders nothing when no sponsorship is running", async () => {
    const ended = sponsorship("old", "Official", { endDate: "2026-12-31T19:59:59.000Z" });
    expect(await SponsorsSection({ sponsorships: [ended], section: null, locale: "ar", now: NOW })).toBeNull();
  });

  it("puts the Official sponsor in the banner when it is the only one, with no grid", async () => {
    const { container } = render((await SponsorsSection({ sponsorships: [ups], section: null, locale: "ar", now: NOW }))!);

    expect(container.querySelector("[data-sponsor-banner]")).toHaveTextContent("Ultimate Power Solution");
    expect(container.querySelector("[data-sponsor-grid]")).toBeNull();
  });

  it("moves the banner to a Strategic sponsor and lists the Official one in the grid", async () => {
    const strategic = sponsorship("strategic", "Strategic");
    const { container } = render(
      (await SponsorsSection({ sponsorships: [ups, strategic], section: null, locale: "ar", now: NOW }))!,
    );

    expect(container.querySelector("[data-sponsor-banner]")).toHaveTextContent("Sponsor strategic");
    const grid = container.querySelector("[data-sponsor-grid]") as HTMLElement;
    expect(within(grid).getByText("Ultimate Power Solution")).toBeInTheDocument();
  });

  it("marks a VIP sponsor in the grid in words, not by colour alone", async () => {
    const vip = sponsorship("vip", "Supporting", { isFeatured: true });
    const { container } = render((await SponsorsSection({ sponsorships: [ups, vip], section: null, locale: "ar", now: NOW }))!);

    const grid = container.querySelector("[data-sponsor-grid]") as HTMLElement;
    expect(within(grid).getByText("sponsors.featured")).toBeInTheDocument();
  });

  it("prints no statistic below one", async () => {
    const { container } = render((await SponsorsSection({ sponsorships: [ups], section: null, locale: "ar", now: NOW }))!);

    expect(container.querySelector('[data-stat="years"]')).toBeNull();
    expect(container.querySelector('[data-stat="championships"]')).toBeNull();
    expect(container.querySelector('[data-stat="sponsors"]')).toHaveTextContent("1");
  });

  it("shows the partnership call to action only when its text and link are both set", async () => {
    const without = render((await SponsorsSection({ sponsorships: [ups], section: null, locale: "ar", now: NOW }))!);
    expect(without.container.querySelector("[data-sponsors-cta]")).toBeNull();
    without.unmount();

    const section = { ctaText: { ar: "كن شريكًا", en: "Become a partner" }, ctaUrl: "/contact", configuration: null };
    const withCta = render((await SponsorsSection({ sponsorships: [ups], section, locale: "ar", now: NOW }))!);
    expect(withCta.container.querySelector("[data-sponsors-cta] a")).toHaveAttribute("href", "/contact");
  });
});

describe("OrganizationsSection", () => {
  it("renders nothing without a visible organisation", async () => {
    expect(await OrganizationsSection({ kind: "partners", items: [], section: null, locale: "ar" })).toBeNull();
  });

  it("lists partners on the green register, in display order, as logo and name", async () => {
    const items = [
      { ...card("b", { ar: null, en: "Beta Demo" }), displayOrder: 2 },
      { ...card("a", { ar: "ألفا التجريبية", en: null }), displayOrder: 1 },
    ];
    const { container } = render((await OrganizationsSection({ kind: "partners", items, section: null, locale: "ar" }))!);

    expect(container.querySelector("section")).toHaveAttribute("data-register", "green");
    const names = [...container.querySelectorAll("li")].map((item) => item.textContent);
    expect(names[0]).toContain("ألفا التجريبية");
    expect(names[1]).toContain("Beta Demo");
    expect(container.querySelector("[data-carousel-dots]")).toBeNull();
  });

  it("lists memberships on the neutral ground with seam lines", async () => {
    const { container } = render(
      (await OrganizationsSection({ kind: "memberships", items: [card("m", { ar: "اتحاد تجريبي", en: null })], section: null, locale: "en" }))!,
    );

    expect(container.querySelector("section")).toHaveAttribute("data-register", "neutral");
    expect(container.querySelector("[data-seam-lines]")).not.toBeNull();
  });
});

describe("SponsorStrip", () => {
  it("renders nothing when hidden or when nothing is running", async () => {
    expect(await SponsorStrip({ sponsorships: [ups], settings: strip({ isVisible: false }), bannerId: "ups", locale: "ar", now: NOW })).toBeNull();
    expect(await SponsorStrip({ sponsorships: [], settings: strip(), bannerId: null, locale: "ar", now: NOW })).toBeNull();
  });

  it("stands one pinned sponsor still at every width, with no copy for a loop and no pause button", async () => {
    const { container } = render((await SponsorStrip({ sponsorships: [ups], settings: strip(), bannerId: "ups", locale: "ar", now: NOW }))!);

    const aside = container.querySelector("aside")!;
    expect(aside).toHaveAttribute("data-row-from", "base");
    expect(aside).toHaveAttribute("aria-label", "strip.label");
    expect(container.querySelector("[data-strip-duplicate]")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the loop's copy out of the reading order, and offers the pause button, when the row can move", async () => {
    const many = Array.from({ length: 12 }, (_, i) => sponsorship(`s${i}`, "Supporting", { displayOrder: i }));
    const { container } = render(
      (await SponsorStrip({ sponsorships: [ups, ...many], settings: strip(), bannerId: "ups", locale: "ar", now: NOW }))!,
    );

    const duplicate = container.querySelector("[data-strip-duplicate]")!;
    expect(duplicate).toHaveAttribute("aria-hidden", "true");
    expect(duplicate).toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "strip.pause" })).toBeInTheDocument();
    expect(container.querySelector("aside")!.getAttribute("style")).toContain("--strip-duration");
  });

  it("announces each logo by name in logo-only mode, and prints no name", async () => {
    const { container } = render(
      (await SponsorStrip({ sponsorships: [ups], settings: strip({ displayMode: "logo", pinTopTier: false }), bannerId: null, locale: "ar", now: NOW }))!,
    );

    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "Ultimate Power Solution");
    expect(img).toHaveAttribute("lang", "en");
  });
});
