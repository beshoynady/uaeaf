import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GallerySectionEditor } from "./section-editor";
import { moveAlbum, readGallerySectionDraft, toGalleryConfiguration } from "./section-draft";
import type { AdminAlbum } from "@/lib/admin/albums/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

const A = "66f0a1b2c3d4e5f607182901";
const B = "66f0a1b2c3d4e5f607182902";

/**
 * The homepage's PHOTO_GALLERY section, configured on the row the admin
 * bootstrap seeds: `{ eyebrow, enabled, mode, count, albumIds }`.
 */
describe("readGallerySectionDraft", () => {
  it("opens on the seed's defaults when nothing usable is stored", () => {
    for (const nonsense of [null, "text", 42, [], { count: 99, mode: "random" }]) {
      const draft = readGallerySectionDraft(nonsense);
      expect(draft.mode).toBe("latest");
      expect(draft.count).toBe(4);
      expect(draft.albumIds).toEqual([]);
    }
  });

  it("keeps a saved configuration, dropping malformed and repeated ids", () => {
    const draft = readGallerySectionDraft({ mode: "manual", count: 6, albumIds: [A, "junk", A, B] });
    expect(draft).toMatchObject({ mode: "manual", count: 6, albumIds: [A, B] });
  });

  it("reads the section as hidden when either the row or the configuration says so", () => {
    expect(readGallerySectionDraft({ enabled: true }, { enabled: false }).enabled).toBe(false);
    expect(readGallerySectionDraft({ enabled: false }, { enabled: true }).enabled).toBe(false);
    expect(readGallerySectionDraft({}, {}).enabled).toBe(true);
  });

  it("writes back exactly the seeded shape", () => {
    const draft = readGallerySectionDraft({ eyebrow: { ar: "م", en: "M" }, enabled: true, mode: "manual", count: 3, albumIds: [A] });
    expect(Object.keys(toGalleryConfiguration(draft)).sort()).toEqual(["albumIds", "count", "enabled", "eyebrow", "mode"]);
  });

  it("moves a manual pick one place, and refuses a move past either end", () => {
    expect(moveAlbum([A, B], B, -1)).toEqual([B, A]);
    expect(moveAlbum([A, B], A, -1)).toBeNull();
  });
});

const published = (id: string, title: string): AdminAlbum => ({
  id,
  title: { ar: title, en: title },
  slug: id,
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
  publicationState: "Published",
  tags: [],
  assetCount: 3,
  publishedAt: null,
});

describe("GallerySectionEditor", () => {
  const setup = (configuration: unknown = {}) => {
    const onSave = vi.fn();
    render(
      <GallerySectionEditor
        initial={readGallerySectionDraft(configuration)}
        onSave={onSave}
        albums={[published(A, "Marathon"), published(B, "Relay")]}
        albumsReadable
        locale="en"
      />,
    );
    return { onSave, user: userEvent.setup() };
  };

  it("offers a count from three to eight", () => {
    setup();
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["3", "4", "5", "6", "7", "8"]);
  });

  it("draws the manual picker only in manual mode, and saves the order chosen", async () => {
    const { onSave, user } = setup({ mode: "latest" });
    expect(screen.queryByRole("button", { name: "manualAdd:Marathon" })).toBeNull();

    await user.click(screen.getByRole("radio", { name: /^galleryMode_manual/}));
    await user.click(screen.getByRole("button", { name: "manualAdd:Relay" }));
    await user.click(screen.getByRole("button", { name: "manualAdd:Marathon" }));
    await user.click(screen.getByRole("button", { name: "manualMoveUp:Marathon" }));
    await user.click(screen.getByRole("button", { name: "save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mode: "manual", albumIds: [A, B] }));
  });
});
