import type { LocalizedText } from "@/lib/api/types";

/**
 * The shapes the governance pages render from.
 *
 * These describe public read endpoints that do not exist yet, so nothing here
 * mirrors a DTO the way `lib/api/types.ts` does. They are written from the
 * approved model — one record per person, posts as separate records tied to an
 * election cycle, and admin-defined positions carrying their own rank — so that
 * wiring the pages up later changes where the data comes from and not what
 * shape it arrives in.
 *
 * Two properties are deliberate and should survive that wiring:
 *
 * 1. **Already resolved.** A post arrives with its person, its position and its
 *    committee attached rather than as three ids to look up. A component that
 *    takes ids cannot render without a fetch, and these pages take props.
 * 2. **Nothing restricted is expressible.** No personal email, personal phone
 *    or identity number appears in any type here. Those live on the record and
 *    are served only under `ViewSensitive`; leaving them out of the public
 *    shapes means a public page cannot print one by mistake.
 */

/** Which body a post belongs to. Each body has its own list of positions. */
export type GovernanceBody = "board" | "committee";

/**
 * Standing, or a sub-committee of something.
 *
 * A fixed enum, unlike everything else about a committee, because the parent
 * rules are written against these two values. `null` is a committee the admin
 * has not classified yet.
 */
export type CommitteeKind = "standing" | "sub";

/** Why a post ended. A post closes with a date and one of these, and is never deleted. */
export type AppointmentEndReason =
  | "completed"
  | "resigned"
  | "removed"
  | "transitioned"
  | "deceased";

/**
 * A job the admin created, named, and placed in the structure.
 *
 * `rank` is the level: 1 is the highest, and positions sharing a rank share a
 * row of the organisational chart. `order` settles the sequence inside one
 * rank. No role list exists in the code — a committee's chair is whoever holds
 * the highest-ranked `committee` position, not a value a page tests for.
 */
export interface PositionView {
  id: string;
  title: LocalizedText;
  body: GovernanceBody;
  rank: number;
  order: number;
}

/** An election cycle. Posts belong to one; a closed cycle is the archive. */
export interface ElectionCycleView {
  id: string;
  label: LocalizedText;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

/** The part of a person a card shows. `slug` is fixed at creation and is the profile's address. */
export interface PersonSummary {
  id: string;
  slug: string;
  name: LocalizedText;
  /** "د." and the like, kept apart from the name so a dense listing can drop it. */
  honorific: LocalizedText | null;
  photoId: string | null;
}

/** One entry of a person's record — a qualification, a certificate, a previous post. */
export interface CvEntry {
  id: string;
  title: LocalizedText;
  /** The year, the institution, the employer: whatever belongs under the title. */
  detail: LocalizedText | null;
  order: number;
}

/**
 * The five lists of the record, each already filtered to its visible entries
 * and sorted. An empty list hides its scene and that scene's entry in the
 * section nav, so no heading is ever drawn over nothing.
 */
export interface PersonCv {
  qualifications: readonly CvEntry[];
  certifications: readonly CvEntry[];
  previousPositions: readonly CvEntry[];
  experience: readonly CvEntry[];
  achievements: readonly CvEntry[];
}

/** Published contact details. Served only when the record allows it. */
export interface PublicContact {
  email: string | null;
  phone: string | null;
}

/** A person's full record, as the profile page reads it. */
export interface PersonView extends PersonSummary {
  bio: LocalizedText | null;
  nationality: LocalizedText | null;
  cv: PersonCv;
  /**
   * Checked together with `publicContact`; both have to allow it.
   *
   * The endpoint is expected to drop the details themselves when this is off,
   * which is the guarantee that matters. The switch travels too so the page is
   * right either way the endpoint ends up written.
   */
  showPublicContact: boolean;
  publicContact: PublicContact | null;
}

/** What a committee looks like from elsewhere — a card, a parent line, a chip. */
export interface CommitteeSummary {
  id: string;
  slug: string;
  name: LocalizedText;
  summary: LocalizedText | null;
  kind: CommitteeKind | null;
  /** The committee it reports to. Null on a sub-committee means it reports to the board. */
  parentCommitteeId: string | null;
  order: number;
}

/** A committee card carries its chair, which is a post rather than a field of the committee. */
export interface CommitteeCard extends CommitteeSummary {
  chair: AppointmentView | null;
  memberCount: number;
  /** Filled for a standing committee so a listing never walks the tree itself. */
  children: readonly CommitteeSummary[];
}

/** One duty, from the formation decision or the terms of reference. */
export interface CommitteeDuty {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  order: number;
}

/** The decision that formed the committee, and the document it was issued as. */
export interface FormationDecision {
  number: string;
  date: string;
  documentId: string | null;
}

/** A linked document, from the governance documents collection. */
export interface CommitteeDocument {
  id: string;
  title: LocalizedText;
  /** A decision number and date, an approval date — whatever names this copy. */
  subtitle: LocalizedText | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSizeBytes: number | null;
}

/**
 * One held post with everything it points at already attached.
 *
 * `termEnd` and `endReason` are what make a post former rather than current. A
 * closed post keeps its row and appears on the profile among previous posts.
 */
export interface AppointmentView {
  id: string;
  person: PersonSummary;
  position: PositionView;
  body: GovernanceBody;
  /** Set when `body` is `"committee"`. */
  committee: CommitteeSummary | null;
  cycle: ElectionCycleView;
  termStart: string;
  termEnd: string | null;
  endReason: AppointmentEndReason | null;
  order: number;
}

/** A committee page: the committee, its people, its paper, and its place in the tree. */
export interface CommitteeView extends CommitteeSummary {
  about: LocalizedText | null;
  duties: readonly CommitteeDuty[];
  formationDecision: FormationDecision | null;
  documents: readonly CommitteeDocument[];
  chair: AppointmentView | null;
  /** The chair is not repeated here. */
  members: readonly AppointmentView[];
  /**
   * Resolved from `parentCommitteeId`. Null on a standing committee, and also
   * on a sub-committee reporting to the board directly — `kind` tells the two
   * apart.
   */
  parent: CommitteeSummary | null;
  children: readonly CommitteeCard[];
  /** Other visible committees, for the closing section. */
  siblings: readonly CommitteeCard[];
  cycle: ElectionCycleView | null;
}

/**
 * The committees listing, split the way it is displayed.
 *
 * Standing committees carry their own children, so the page never walks the
 * tree; `boardSubCommittees` are the ones whose `parentCommitteeId` is empty.
 * Either list being empty hides its section.
 */
export interface CommitteesIndexView {
  standing: readonly CommitteeCard[];
  boardSubCommittees: readonly CommitteeCard[];
  cycle: ElectionCycleView | null;
}

/** One row of the organisational chart: every post whose position shares a rank. */
export interface OrgChartRow {
  rank: number;
  posts: readonly AppointmentView[];
}

/**
 * The chart, built when the page renders rather than stored.
 *
 * The general assembly is the member clubs, so it is a count and a link rather
 * than a record of its own. Board rows come from the posts grouped by their
 * position's rank, and the committees repeat the listing's split.
 */
export interface OrgChartView {
  memberClubCount: number;
  rows: readonly OrgChartRow[];
  standing: readonly CommitteeCard[];
  boardSubCommittees: readonly CommitteeCard[];
}

/** The hero any of these pages stores. */
export interface GovernanceHero {
  eyebrow: LocalizedText | null;
  title: LocalizedText;
  subtitle: LocalizedText | null;
  imageId: string | null;
}

/**
 * A page's own settings.
 *
 * `isActive` is the federation's switch: off, the address still answers and
 * serves the standing in-preparation screen. `sections` is keyed by the section
 * names of the page it belongs to, and a name absent from the map is shown.
 */
export interface GovernancePageSettings {
  isActive: boolean;
  hero: GovernanceHero;
  sections: Readonly<Record<string, boolean>>;
}

/** Everything the board page draws. */
export interface BoardPageView {
  page: GovernancePageSettings;
  chart: OrgChartView;
  /** The single highest-ranked board post, drawn on its own above the rest. */
  chairman: AppointmentView | null;
  /** The rank below the chairman, however the admin named those positions. */
  leadership: readonly AppointmentView[];
  /** Every remaining board post. */
  members: readonly AppointmentView[];
  cycle: ElectionCycleView | null;
}

/** Everything the profile page draws. */
export interface PersonProfileView {
  page: GovernancePageSettings;
  person: PersonView;
  /** Posts whose term has not ended, ordered by their position's rank. */
  current: readonly AppointmentView[];
  /** Closed posts, from every cycle, most recent first. */
  previous: readonly AppointmentView[];
  /** Other people holding a visible post, for the closing scene. */
  others: readonly PersonSummary[];
}
