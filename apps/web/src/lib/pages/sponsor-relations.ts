import { fetchPublic } from "@/lib/api/public-client";
import type {
  OrganizationCardPublic,
  PageSectionPublic,
  SponsorStripSettingsPublic,
  SponsorshipPublic,
} from "@/lib/api/types";

/**
 * Reading the homepage's sponsor strip, sponsors, partners and memberships
 * (ADR-0085).
 *
 * Only what the page composes is read: a section missing from the homepage's
 * `pageSections` costs no request, and the strip's settings come from the
 * public site settings. Every failure resolves to empty, as the rest of the
 * homepage does, so the page renders while the API restarts and a section with
 * nothing to show is simply absent.
 */

export type RelationSectionType = "SPONSORS" | "PARTNERS" | "MEMBERSHIPS";

const RELATION_TYPES: readonly RelationSectionType[] = ["SPONSORS", "PARTNERS", "MEMBERSHIPS"];

export interface SponsorRelations {
  /** The three sections in the page's own order. */
  sections: (PageSectionPublic & { sectionType: RelationSectionType })[];
  sponsorships: SponsorshipPublic[];
  partners: OrganizationCardPublic[];
  memberships: OrganizationCardPublic[];
  strip: SponsorStripSettingsPublic | null;
}

export const relationSections = (sections: readonly PageSectionPublic[]): SponsorRelations["sections"] =>
  sections
    .filter((section): section is PageSectionPublic & { sectionType: RelationSectionType } =>
      (RELATION_TYPES as readonly string[]).includes(section.sectionType),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);

export const loadSponsorRelations = async (sections: readonly PageSectionPublic[]): Promise<SponsorRelations> => {
  const composed = relationSections(sections);
  const has = (type: RelationSectionType) => composed.some((section) => section.sectionType === type);

  const [sponsorships, partners, memberships, settings] = await Promise.all([
    fetchPublic<SponsorshipPublic[]>("/sponsorships/public"),
    has("PARTNERS") ? fetchPublic<OrganizationCardPublic[]>("/partnerships/public") : Promise.resolve(null),
    has("MEMBERSHIPS") ? fetchPublic<OrganizationCardPublic[]>("/memberships/public") : Promise.resolve(null),
    fetchPublic<{ sponsorStrip?: SponsorStripSettingsPublic } | null>("/site-settings/public"),
  ]);

  return {
    sections: composed,
    sponsorships: sponsorships ?? [],
    partners: partners ?? [],
    memberships: memberships ?? [],
    strip: settings?.sponsorStrip ?? null,
  };
};
