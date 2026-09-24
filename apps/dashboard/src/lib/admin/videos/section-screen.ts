import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { readSectionDraft } from "@/components/admin/homepage-video/section-draft";
import type { SectionDraft } from "@/components/admin/homepage-video/section-draft";
import type { AppLocale } from "@/i18n/routing";
import { toAdminVideoList } from "./to-admin-video";
import type { AdminVideo } from "./types";

/**
 * What the homepage video-section editor opens on.
 *
 * The section's settings live on the homepage's `VIDEO_LIBRARY` row in
 * `pageSections`, the same row every other homepage section uses — there is no
 * second place to configure it, which is why this screen writes through the
 * existing `page-sections` route rather than a video-specific one.
 *
 * The video list comes with it because "featured: a specific video" and the
 * manual carousel both need something to pick from, and an empty picker on a
 * site that has videos would read as a fault.
 */
export type SectionScreen =
  | { status: "denied" }
  | { status: "noSection" }
  | { status: "ready"; data: { sectionId: string; draft: SectionDraft; videos: AdminVideo[] } };

const HOMEPAGE_SLUG = "home";
const SECTION_TYPE = "VIDEO_LIBRARY";

interface SectionRow {
  _id: string;
  sectionType: string;
  enabled?: boolean;
  sectionTitle?: unknown;
  sectionSubtitle?: unknown;
  configuration?: Record<string, unknown> | null;
}

/** Only published rows can be featured or carried in a manual carousel: a
 *  draft has no public page to link to. */
const publishedOnly = (raw: unknown): AdminVideo[] =>
  toAdminVideoList(raw).filter((video) => video.status === "published");

export const loadVideoSectionScreen = async (locale: AppLocale): Promise<SectionScreen> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "pageSections", "Update")) {
    return { status: "denied" };
  }

  const page = await fetchAsUser<{ id?: unknown }>(`/pages/public/${HOMEPAGE_SLUG}`, locale);
  if (!page || typeof page.id !== "string") return { status: "noSection" };

  const sections = await fetchAsUser<SectionRow[]>(`/page-sections/by-page/${page.id}`, locale);
  if (!Array.isArray(sections)) return { status: "denied" };

  const row = sections.find((section) => section.sectionType === SECTION_TYPE);
  if (!row) return { status: "noSection" };

  // A refused video read costs the pickers, not the screen: the texts, the
  // count and the source are all still editable without them.
  const videos = await fetchAsUser<unknown>("/videos", locale).catch(() => null);

  return {
    status: "ready",
    data: {
      sectionId: row._id,
      draft: readSectionDraft(row.configuration, row as unknown as Record<string, unknown>),
      videos: publishedOnly(videos),
    },
  };
};
