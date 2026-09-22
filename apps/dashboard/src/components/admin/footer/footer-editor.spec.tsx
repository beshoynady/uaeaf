import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { EMPTY_FOOTER_DRAFT, type FooterDraft, type FooterSourced } from "@/lib/admin/footer-settings";
import { FooterEditor } from "./footer-editor";
import enMessages from "../../../../messages/en.json";

/**
 * The footer screen (ADR-0092 D12): one panel per footer column, in the
 * footer's own order, then its bottom strip — so an editor finds each thing
 * where it appears on the site. The footer's own words are edited here; what
 * the contact page's record supplies is shown in its column and edited there.
 */

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
// The locale prefix is next-intl's; under test is where the link points.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const t = enMessages.FooterSettings;

const SOURCED: FooterSourced = {
  channels: [
    { platform: "Instagram", url: "https://www.instagram.com/uaeaf", hasIcon: true },
    { platform: "X", url: "https://x.com/uaeaf", hasIcon: false },
  ],
  place: { ar: "١ شارع النهدة، النهدة الأولى", en: "1 Al Nahda Street, Al Nahda 1" },
  region: { ar: "دبي، الإمارات العربية المتحدة", en: "Dubai, United Arab Emirates" },
  coordinates: { latitude: 25.286069, longitude: 55.3642228 },
  directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=25.286069,55.3642228",
  email: "info@uaeaf.ae",
  officeHours: { ar: "الأحد – الخميس", en: "Sunday – Thursday" },
};

const fetchMock = vi.fn();

const renderEditor = (initial: FooterDraft = EMPTY_FOOTER_DRAFT, sourced: FooterSourced = SOURCED) =>
  renderWithIntl(
    <ToastProvider>
      <FooterEditor initial={initial} sourced={sourced} />
    </ToastProvider>,
    "en",
  );

const panel = (name: string) => screen.getByRole("region", { name: new RegExp(name) });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  refresh.mockReset();
});

describe("FooterEditor", () => {
  it("lays out one panel per footer column, in the footer's order, then the bottom strip", () => {
    renderEditor();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual([t.columns.brand, t.columns.quickLinks, t.columns.location, t.columns.contact, t.columns.strip]);
    expect(within(panel(t.columns.location)).getByText(t.columnOf.replace("{n}", "3").replace("{total}", "4"))).toBeInTheDocument();
  });

  it("writes a column's place in one numeral system in Arabic", () => {
    renderWithIntl(
      <ToastProvider>
        <FooterEditor initial={EMPTY_FOOTER_DRAFT} sourced={SOURCED} />
      </ToastProvider>,
      "ar",
    );
    const position = screen.getByText(/^العمود .*2/).textContent ?? "";
    // Either all Western or all Arabic-Indic, never "2 من ٤".
    expect(/[0-9]/.test(position) && /[٠-٩]/.test(position), position).toBe(false);
  });

  it("saves the footer whole when a heading is changed", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const user = userEvent.setup();
    renderEditor();

    const location = panel(t.columns.location);
    await user.type(within(location).getByLabelText(`${t.fields.heading} — in Arabic`), "أين نحن");
    await user.type(within(location).getByLabelText(`${t.fields.heading} — in English`), "Where we are");
    await user.click(screen.getByRole("button", { name: enMessages.SponsorRelations.save }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/site-settings/footer");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({
      footerAboutBlurb: null,
      copyrightText: null,
      footerHeadings: { quickLinks: null, location: { ar: "أين نحن", en: "Where we are" }, contact: null },
    });
  });

  it("refuses a text written in one language only, and says where", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(within(panel(t.columns.strip)).getByLabelText(`${t.fields.copyright} — in English`), "© UAEAF");
    await user.click(screen.getByRole("button", { name: enMessages.SponsorRelations.save }));

    expect(fetchMock).not.toHaveBeenCalled();
    const summary = await screen.findByRole("region", { name: enMessages.SponsorRelations.summaryTitle });
    expect(summary).toHaveTextContent(t.fields.copyright);
    expect(summary).toHaveTextContent(enMessages.SponsorRelations.errors.bothLanguages);
  });

  it("shows what the contact page's record supplies, in its column, to be edited there", () => {
    renderEditor();

    const brand = panel(t.columns.brand);
    expect(within(brand).getByText("https://www.instagram.com/uaeaf")).toBeInTheDocument();
    expect(within(brand).getByText(t.channelIcon)).toBeInTheDocument();

    const location = panel(t.columns.location);
    expect(location).toHaveTextContent(SOURCED.place!.en);
    expect(location).toHaveTextContent("25.286069");

    const contact = panel(t.columns.contact);
    expect(contact).toHaveTextContent("info@uaeaf.ae");
    expect(contact).toHaveTextContent(SOURCED.officeHours!.en);
    // Read here, never written here: no field carries the email.
    expect(within(contact).queryByDisplayValue("info@uaeaf.ae")).toBeNull();

    for (const name of [t.columns.brand, t.columns.location, t.columns.contact]) {
      expect(within(panel(name)).getByRole("link", { name: t.editInContact })).toHaveAttribute("href", "/pages");
    }
  });

  it("says what the site will do when the contact page supplies nothing", () => {
    renderEditor(EMPTY_FOOTER_DRAFT, {
      channels: [],
      place: null,
      region: null,
      coordinates: null,
      directionsUrl: null,
      email: null,
      officeHours: null,
    });

    expect(panel(t.columns.brand)).toHaveTextContent(t.noChannels);
    expect(panel(t.columns.location)).toHaveTextContent(t.noCoordinates);
  });

  it("says the quick links follow the site's navigation and are not edited here", () => {
    renderEditor();
    expect(panel(t.columns.quickLinks)).toHaveTextContent(t.quickLinksNote);
    expect(within(panel(t.columns.quickLinks)).getAllByRole("textbox")).toHaveLength(2);
  });
});
