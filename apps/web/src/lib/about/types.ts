import type { LocalizedText } from "@/lib/api/types";

/**
 * The About page as the API hands it over.
 *
 * Every section is optional, and that is the whole contract: the server has
 * already removed what a visitor must not see — sections an editor switched
 * off, items they hid, milestones whose date the federation has not confirmed,
 * and any section those removals left with nothing in it (ADR-0101 D4). So the
 * page renders what arrived and asks no questions about why something is
 * missing; there is no "hidden" flag to check, because nothing hidden is here.
 *
 * The consequence for the page's code is worth stating plainly: a section
 * component must never assume its neighbour exists.
 */

export interface AboutImage {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: LocalizedText | null;
}

export type FactTone = "green" | "black" | "red" | "tri";
export type CardTone = "green" | "black" | "red";
export type MedalKind = "gold" | "silver" | "bronze" | "other";
export type DatePrecision = "year" | "monthYear" | "fullDate";

export type MilestoneCategory =
  | "association"
  | "firstLeadership"
  | "firstParticipation"
  | "federation"
  | "globalMembership"
  | "continentalMembership";

export interface AboutFact {
  _id: string;
  value: string;
  badge: LocalizedText;
  label: LocalizedText;
  tone: FactTone;
}

export interface AboutMilestone {
  _id: string;
  /** Never `"unknown"` here: an undated milestone does not reach the page. */
  datePrecision: DatePrecision;
  year: number;
  month: number | null;
  day: number | null;
  category: MilestoneCategory;
  title: LocalizedText;
  description: LocalizedText;
  featured: boolean;
  image: AboutImage | null;
}

export interface AboutAchievement {
  _id: string;
  year: number;
  place: LocalizedText;
  medalKind: MedalKind;
  medalLabel: LocalizedText | null;
  title: LocalizedText;
  description: LocalizedText;
  athleteId: string | null;
  image: AboutImage | null;
}

export interface AboutPioneer {
  _id: string;
  name: LocalizedText;
  badge: LocalizedText;
  description: LocalizedText;
  image: AboutImage | null;
  featured: boolean;
}

export interface AboutLeader {
  fullName: LocalizedText;
  positionTitle: LocalizedText;
  roleType: string;
  photoId: string | null;
}

export interface AboutGovernanceCard {
  _id: string;
  title: LocalizedText;
  text: LocalizedText;
  tone: CardTone;
}

export interface AboutLink {
  label: LocalizedText;
  href: string;
}

export interface AboutStat {
  key: "clubs" | "athletes" | "officials" | "championships";
  value: number;
}

export interface AboutPage {
  isActive: boolean;
  publishedAt?: string;
  hero?: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    image: AboutImage | null;
  };
  facts?: { items: AboutFact[] };
  story?: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    paragraphs: LocalizedText[];
    image: AboutImage | null;
    docCard: { label: LocalizedText; title: LocalizedText; date: LocalizedText };
  };
  timeline?: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    items: AboutMilestone[];
  };
  achievements?: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    items: AboutAchievement[];
  };
  pioneers?: { eyebrow: LocalizedText; title: LocalizedText; items: AboutPioneer[] };
  leadership?: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    quote: LocalizedText;
    priorities: LocalizedText[];
    people: AboutLeader[];
  };
  governance?: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    cards: AboutGovernanceCard[];
    link: AboutLink;
  };
  ecosystem?: { eyebrow: LocalizedText; title: LocalizedText; stats: AboutStat[] };
  cta?: {
    title: LocalizedText;
    description: LocalizedText;
    primary: AboutLink;
    secondary: AboutLink;
  };
  seo?: {
    metaTitle: LocalizedText | null;
    metaDescription: LocalizedText | null;
    ogImage: AboutImage | null;
  };
}

/**
 * The sections in the order the page prints them, which is fixed in code and
 * not stored (ADR-0101 D3).
 *
 * Exported so the hero's scroll cue can find the first section that is
 * actually present without duplicating the order, and so a reader can see the
 * page's shape in one place.
 */
export const ABOUT_SECTION_ORDER = [
  "hero",
  "facts",
  "story",
  "timeline",
  "achievements",
  "pioneers",
  "leadership",
  "governance",
  "ecosystem",
  "cta",
] as const;

export type AboutSectionKey = (typeof ABOUT_SECTION_ORDER)[number];

/** Each section's anchor id, used by the hero's scroll cue and by the
 *  dashboard's "preview this section" links. */
export const sectionAnchor = (key: AboutSectionKey): string => `about-${key}`;

/**
 * The first section after the hero that the response actually carries.
 *
 * The scroll cue points here. Hard-coding it at the facts row would leave the
 * cue pointing at nothing the moment an editor switches that row off — a
 * silent dead link on the one control inviting the reader onward.
 */
export const firstSectionAfterHero = (page: AboutPage): AboutSectionKey | null =>
  ABOUT_SECTION_ORDER.slice(1).find((key) => page[key] !== undefined) ?? null;
