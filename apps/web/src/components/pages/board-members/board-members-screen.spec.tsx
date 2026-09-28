import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The board page lists the people holding board posts.
 *
 * It used to read `GET /federation-personnel/public`, which returns EVERY person
 * whose `status` is `Active` with no filter on holding a post at all — so any
 * staff member, committee member or executive appeared on `/about/board-members`
 * as a member of the board, was counted in the announced figure, and had their
 * recorded address printed as a live `mailto:` link. That is a defect in what the
 * site publishes about real people, not a display bug
 * (`docs/reviews/accounts-profiles-review.md` P0-1).
 *
 * The correct source already existed, filtered and tested: `currentLeadership`
 * keeps only `President` and `BoardMember`, only while `Active`, only while the
 * term has not run out — and returns five fields, contact not among them.
 */

const { fetchPublic, fetchPublicMedia, loadStaticPage } = vi.hoisted(() => ({
  fetchPublic: vi.fn(),
  fetchPublicMedia: vi.fn(),
  loadStaticPage: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async ({ namespace }: { namespace?: string }) => (key: string) =>
    `${namespace ?? ""}.${key}`,
}));

vi.mock("@/lib/api/public-client", () => ({ fetchPublic }));
vi.mock("@/lib/api/media", () => ({
  fetchPublicMedia,
  altOf: () => "alt",
  isExternalMedia: () => false,
}));

vi.mock("@/components/pages/static-page-screen", () => ({
  loadStaticPage,
  breadcrumbTrail: () => [],
  isInstitutional: () => true,
  text: (value: { ar: string; en: string } | null, locale: "ar" | "en") => value?.[locale] ?? "",
}));

vi.mock("@/components/ui/hero-photo", () => ({ heroPhotoSlot: () => null }));
vi.mock("@/components/ui/visible-trail", () => ({ visibleTrail: () => undefined }));
vi.mock("@/lib/seo/json-ld", () => ({
  AboutPageJsonLd: () => null,
  BreadcrumbJsonLd: () => null,
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const { BoardMembersScreen } = await import("./board-members-screen");

/** One serving officer, in the shape `GET /federation-appointments/public`
 *  returns — five fields, and no contact details at all. */
const officer = (en: string, title: string, order = 1) => ({
  fullName: { en, ar: en },
  positionTitle: { en: title, ar: title },
  roleType: "BoardMember",
  displayOrder: order,
  photoId: null,
});

describe("BoardMembersScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadStaticPage.mockResolvedValue({
      page: { route: "/about/board-members" },
      title: "مجلس الإدارة",
      subtitle: null,
      heroImage: null,
    });
    fetchPublicMedia.mockResolvedValue(new Map());
  });

  const renderScreen = async (locale: "ar" | "en" = "ar") =>
    render(await BoardMembersScreen({ locale }));

  it("reads the appointments endpoint, not the personnel listing", async () => {
    fetchPublic.mockResolvedValue([officer("Ali", "الرئيس")]);

    await renderScreen();

    expect(fetchPublic).toHaveBeenCalledWith("/federation-appointments/public");
    expect(fetchPublic).not.toHaveBeenCalledWith("/federation-personnel/public");
  });

  it("prints each officer's post beside their name", async () => {
    fetchPublic.mockResolvedValue([officer("Ali", "نائب الرئيس")]);

    const { container } = await renderScreen();

    expect(container.textContent).toContain("Ali");
    expect(container.textContent).toContain("نائب الرئيس");
  });

  it("announces the number of serving post-holders", async () => {
    fetchPublic.mockResolvedValue([officer("A", "t", 1), officer("B", "t", 2), officer("C", "t", 3)]);

    const { container } = await renderScreen();

    expect(container.textContent).toContain("3");
  });

  it("orders the cards the way the board set", async () => {
    fetchPublic.mockResolvedValue([officer("Second", "t", 2), officer("First", "t", 1)]);

    const { container } = await renderScreen();
    const names = [...container.querySelectorAll("h3")].map((node) => node.textContent);

    expect(names).toEqual(["First", "Second"]);
  });

  // Review Focus 5. A board with nobody serving shows the page's empty state
  // rather than announcing that it has zero members.
  it("shows the empty state when nobody is serving", async () => {
    fetchPublic.mockResolvedValue([]);

    const { container } = await renderScreen();

    expect(container.textContent).not.toContain("Sections.boardMembers");
    expect(container.textContent).toContain("Preparing.status");
  });

  it("survives an endpoint that answers with something that is not a list", async () => {
    fetchPublic.mockResolvedValue(null);

    const { container } = await renderScreen();

    expect(container.textContent).toContain("Preparing.status");
  });

  // The endpoint carries no contact details, so there is nothing to print. The
  // assertion stays as the guard against a future change reintroducing one
  // without ADR-0117's per-record visibility switch.
  it("prints no mailto link", async () => {
    fetchPublic.mockResolvedValue([officer("Ali", "الرئيس")]);

    const { container } = await renderScreen();

    expect(container.innerHTML).not.toContain("mailto:");
  });
});
