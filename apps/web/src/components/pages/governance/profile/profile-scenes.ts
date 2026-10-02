import type { PersonProfileView, PublicContact } from "@/lib/governance/types";

/** The six scenes after the opening, in page order. Each id is also its anchor. */
export type SceneId = "glance" | "bio" | "journey" | "qualifications" | "achievements" | "finish";

const ORDER: readonly SceneId[] = ["glance", "bio", "journey", "qualifications", "achievements", "finish"];

/**
 * The contact details the page may print, or null.
 *
 * Both the switch and the details have to allow it: the endpoint is expected
 * to drop the details when the switch is off, and the page stays right if it
 * does not.
 */
export const publicContactOf = (profile: PersonProfileView): PublicContact | null => {
  const { showPublicContact, publicContact } = profile.person;
  if (showPublicContact !== true || !publicContact) return null;
  return publicContact.email || publicContact.phone ? publicContact : null;
};

const hasPosts = (profile: PersonProfileView) => profile.current.length + profile.previous.length > 0;

/**
 * Whether each scene has anything to draw.
 *
 * The scenes test themselves with these same functions, so a scene and its nav
 * entry cannot disagree about whether it exists.
 */
export const SCENE_HAS: Readonly<Record<SceneId, (profile: PersonProfileView) => boolean>> = {
  glance: hasPosts,
  bio: (profile) => profile.person.bio !== null,
  journey: hasPosts,
  qualifications: ({ person: { cv } }) =>
    cv.qualifications.length + cv.certifications.length + cv.previousPositions.length > 0,
  achievements: (profile) => profile.person.cv.achievements.length > 0,
  finish: (profile) => profile.others.length > 0 || publicContactOf(profile) !== null,
};

/**
 * The scenes that render, in order, each with its number.
 *
 * Numbered after filtering so the sequence stays contiguous when a scene drops
 * out. A section the page settings switch off is dropped the same way; one
 * absent from the map is shown.
 */
export const visibleScenes = (profile: PersonProfileView): { id: SceneId; number: number }[] =>
  ORDER.filter((id) => SCENE_HAS[id](profile) && profile.page.sections[id] !== false).map((id, index) => ({
    id,
    number: index + 1,
  }));

export type SceneLabelKey =
  | "glanceTitle"
  | "bioTitle"
  | "journeyTitle"
  | "qualificationsTitle"
  | "achievementsTitle"
  | "finishTitle"
  | "contactTitle";

/** The `Person` key that names a scene, in the nav and above its heading. */
export const sceneLabelKey = (id: SceneId, profile: PersonProfileView): SceneLabelKey => {
  switch (id) {
    case "glance":
      return "glanceTitle";
    case "bio":
      return "bioTitle";
    case "journey":
      return "journeyTitle";
    case "qualifications":
      return "qualificationsTitle";
    case "achievements":
      return "achievementsTitle";
    case "finish":
      // With nobody else to meet, the scene is only the contact block.
      return profile.others.length > 0 ? "finishTitle" : "contactTitle";
  }
};

/** Anchored scenes clear the sticky header and the section nav beneath it. */
export const SCENE_SCROLL_MARGIN = "scroll-mt-[calc(var(--header-height)+var(--space-16))]";
