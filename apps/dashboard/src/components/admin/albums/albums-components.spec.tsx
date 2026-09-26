import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhotoGrid } from "./photo-grid";
import { InlineConfirm } from "./inline-confirm";
import { AlbumPublishingSection } from "./album-publishing-section";
import { AlbumAffiliationSection } from "./album-affiliation-section";
import { UploadList } from "./upload-list";
import { draftFromAlbum } from "@/lib/admin/albums/album-draft";
import type { AdminAlbum, AlbumPhoto } from "@/lib/admin/albums/types";
import type { UploadItem } from "@/lib/admin/albums/upload-queue";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

const photo = (id: string, alt = `Album — Photo ${id}`): AlbumPhoto => ({
  id,
  url: `https://cdn/${id}.jpg`,
  altText: { ar: `ألبوم — صورة ${id}`, en: alt },
  caption: { ar: "ألبوم", en: "Album" },
  displayOrder: 0,
  photographer: null,
  captureDate: null,
  isVisible: true,
});

const album = (overrides: Partial<AdminAlbum> = {}): AdminAlbum => ({
  id: "66f0a1b2c3d4e5f607182901",
  title: { ar: "أ", en: "A" },
  slug: "a",
  description: null,
  seasonId: null,
  championshipId: null,
  competitionId: null,
  publicEventId: null,
  athleteIds: [],
  clubIds: [],
  eventDate: null,
  location: null,
  isFeatured: false,
  championshipName: null,
  coverImageId: null,
  displayOrder: 0,
  publicationState: "Draft",
  tags: [],
  assetCount: 0,
  publishedAt: null,
  ...overrides,
});

describe("PhotoGrid — the keyboard path equals the drag", () => {
  const setup = (canUpdate = true) => {
    const onReorder = vi.fn();
    render(
      <PhotoGrid
        photos={[photo("1"), photo("2"), photo("3")]}
        coverId="2"
        selected={new Set()}
        detailsId={null}
        canUpdate={canUpdate}
        busy={false}
        locale="en"
        onReorder={onReorder}
        onCover={vi.fn()}
        onSelect={vi.fn()}
        onDetails={vi.fn()}
      />,
    );
    return { onReorder, user: userEvent.setup() };
  };

  it("moves a photo one place and hands up the album's COMPLETE order", async () => {
    const { onReorder, user } = setup();
    await user.click(screen.getByRole("button", { name: "moveForward:1" }));
    expect(onReorder).toHaveBeenCalledWith(["2", "1", "3"]);
    await user.click(screen.getByRole("button", { name: "moveBack:3" }));
    expect(onReorder).toHaveBeenLastCalledWith(["1", "3", "2"]);
  });

  it("disables the moves that would change nothing", () => {
    setup();
    expect(screen.getByRole("button", { name: "moveBack:1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "moveForward:3" })).toBeDisabled();
  });

  it("marks the cover and offers 'set as cover' on the others only", () => {
    setup();
    const tiles = screen.getAllByRole("listitem");
    expect(within(tiles[1]).getByText("coverBadge")).toBeInTheDocument();
    expect(within(tiles[1]).queryByRole("button", { name: "setCover" })).toBeNull();
    expect(within(tiles[0]).getByRole("button", { name: "setCover" })).toBeInTheDocument();
  });

  it("offers no arrangement to a reader who cannot update the album", () => {
    setup(false);
    expect(screen.queryByRole("button", { name: /move/ })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("describes each photo with the alternative text it actually carries", () => {
    setup();
    expect(screen.getByRole("img", { name: "Album — Photo 2" })).toBeInTheDocument();
  });
});

describe("InlineConfirm", () => {
  it("puts focus on Cancel, so an Enter meant for the opener cannot confirm", () => {
    render(<InlineConfirm message="Delete?" confirmLabel="Delete" cancelLabel="Cancel" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Delete?");
  });
});

describe("AlbumPublishingSection", () => {
  const renderWith = (record: AdminAlbum | null, canPublish: boolean) =>
    render(
      <AlbumPublishingSection
        record={record}
        canPublish={canPublish}
        canUpdate
        draft={draftFromAlbum(record)}
        set={vi.fn()}
        problems={[]}
        showErrors={false}
      />,
    );
  const options = () => screen.getAllByRole("option").map((option) => option.textContent);

  it("offers a new album draft, archived, and published only to a publisher", () => {
    renderWith(null, true);
    expect(options()).toEqual(["state_Draft", "state_Archived", "state_Published"]);
  });

  it("withholds published from an editor without the publish grant", () => {
    renderWith(null, false);
    expect(options()).toEqual(["state_Draft", "state_Archived"]);
  });

  it("shows a published album's state as final, since no route leads back", () => {
    renderWith(album({ publicationState: "Published" }), true);
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText("statePublishedFinal")).toBeInTheDocument();
  });

  it("keeps the featured switch off until the album is to be published", () => {
    renderWith(album(), true);
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByText("featuredNeedsPublishedHint")).toBeInTheDocument();
  });
});

describe("AlbumAffiliationSection", () => {
  it("draws the four occasion pickers disabled, each saying it arrives with its module", () => {
    render(
      <AlbumAffiliationSection
        draft={draftFromAlbum(null)}
        set={vi.fn()}
        problems={[]}
        showErrors={false}
        athletes={[]}
        clubs={[]}
        onAthletesChange={vi.fn()}
        onClubsChange={vi.fn()}
        locale="ar"
      />,
    );
    const pickers = screen.getAllByRole("combobox");
    expect(pickers).toHaveLength(4);
    for (const picker of pickers) expect(picker).toBeDisabled();
    expect(screen.getAllByText("lockModuleMissing")).toHaveLength(4);
    // The two that work today are searchable.
    expect(screen.getByRole("searchbox", { name: "searchPeople:athletesLabel" })).toBeEnabled();
    expect(screen.getByRole("searchbox", { name: "searchPeople:clubsLabel" })).toBeEnabled();
  });

  it("names an incoherent stored affiliation under the field that fixes it, once errors show", () => {
    const draft = draftFromAlbum(album({ championshipId: "66f0a1b2c3d4e5f607182902" }));
    render(
      <AlbumAffiliationSection
        draft={draft}
        set={vi.fn()}
        problems={["championshipNeedsSeason"]}
        showErrors
        athletes={[]}
        clubs={[]}
        onAthletesChange={vi.fn()}
        onClubsChange={vi.fn()}
        locale="ar"
      />,
    );
    expect(screen.getByText("problem_championshipNeedsSeason")).toBeInTheDocument();
  });
});

describe("UploadList", () => {
  const item = (overrides: Partial<UploadItem>): UploadItem => ({
    key: "k",
    file: new File(["x"], "finish-line.jpg", { type: "image/jpeg" }),
    position: 1,
    status: "failed",
    progress: 0,
    error: "serviceUnavailable",
    retryable: true,
    ...overrides,
  });

  it("offers a retry for a failure a retry could fix, and none for a wrong file type", async () => {
    const onRetry = vi.fn();
    render(
      <UploadList
        items={[item({ key: "a" }), item({ key: "b", error: "wrongType", retryable: false })]}
        describe={(code) => `described:${code}`}
        onRetry={onRetry}
        onDismiss={vi.fn()}
        onClearDone={vi.fn()}
      />,
    );
    const retries = screen.getAllByRole("button", { name: "retryUpload" });
    expect(retries).toHaveLength(1);
    await userEvent.setup().click(retries[0]);
    expect(onRetry).toHaveBeenCalledWith("a");
    expect(screen.getByText("described:serviceUnavailable")).toBeInTheDocument();
    expect(screen.getByText("upload_wrongType")).toBeInTheDocument();
  });

  it("draws real progress on the platform's progress element", () => {
    render(
      <UploadList
        items={[item({ status: "uploading", progress: 0.4, error: null })]}
        describe={String}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
        onClearDone={vi.fn()}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0.4");
    expect(screen.getByText("uploadProgress:40")).toBeInTheDocument();
  });
});
