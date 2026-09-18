import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import type { SponsorRecord, SponsorshipRecord } from "@/lib/admin/sponsor-relations/sponsors";
import { fromStripRecord } from "@/lib/admin/sponsor-relations/strip-settings";
import { StripEditor } from "./strip-editor";

/**
 * The sponsor strip's settings screen (ADR-0077 D5, ADR-0085 D7): one set of
 * settings for the whole strip, and a preview that answers with the site's own
 * rules which sponsor is pinned and from which width the row stands still.
 */

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const sponsor = (id: string, en: string): SponsorRecord => ({ _id: id, name: { ar: null, en }, logoId: null, website: null, categoryLabel: null });
const ship = (id: string, sponsorId: string, tier: string, displayOrder: number): SponsorshipRecord => ({
  _id: id,
  sponsorId,
  targetType: "Federation",
  targetId: null,
  tier,
  startDate: "2026-08-31T20:00:00.000Z",
  endDate: null,
  status: "Active",
  scopeLabel: null,
  isFeatured: false,
  displayOrder,
  isVisible: true,
});

const SPONSORS = [sponsor("6aa0850000000000000000b1", "Ultimate Power Solution"), sponsor("6aa0850000000000000000b2", "Palmstone Demo Bank"), sponsor("6aa0850000000000000000b3", "Wahat Demo")];
const SPONSORSHIPS = [
  ship("6aa0850000000000000000d1", "6aa0850000000000000000b1", "Official", 0),
  ship("6aa0850000000000000000d2", "6aa0850000000000000000b2", "Official", 1),
  ship("6aa0850000000000000000d3", "6aa0850000000000000000b3", "Supporting", 2),
];

const fetchMock = vi.fn();

const renderEditor = (bannerSponsorshipId: string | null = null) =>
  renderWithIntl(
    <ToastProvider>
      <StripEditor initial={fromStripRecord(null)} sponsors={SPONSORS} sponsorships={SPONSORSHIPS} bannerSponsorshipId={bannerSponsorshipId} now="2027-03-01T08:00:00.000Z" />
    </ToastProvider>,
    "en",
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  refresh.mockReset();
});

describe("StripEditor", () => {
  it("previews every sponsorship travelling when none is held, and the one motion the strip now has", () => {
    renderEditor();

    const preview = screen.getByRole("region", { name: /^preview$/i });
    const items = within(within(preview).getByRole("list")).getAllByRole("listitem");
    // ADR-0086 D2: nothing is held until the editor chooses, so nothing in
    // the preview is marked as held either.
    expect(items.map((item) => item.textContent)).toEqual(["Ultimate Power Solution", "Palmstone Demo Bank", "Wahat Demo"]);
    // ADR-0085 D9.1 removed the still state, so there is no breakpoint left to
    // name here. The editor stating one it no longer has would be a preview
    // that lies about the page.
    expect(within(preview).getByText(/moves at every width/i)).toBeInTheDocument();
    expect(within(preview).queryByText(/stands still/i)).toBeNull();
  });

  it("warns, without blocking, when the held sponsor is not the one the section banners", async () => {
    // ADR-0086 D2: the agreement is the editor's now, so a disagreement must
    // be visible. It is a note, not a refusal — holding a different sponsor
    // on purpose is allowed.
    const user = userEvent.setup();
    // With a banner in play: nothing to disagree with when there is none.
    renderEditor(SPONSORSHIPS[0]._id);

    const picker = screen.getByLabelText(/held sponsor|الراعي المثبّت/i) as HTMLSelectElement;
    // The last choice in this select is never the banner's, which the harness
    // makes the first sponsorship.
    const options = within(picker).getAllByRole("option") as HTMLOptionElement[];
    await user.selectOptions(picker, options[options.length - 1].value);

    const note = await screen.findByRole("note");
    expect(note.textContent).toMatch(/banners|البانر/i);
    expect(screen.getByRole("button", { name: /save|حفظ/i })).toBeEnabled();
  });

  it("says a phone shows logo and name when the scope mode is chosen", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.queryByText(/on a phone this shows logo and name/i)).toBeNull();
    await user.selectOptions(screen.getByLabelText(/what each sponsor shows/i), "logoNameScope");
    expect(screen.getByText(/on a phone this shows logo and name/i)).toBeInTheDocument();
  });

  it("refuses a manual selection with nothing chosen, and sends nothing", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(screen.getByLabelText(/who appears/i), "manual");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    const summary = await screen.findByRole("region", { name: /could not be saved/i });
    expect(within(summary).getByText(/sponsors in the strip/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("writes the settings whole in one request", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ sponsorStrip: {} }), { status: 200 }));
    renderEditor();

    await user.selectOptions(screen.getByLabelText(/^speed$/i), "slow");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/site-settings/sponsor-strip");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ ...fromStripRecord(null), speed: "slow" });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
