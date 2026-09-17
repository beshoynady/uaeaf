import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { fromSponsorRecords, type SponsorRecord, type SponsorshipRecord } from "@/lib/admin/sponsor-relations/sponsors";
import { SponsorsEditor } from "./sponsors-editor";

/**
 * The sponsors screen (ADR-0085): each sponsor with its sponsorships, the
 * section's banner preference and call to action, and a preview drawn with the
 * site's own banner rule.
 */

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const UPS = "6aa0850000000000000000b1";
const BANK = "6aa0850000000000000000b2";
const UPS_SHIP = "6aa0850000000000000000d1";
const BANK_SHIP = "6aa0850000000000000000d2";
const SECTION = "6aa0850000000000000000e1";

const sponsor = (id: string, en: string, isDemo: boolean): SponsorRecord => ({
  _id: id,
  name: { ar: null, en },
  logoId: "6aa0850000000000000000f1",
  website: null,
  categoryLabel: null,
  isDemo,
});

const ship = (id: string, sponsorId: string, tier: string, displayOrder: number, isDemo: boolean): SponsorshipRecord => ({
  _id: id,
  sponsorId,
  targetType: "Federation",
  targetId: null,
  tier,
  startDate: "2026-08-31T20:00:00.000Z",
  endDate: "2027-08-31T19:59:59.999Z",
  status: "Active",
  scopeLabel: null,
  isFeatured: false,
  displayOrder,
  isVisible: true,
  isDemo,
});

const initial = fromSponsorRecords(
  [sponsor(UPS, "Ultimate Power Solution", false), sponsor(BANK, "Palmstone Demo Bank", true)],
  [ship(UPS_SHIP, UPS, "Official", 0, false), ship(BANK_SHIP, BANK, "Supporting", 1, true)],
  { _id: SECTION, configuration: { bannerSponsorshipId: null }, ctaText: null, ctaUrl: null },
);

const fetchMock = vi.fn();

const renderEditor = () =>
  renderWithIntl(
    <ToastProvider>
      <SponsorsEditor initial={initial} images={[]} canReadMedia={false} now="2027-03-01T08:00:00.000Z" />
    </ToastProvider>,
    "en",
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  refresh.mockReset();
});

describe("SponsorsEditor", () => {
  it("lists sponsors with the demo mark on the fictional one, and opens the first with its sponsorship's state", () => {
    renderEditor();

    const list = screen.getByRole("list", { name: /^sponsors$/i });
    expect(within(list).getByText("Ultimate Power Solution")).toBeInTheDocument();
    expect(within(list).getAllByText(/demo data/i)).toHaveLength(1);
    expect(screen.getByLabelText(/name in english/i)).toHaveValue("Ultimate Power Solution");
    expect(screen.getByRole("group", { name: /sponsorship 1 · running now/i })).toBeInTheDocument();
  });

  it("previews the banner with the site's rule: the Official sponsor alone, then a Strategic one takes it", async () => {
    const user = userEvent.setup();
    renderEditor();

    const banner = () => within(screen.getByRole("region", { name: /^preview$/i })).getByRole("region", { name: /banner/i });
    expect(within(banner()).getByText("Ultimate Power Solution")).toBeInTheDocument();

    await user.click(within(screen.getByRole("list", { name: /^sponsors$/i })).getByRole("button", { name: /^palmstone demo bank/i }));
    await user.selectOptions(screen.getByLabelText(/^tier$/i), "Strategic");

    await waitFor(() => expect(within(banner()).getByText("Palmstone Demo Bank")).toBeInTheDocument());
  });

  it("lists what the API would refuse on a new sponsor and sends nothing", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: /^add sponsor$/i }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    const summary = await screen.findByRole("region", { name: /could not be saved/i });
    expect(within(summary).getByText(/logo/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a hidden sponsorship as one write", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ _id: UPS_SHIP }), { status: 200 }));
    renderEditor();

    await user.click(screen.getByRole("switch", { name: /shown on the site/i }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/admin/sponsorships/${UPS_SHIP}`);
    expect(JSON.parse(String(init.body))).toEqual({ isVisible: false });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("offers only a sponsorship already stored as the banner preference, and saves the section", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ _id: SECTION }), { status: 200 }));
    renderEditor();

    await user.selectOptions(screen.getByLabelText(/banner preference/i), UPS_SHIP);
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/admin/sponsors-section/${SECTION}`);
    expect(JSON.parse(String(init.body))).toEqual({ configuration: { bannerSponsorshipId: UPS_SHIP }, ctaText: null, ctaUrl: null });
  });
});
