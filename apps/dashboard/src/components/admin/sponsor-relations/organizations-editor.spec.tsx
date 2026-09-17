import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render";
import { ToastProvider } from "@/components/ui/toast";
import { fromOrganizationRecords } from "@/lib/admin/sponsor-relations/organizations";
import { OrganizationsEditor } from "./organizations-editor";

/**
 * The partners screen as an editor meets it (ADR-0085): a list in the site's
 * order, a form for the chosen record, a preview drawn with the site's naming
 * rule, and one Save that publishes. What the API would refuse is listed before
 * anything is sent.
 */

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const PARTNER = "6aa0850000000000000000c1";

const initial = fromOrganizationRecords("partners", [
  {
    _id: PARTNER,
    partnerName: { ar: null, en: "Coastline Demo Institute" },
    partnerLogoId: null,
    partnershipType: "MOU",
    startDate: "2025-01-14T20:00:00.000Z",
    endDate: null,
    isActive: true,
    displayOrder: 0,
    isVisible: true,
    isDemo: true,
  },
]);

const fetchMock = vi.fn();

const renderEditor = () =>
  renderWithIntl(
    <ToastProvider>
      <OrganizationsEditor kind="partners" initial={initial} images={[]} canReadMedia={false} />
    </ToastProvider>,
    "en",
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  refresh.mockReset();
});

describe("OrganizationsEditor", () => {
  it("lists the records with their demo mark and opens on the first", () => {
    renderEditor();

    const list = screen.getByRole("list", { name: /partners/i });
    expect(within(list).getByText("Coastline Demo Institute")).toBeInTheDocument();
    expect(within(list).getByText(/demo data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name in english/i)).toHaveValue("Coastline Demo Institute");
  });

  it("previews visible records with the site's naming rule", () => {
    renderEditor();
    const preview = screen.getByRole("region", { name: /preview/i });
    expect(within(preview).getByText("Coastline Demo Institute").closest("bdi")).toBeNull();
  });

  it("lists what the API would refuse and sends nothing", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: /add partner/i }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    const summary = await screen.findByRole("region", { name: /could not be saved/i });
    expect(within(summary).getByText(/name/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a change as one write and says so", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ _id: PARTNER }), { status: 200 }));
    renderEditor();

    await user.click(screen.getByRole("switch", { name: /shown on the site/i }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/admin/partnerships/${PARTNER}`);
    expect(JSON.parse(String(init.body))).toEqual({ isVisible: false });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("removes a record only once the question is confirmed, and saves the removal as a delete", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    renderEditor();

    await user.click(screen.getByRole("button", { name: /^remove$/i }));
    const dialog = await screen.findByRole("dialog", { name: /remove: coastline demo institute/i });
    await user.click(within(dialog).getByRole("button", { name: /^remove$/i }));

    expect(within(screen.getByRole("list", { name: /partners/i })).queryByText("Coastline Demo Institute")).toBeNull();
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect([init.method, url]).toEqual(["DELETE", `/api/admin/partnerships/${PARTNER}`]);
  });

  it("gives a membership its status instead of the partners' agreement switch", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ _id: PARTNER }), { status: 200 }));
    const memberships = fromOrganizationRecords("memberships", [
      {
        _id: PARTNER,
        organizationName: { ar: "اتحاد تجريبي", en: null },
        organizationLogoId: null,
        membershipType: "RegionalBody",
        startDate: "2025-01-14T20:00:00.000Z",
        endDate: null,
        status: "Active",
        displayOrder: 0,
        isVisible: true,
        isDemo: true,
      },
    ]);
    renderWithIntl(
      <ToastProvider>
        <OrganizationsEditor kind="memberships" initial={memberships} images={[]} canReadMedia={false} />
      </ToastProvider>,
      "en",
    );

    expect(screen.queryByRole("switch", { name: /agreement in force/i })).toBeNull();
    // An Arabic-only name on the English screen keeps its language (ADR-0085 D4).
    const preview = screen.getByRole("region", { name: /preview/i });
    expect(within(preview).getByText("اتحاد تجريبي").closest("bdi")).toHaveAttribute("lang", "ar");

    await user.selectOptions(screen.getByLabelText(/membership status/i), "Suspended");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/admin/memberships/${PARTNER}`);
    expect(JSON.parse(String(init.body))).toEqual({ status: "Suspended" });
  });
});
