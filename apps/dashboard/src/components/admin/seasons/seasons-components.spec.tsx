import type { ReactNode } from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render";
import type { AdminSeason, SeasonContent } from "@/lib/admin/seasons/types";
import type { SeasonEditorPermissions } from "@/lib/admin/seasons/editor-screen";

/**
 * The season screens, rendered with the real English catalogue so a missing
 * key fails here rather than on an editor's screen.
 *
 * `fetch` is the route handlers' door and is stubbed: what is under test is
 * which request each press sends — and, as much, which presses send nothing —
 * and that every refusal the API gives reaches the screen as a sentence.
 */
const push = vi.fn();
const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  Link: ({ children, href, ...rest }: { children: ReactNode; href: unknown }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const toastShow = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ show: toastShow, dismiss: vi.fn() }) }));

const { SeasonsBoard } = await import("./seasons-board");
const { SeasonForm } = await import("./season-form");

const fetchMock = vi.fn();

const answer = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => answer(200, { _id: "x" }));
  vi.stubGlobal("fetch", fetchMock);
  push.mockReset();
  toastShow.mockReset();
});

const season = (overrides: Partial<AdminSeason> = {}): AdminSeason => ({
  id: "66f0a1b2c3d4e5f607182901",
  name: { ar: "موسم 2026–2027", en: "Season 2026–2027" },
  shortName: "26/27",
  slug: "2026-2027",
  tagline: null,
  logoId: null,
  bannerId: null,
  shareImageId: null,
  about: { ar: "نبذة", en: "About" },
  closingSummary: null,
  // 1 September 2026 – 31 August 2027, Dubai days.
  startDate: "2026-08-31T20:00:00.000Z",
  endDate: "2027-08-30T20:00:00.000Z",
  phases: [],
  keyDates: [],
  calendarDocumentId: null,
  documentIds: [],
  isCurrent: false,
  publicationState: "Draft",
  publishedAt: null,
  isVisible: false,
  seo: { metaTitle: null, metaDescription: null, ogImageId: null },
  updatedAt: "2026-09-29T10:00:00.000Z",
  ...overrides,
});

const CURRENT = season({
  id: "66f0a1b2c3d4e5f607182902",
  name: { ar: "موسم 2025–2026", en: "Season 2025–2026" },
  shortName: "25/26",
  slug: "2025-2026",
  startDate: "2025-08-31T20:00:00.000Z",
  endDate: "2026-08-30T20:00:00.000Z",
  isCurrent: true,
  publicationState: "Published",
  isVisible: true,
});
const NEXT = season();

const renderBoard = (content: Map<string, SeasonContent> = new Map()) =>
  renderWithIntl(
    <SeasonsBoard
      seasons={[CURRENT, NEXT]}
      content={content}
      canCreate
      canUpdate
      canDelete
      locale="en"
      now="2026-03-01T00:00:00.000Z"
    />,
    "en",
  );

/** The phone-width card list holds the same rows as the table; its items are
 *  the rows to read in jsdom, which draws both. */
const rowOf = (name: string) => {
  const list = screen.getByRole("list", { name: "Seasons" });
  const item = within(list)
    .getAllByRole("listitem")
    .find((entry) => entry.textContent?.includes(name));
  if (!item) throw new Error(`no row for ${name}`);
  return within(item);
};

describe("the seasons list (dash-01)", () => {
  it("badges the current season and offers 'make current' only on the others", () => {
    renderBoard();
    const current = rowOf("Season 2025–2026");
    expect(current.getByText("Current season")).toBeInTheDocument();
    expect(current.queryByRole("button", { name: "Make current season" })).toBeNull();
    expect(rowOf("Season 2026–2027").getByRole("button", { name: "Make current season" })).toBeInTheDocument();
  });

  it("asks before making a season current, and sends nothing until confirmed", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(rowOf("Season 2026–2027").getByRole("button", { name: "Make current season" }));

    expect(screen.getByRole("alert")).toHaveTextContent("will become the current season");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Yes, make it current" }));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/seasons/${NEXT.id}/set-current`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("sends nothing when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(rowOf("Season 2026–2027").getByRole("button", { name: "Make current season" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("locks the delete of a season that still holds content", () => {
    renderBoard(new Map([[NEXT.id, { albums: 2, videos: 0 }]]));
    expect(rowOf("Season 2026–2027").getByRole("button", { name: "Delete Season 2026–2027" })).toBeDisabled();
  });

  it("puts the API's refusal of a delete on screen as the season's own sentence", async () => {
    fetchMock.mockImplementation(() => answer(409, { code: "seasonHasContent" }));
    const user = userEvent.setup();
    renderBoard();
    await user.click(rowOf("Season 2026–2027").getByRole("button", { name: "Delete Season 2026–2027" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    await waitFor(() =>
      expect(screen.getByText(/albums or videos still fall inside its dates/)).toBeInTheDocument(),
    );
    expect(toastShow).not.toHaveBeenCalled();
  });
});

const PERMISSIONS: SeasonEditorPermissions = {
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  canPublish: true,
  canReadMedia: true,
  canReadDocuments: true,
};

const renderForm = (
  overrides: Partial<{
    record: AdminSeason | null;
    publishMode: "direct" | "approval" | "unknown";
    permissions: SeasonEditorPermissions;
  }> = {},
) =>
  renderWithIntl(
    <SeasonForm
      record={overrides.record === undefined ? NEXT : overrides.record}
      images={[]}
      documents={[
        { id: "66f0a1b2c3d4e5f607182911", label: { ar: "روزنامة.pdf", en: "calendar.pdf" } },
        { id: "66f0a1b2c3d4e5f607182912", label: { ar: "لائحة.pdf", en: "rules.pdf" } },
      ]}
      sponsors={[]}
      permissions={overrides.permissions ?? PERMISSIONS}
      publishMode={overrides.publishMode ?? "direct"}
      locale="en"
      now="2026-10-01T00:00:00.000Z"
    />,
    "en",
  );

/** Adds one phase and fills it; dates go through `change`, which is how a
 *  date input reports a picked day. */
const addPhase = async (
  user: ReturnType<typeof userEvent.setup>,
  from: string,
  to: string,
  { position = 1, type = "preparation" }: { position?: number; type?: string } = {},
) => {
  await user.click(screen.getByRole("button", { name: "Add phase" }));
  const phase = within(screen.getByRole("group", { name: `Phase ${position}` }));
  fireEvent.change(phase.getByLabelText(/Phase name in Arabic/), { target: { value: "الإعداد" } });
  fireEvent.change(phase.getByLabelText(/Phase name in English/), { target: { value: "Preparation" } });
  await user.selectOptions(phase.getByLabelText(/Type/), type);
  fireEvent.change(phase.getByLabelText(/^From/), { target: { value: from } });
  fireEvent.change(phase.getByLabelText(/^To/), { target: { value: to } });
};

describe("the season form — phases (section 3)", () => {
  it("blocks the save of a phase that ends before it starts, and says so on the row", async () => {
    const user = userEvent.setup();
    renderForm();
    await addPhase(user, "2026-12-01", "2026-11-01");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(screen.getByRole("group", { name: "Phase 1" })).getByRole("alert")).toHaveTextContent(
      "The phase ends before it starts.",
    );
  });

  it("blocks the save of a phase entirely outside the season", async () => {
    const user = userEvent.setup();
    renderForm();
    await addPhase(user, "2028-01-01", "2028-02-01");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(screen.getByRole("group", { name: "Phase 1" })).getByRole("alert")).toHaveTextContent(
      "The phase runs outside the season's dates.",
    );
  });

  it("saves a phase inside the season, as Dubai-midnight instants", async () => {
    const user = userEvent.setup();
    renderForm();
    await addPhase(user, "2026-09-01", "2026-11-30");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe(`/api/admin/seasons/${NEXT.id}`);
    const body = JSON.parse(String(init.body)) as { phases: { from: string; to: string; type: string }[] };
    expect(body.phases).toEqual([
      expect.objectContaining({ type: "preparation", from: "2026-08-31T20:00:00.000Z", to: "2026-11-29T20:00:00.000Z" }),
    ]);
  });

  it("puts the API's overlap refusal on screen", async () => {
    fetchMock.mockImplementation(() => answer(409, { code: "seasonOverlap" }));
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Short name/), "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByText(/overlap another season/)).toBeInTheDocument());
  });
});

describe("the season form — phase rules and treatments", () => {
  it("blocks two phases of the same type that share a day", async () => {
    const user = userEvent.setup();
    renderForm();
    await addPhase(user, "2026-09-01", "2026-11-30");
    await addPhase(user, "2026-11-30", "2027-01-31", { position: 2 });
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(within(screen.getByRole("group", { name: "Phase 2" })).getByRole("alert")).toHaveTextContent(
      "This phase overlaps an earlier phase of the same type.",
    );
  });

  it("saves phases of different types that run together", async () => {
    const user = userEvent.setup();
    renderForm();
    await addPhase(user, "2026-09-01", "2026-11-30");
    await addPhase(user, "2026-10-01", "2026-10-31", { position: 2, type: "domestic" });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("accepts a phase that ends on the season's last day", async () => {
    const user = userEvent.setup();
    renderForm();
    await addPhase(user, "2027-07-01", "2027-08-31", { type: "rest" });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("names each phase's type beside its colour, in the row and on the strip", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();
    await addPhase(user, "2026-12-01", "2027-02-28", { type: "international" });
    const chip = screen.getByRole("group", { name: "Phase 1" }).querySelector("[data-phase-type]");
    expect(chip).toHaveAttribute("data-phase-type", "international");
    expect(chip).toHaveTextContent("International");
    const bar = container.querySelector('[data-phase-strip] [data-phase-type="international"]');
    expect(bar).toHaveTextContent("International");
  });

  it("puts the API's phase-overlap refusal on screen as a sentence, not a code", async () => {
    fetchMock.mockImplementation(() => answer(409, { code: "seasonPhaseOverlap" }));
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Short name/), "x");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByText(/two phases of the same type share at least one day/)).toBeInTheDocument());
    expect(screen.queryByText("seasonPhaseOverlap")).toBeNull();
  });
});

describe("the season form — documents and search (sections 6–7)", () => {
  it("offers the library's documents for the calendar and the set, and saves the choice", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.selectOptions(screen.getByLabelText(/Official season calendar/), "66f0a1b2c3d4e5f607182911");
    await user.click(screen.getByRole("checkbox", { name: "rules.pdf" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as Record<string, unknown>;
    expect(body.calendarDocumentId).toBe("66f0a1b2c3d4e5f607182911");
    expect(body.documentIds).toEqual(["66f0a1b2c3d4e5f607182912"]);
  });

  it("draws the shared SEO fields with their preview, without a second share-image picker", () => {
    renderForm();
    expect(screen.getByText(/Search result preview/)).toBeInTheDocument();
    expect(screen.queryByText("Share image")).toBeNull();
    expect(screen.getByText("Social sharing image (optional)")).toBeInTheDocument();
  });
});

describe("the season form — publishing", () => {
  it("offers 'publish' under a direct policy and sends the version the editor opened", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/seasons/${NEXT.id}/publish`,
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ expectedUpdatedAt: NEXT.updatedAt }) }),
    );
  });

  it("refuses to publish over unsaved changes, checked at the press", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/Short name/), "x");
    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Save your changes first/)).toBeInTheDocument();
  });

  it("offers 'send for approval' instead of 'publish' when the policy requires review, and submits with no body", async () => {
    const user = userEvent.setup();
    renderForm({ publishMode: "approval" });
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Send for approval" }));
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/seasons/${NEXT.id}/submit`, { method: "POST" });
    await waitFor(() => expect(toastShow).toHaveBeenCalledWith(expect.objectContaining({ title: "Season sent for approval" })));
  });

  it("refuses to send unsaved changes for approval, checked at the press", async () => {
    const user = userEvent.setup();
    renderForm({ publishMode: "approval" });
    await user.type(screen.getByLabelText(/Short name/), "x");
    await user.click(screen.getByRole("button", { name: "Send for approval" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Save your changes first/)).toBeInTheDocument();
  });

  it("offers the submit to an editor without the publish grant — submitting is an author's act", () => {
    renderForm({ publishMode: "approval", permissions: { ...PERMISSIONS, canPublish: false } });
    expect(screen.getByRole("button", { name: "Send for approval" })).toBeEnabled();
  });

  it("puts a review already in progress on screen by name", async () => {
    fetchMock.mockImplementation(() => answer(409, { code: "seasonReviewInProgress" }));
    const user = userEvent.setup();
    renderForm({ publishMode: "approval" });
    await user.click(screen.getByRole("button", { name: "Send for approval" }));
    await waitFor(() => expect(screen.getByText(/a review of it is already in progress/)).toBeInTheDocument());
    expect(toastShow).not.toHaveBeenCalled();
  });

  it("names the missing banner when a submit is refused for it", async () => {
    fetchMock.mockImplementation(() => answer(409, { code: "seasonBannerMissing" }));
    const user = userEvent.setup();
    renderForm({ publishMode: "approval" });
    await user.click(screen.getByRole("button", { name: "Send for approval" }));
    await waitFor(() => expect(screen.getByText(/add its banner in the Visuals section/)).toBeInTheDocument());
  });

  it("puts the API's review refusal on screen when the policy could not be read", async () => {
    fetchMock.mockImplementation(() => answer(409, { code: "seasonNeedsReview" }));
    const user = userEvent.setup();
    renderForm({ publishMode: "unknown" });
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByText(/The season was not published/)).toBeInTheDocument());
  });
});
