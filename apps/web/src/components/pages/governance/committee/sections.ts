import type { CommitteeView, GovernancePageSettings } from "@/lib/governance/types";

/** The page's sections in reading order; each is also its anchor id and its `page.sections` key. */
export const SECTION_IDS = [
  "about",
  "duties",
  "members",
  "sub-committees",
  "documents",
  "others",
] as const;

export type CommitteeSectionId = (typeof SECTION_IDS)[number];

/**
 * Which sections draw, decided once.
 *
 * The chapter nav and the sections both read this map, so an entry cannot
 * point at a section that returned nothing. A section draws when it has data
 * and the page settings have not switched it off; a key absent from
 * `page.sections` is shown.
 */
export const presentSections = (
  committee: CommitteeView & { page: GovernancePageSettings },
): Readonly<Record<CommitteeSectionId, boolean>> => {
  const hasData: Record<CommitteeSectionId, boolean> = {
    about: Boolean(committee.about),
    duties: committee.duties.length > 0,
    members: committee.chair !== null || committee.members.length > 0,
    "sub-committees": committee.children.length > 0,
    documents: committee.documents.length > 0,
    others: committee.siblings.length > 0,
  };

  return Object.fromEntries(
    SECTION_IDS.map((id) => [id, hasData[id] && committee.page.sections[id] !== false]),
  ) as Record<CommitteeSectionId, boolean>;
};

/** Scroll offset for an anchored section: the sticky site header plus the chapter nav. */
export const ANCHOR_OFFSET = "scroll-mt-[calc(var(--header-height)+var(--space-16))]";
