import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { readGallerySectionDraft } from "@/components/admin/homepage-albums/section-draft";
import type { GallerySectionDraft } from "@/components/admin/homepage-albums/section-draft";
import type { AppLocale } from "@/i18n/routing";
import { toAdminAlbumList } from "./to-admin-album";
import { byNewestOccasion } from "./list-filters";
import type { AdminAlbum } from "./types";

/**
 * What the homepage photo-gallery editor opens on.
 *
 * The settings live on the homepage's `PHOTO_GALLERY` row in `pageSections`,
 * the same row every homepage section uses, and are saved through the existing
 * `page-sections` route — the video section's arrangement exactly. There is no
 * second place to configure the section.
 *
 * The albums come with it for the manual picker. Published ones only: the
 * homepage cannot link a card to an album with no public page.
 */
export type GallerySectionScreen =
  | { status: "denied" }
  | { status: "noSection" }
  | {
      status: "ready";
      data: { sectionId: string; draft: GallerySectionDraft; albums: AdminAlbum[]; albumsReadable: boolean };
    };

const HOMEPAGE_SLUG = "home";
export const GALLERY_SECTION_TYPE = "PHOTO_GALLERY";

interface SectionRow {
  _id: string;
  sectionType: string;
  enabled?: boolean;
  sectionTitle?: unknown;
  sectionSubtitle?: unknown;
  configuration?: Record<string, unknown> | null;
}

export const loadGallerySectionScreen = async (locale: AppLocale): Promise<GallerySectionScreen> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "pageSections", "Update")) {
    return { status: "denied" };
  }

  const page = await fetchAsUser<{ id?: unknown }>(`/pages/public/${HOMEPAGE_SLUG}`, locale);
  if (!page || typeof page.id !== "string") return { status: "noSection" };

  const sections = await fetchAsUser<SectionRow[]>(`/page-sections/by-page/${page.id}`, locale);
  if (!Array.isArray(sections)) return { status: "denied" };

  // Seeded by `bootstrap:admin`. Absent means the seed has not run on this
  // database, and the screen says so rather than drawing a form with nowhere
  // to save.
  const row = sections.find((section) => section.sectionType === GALLERY_SECTION_TYPE);
  if (!row) return { status: "noSection" };

  // A refused album read costs the picker, not the screen: the switch, the
  // mode and the count are all still editable without it.
  const raw = hasPermission(grants, "albums", "Read")
    ? await fetchAsUser<unknown>("/albums", locale).catch(() => null)
    : null;

  return {
    status: "ready",
    data: {
      sectionId: row._id,
      draft: readGallerySectionDraft(row.configuration, row as unknown as Record<string, unknown>),
      albums: toAdminAlbumList(raw)
        .filter((album) => album.publicationState === "Published")
        .sort(byNewestOccasion),
      albumsReadable: raw !== null,
    },
  };
};
