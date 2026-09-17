import type { StripSettingsLike } from "@uaeaf/content/sponsors";
import { fromOrganizationRecords, type OrganizationKind, type OrganizationRecord, type OrganizationsDraft } from "./organizations";
import { fromSponsorRecords, type SponsorRecord, type SponsorsDraft, type SponsorsSectionRecord, type SponsorshipRecord } from "./sponsors";
import { fromStripRecord, type StripDraft } from "./strip-settings";

/**
 * What the sponsors, partners, memberships and strip screens open on.
 *
 * `read` is `fetchAsUser` on the server: it resolves `null` for a refused read
 * and throws for anything else, with the upstream status on the error. The
 * screens check their grants before reading, so a refusal here is a failure,
 * not an empty list.
 */

export type Read = (path: string) => Promise<unknown>;

type Failed = { state: "loadFailed" };

const HOMEPAGE_SLUG = "home";

const ORGANIZATION_PATH: Record<OrganizationKind, string> = { partners: "/partnerships", memberships: "/memberships" };

const listOf = async <T>(read: Read, path: string): Promise<T[] | null> => {
  const answer = await read(path);
  return Array.isArray(answer) ? (answer as T[]) : null;
};

const statusOf = (error: unknown): number | undefined =>
  typeof error === "object" && error !== null && typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : undefined;

/** The homepage's SPONSORS section, or `null` when the homepage or the section
 *  does not exist: the sponsors themselves are still editable without it. */
const sponsorsSection = async (read: Read): Promise<SponsorsSectionRecord | null> => {
  try {
    const page = (await read(`/pages/public/${HOMEPAGE_SLUG}`)) as { id?: unknown } | null;
    if (!page || typeof page.id !== "string") return null;
    const sections = await listOf<SponsorsSectionRecord & { sectionType?: string }>(read, `/page-sections/by-page/${page.id}`);
    if (!sections) throw new Error("page sections refused");
    return sections.find((section) => section.sectionType === "SPONSORS") ?? null;
  } catch (error) {
    if (statusOf(error) === 404) return null;
    throw error;
  }
};

export const loadOrganizations = async (kind: OrganizationKind, read: Read): Promise<{ state: "ready"; draft: OrganizationsDraft } | Failed> => {
  try {
    const records = await listOf<OrganizationRecord>(read, ORGANIZATION_PATH[kind]);
    return records ? { state: "ready", draft: fromOrganizationRecords(kind, records) } : { state: "loadFailed" };
  } catch {
    return { state: "loadFailed" };
  }
};

export const loadSponsors = async (read: Read): Promise<{ state: "ready"; draft: SponsorsDraft } | Failed> => {
  try {
    const [sponsors, sponsorships, section] = await Promise.all([
      listOf<SponsorRecord>(read, "/sponsors"),
      listOf<SponsorshipRecord>(read, "/sponsorships"),
      sponsorsSection(read),
    ]);
    if (!sponsors || !sponsorships) return { state: "loadFailed" };
    return { state: "ready", draft: fromSponsorRecords(sponsors, sponsorships, section) };
  } catch {
    return { state: "loadFailed" };
  }
};

export type StripLoad =
  | {
      state: "ready";
      initial: StripDraft;
      sponsors: SponsorRecord[];
      sponsorships: SponsorshipRecord[];
      bannerSponsorshipId: string | null;
    }
  | Failed;

export const loadStrip = async (read: Read): Promise<StripLoad> => {
  try {
    const [settings, sponsors, sponsorships, section] = await Promise.all([
      read("/site-settings") as Promise<{ sponsorStrip?: Partial<StripSettingsLike> | null } | null>,
      listOf<SponsorRecord>(read, "/sponsors"),
      listOf<SponsorshipRecord>(read, "/sponsorships"),
      sponsorsSection(read),
    ]);
    if (!sponsors || !sponsorships) return { state: "loadFailed" };
    const preference = section?.configuration?.bannerSponsorshipId;
    return {
      state: "ready",
      // No settings document yet means nothing saved: the owner's defaults.
      initial: fromStripRecord(settings?.sponsorStrip ?? null),
      sponsors,
      sponsorships,
      bannerSponsorshipId: typeof preference === "string" ? preference : null,
    };
  } catch {
    return { state: "loadFailed" };
  }
};
