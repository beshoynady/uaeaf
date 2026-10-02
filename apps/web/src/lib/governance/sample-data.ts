import type {
  AppointmentView,
  BoardPageView,
  CommitteeCard,
  CommitteeSummary,
  CommitteeView,
  CommitteesIndexView,
  ElectionCycleView,
  GovernancePageSettings,
  PersonProfileView,
  PersonSummary,
  PositionView,
} from "./types";

/**
 * TEMPORARY. Delete this file when the governance endpoints land.
 *
 * The four governance pages are built and reviewable before the API that feeds
 * them exists. This stands in for that API: it holds no real content — every
 * name is bracketed the way the design files bracket a placeholder — and it is
 * reachable only behind `NEXT_PUBLIC_GOVERNANCE_V2`, which is off by default.
 *
 * It exists to exercise states, not to look plausible. Between the records
 * below there is a standing committee with children and one without, a
 * sub-committee reporting to the board, a committee nobody has classified, a
 * committee with no chair, one with no documents and one with no duties, a
 * person whose record fills every scene of the profile and one whose record
 * empties most of them, a published contact and a withheld one, and posts that
 * closed in an earlier cycle. A page that reads well against all of them reads
 * well against real content.
 *
 * Nothing here is seeded into a database and nothing is written: it is a module
 * the screens import while their endpoints are being built.
 */

const ar = (text: string) => text;

/** Both halves of a placeholder read the same, so neither language looks finished. */
const ph = (arabic: string, english: string) => ({ ar: ar(arabic), en: english });

// ---------------------------------------------------------------- cycles

const CURRENT_CYCLE: ElectionCycleView = {
  id: "cycle-current",
  label: ph("[الدورة الحالية]", "[Current term]"),
  startDate: "2025-01-01",
  endDate: "2028-12-31",
  isCurrent: true,
};

const PREVIOUS_CYCLE: ElectionCycleView = {
  id: "cycle-previous",
  label: ph("[الدورة السابقة]", "[Previous term]"),
  startDate: "2021-01-01",
  endDate: "2024-12-31",
  isCurrent: false,
};

// -------------------------------------------------------------- positions

/**
 * Ranks, not roles. Rank 1 is the chairman's row, rank 2 the row beneath it,
 * rank 3 the members. The committee body numbers its own ranks from 1 again,
 * and its rank 1 is what makes someone a committee's chair.
 */
const POSITIONS = {
  boardChair: {
    id: "pos-board-chair",
    title: ph("[رئيس مجلس الإدارة]", "[Chairman of the Board]"),
    body: "board",
    rank: 1,
    order: 1,
  },
  boardDeputy: {
    id: "pos-board-deputy",
    title: ph("[نائب الرئيس]", "[Vice Chairman]"),
    body: "board",
    rank: 2,
    order: 1,
  },
  boardSecretary: {
    id: "pos-board-secretary",
    title: ph("[الأمين العام]", "[General Secretary]"),
    body: "board",
    rank: 2,
    order: 2,
  },
  boardMember: {
    id: "pos-board-member",
    title: ph("[عضو مجلس الإدارة]", "[Board Member]"),
    body: "board",
    rank: 3,
    order: 1,
  },
  committeeChair: {
    id: "pos-committee-chair",
    title: ph("[رئيس اللجنة]", "[Committee Chair]"),
    body: "committee",
    rank: 1,
    order: 1,
  },
  committeeRapporteur: {
    id: "pos-committee-rapporteur",
    title: ph("[مقرر اللجنة]", "[Committee Rapporteur]"),
    body: "committee",
    rank: 2,
    order: 1,
  },
  committeeMember: {
    id: "pos-committee-member",
    title: ph("[عضو اللجنة]", "[Committee Member]"),
    body: "committee",
    rank: 3,
    order: 1,
  },
} satisfies Record<string, PositionView>;

// ---------------------------------------------------------------- people

const person = (n: number, slug: string, honorific: string | null = null): PersonSummary => ({
  id: `person-${n}`,
  slug,
  name: ph(`[اسم العضو ${n}]`, `[Member name ${n}]`),
  honorific: honorific ? ph(honorific, honorific) : null,
  photoId: null,
});

const PEOPLE = {
  chair: person(1, "person-one", "[د.]"),
  deputy: person(2, "person-two"),
  secretary: person(3, "person-three"),
  member4: person(4, "person-four"),
  member5: person(5, "person-five"),
  member6: person(6, "person-six"),
  member7: person(7, "person-seven"),
  member8: person(8, "person-eight"),
  member9: person(9, "person-nine"),
  /** Holds a committee post only: a chair need not sit on the board. */
  outsideChair: person(10, "person-ten"),
} satisfies Record<string, PersonSummary>;

// ------------------------------------------------------------ committees

const committee = (
  n: number,
  slug: string,
  kind: CommitteeSummary["kind"],
  parentCommitteeId: string | null,
  options: { summary?: boolean } = {},
): CommitteeSummary => ({
  id: `committee-${n}`,
  slug,
  name: ph(`[اسم اللجنة ${n}]`, `[Committee name ${n}]`),
  summary:
    options.summary === false
      ? null
      : ph("[سطر تعريفي بدور اللجنة]", "[One line on the committee's role]"),
  kind,
  parentCommitteeId,
  order: n,
});

const COMMITTEES = {
  /** Standing, with two children. */
  standingWithChildren: committee(1, "committee-one", "standing", null),
  /** Standing, with none — the ordinary case. */
  standingPlain: committee(2, "committee-two", "standing", null),
  /** Standing, and nobody has been assigned to chair it. */
  standingNoChair: committee(3, "committee-three", "standing", null),
  childA: committee(4, "committee-four", "sub", "committee-1"),
  childB: committee(5, "committee-five", "sub", "committee-1", { summary: false }),
  /** A sub-committee with no parent reports to the board itself. */
  boardSub: committee(6, "committee-six", "sub", null),
  /** Classified by nobody yet: kept out of both public groups. */
  unclassified: committee(7, "committee-seven", null, null),
} satisfies Record<string, CommitteeSummary>;

// ---------------------------------------------------------- appointments

let appointmentSeq = 0;

const post = (
  holder: PersonSummary,
  position: PositionView,
  extra: Partial<Pick<AppointmentView, "committee" | "cycle" | "termEnd" | "endReason" | "order">> = {},
): AppointmentView => {
  appointmentSeq += 1;
  const cycle = extra.cycle ?? CURRENT_CYCLE;
  return {
    id: `appointment-${appointmentSeq}`,
    person: holder,
    position,
    body: position.body,
    committee: extra.committee ?? null,
    cycle,
    termStart: cycle.startDate,
    termEnd: extra.termEnd ?? null,
    endReason: extra.endReason ?? null,
    order: extra.order ?? 1,
  };
};

const BOARD_POSTS: readonly AppointmentView[] = [
  post(PEOPLE.chair, POSITIONS.boardChair),
  post(PEOPLE.deputy, POSITIONS.boardDeputy),
  post(PEOPLE.secretary, POSITIONS.boardSecretary),
  post(PEOPLE.member4, POSITIONS.boardMember, { order: 1 }),
  post(PEOPLE.member5, POSITIONS.boardMember, { order: 2 }),
  post(PEOPLE.member6, POSITIONS.boardMember, { order: 3 }),
  post(PEOPLE.member7, POSITIONS.boardMember, { order: 4 }),
  post(PEOPLE.member8, POSITIONS.boardMember, { order: 5 }),
  post(PEOPLE.member9, POSITIONS.boardMember, { order: 6 }),
];

const COMMITTEE_POSTS: readonly AppointmentView[] = [
  post(PEOPLE.deputy, POSITIONS.committeeChair, { committee: COMMITTEES.standingWithChildren }),
  post(PEOPLE.member4, POSITIONS.committeeRapporteur, { committee: COMMITTEES.standingWithChildren, order: 2 }),
  post(PEOPLE.member5, POSITIONS.committeeMember, { committee: COMMITTEES.standingWithChildren, order: 3 }),
  post(PEOPLE.member6, POSITIONS.committeeMember, { committee: COMMITTEES.standingWithChildren, order: 4 }),
  // A chair from outside the board, which the model allows.
  post(PEOPLE.outsideChair, POSITIONS.committeeChair, { committee: COMMITTEES.standingPlain }),
  post(PEOPLE.member7, POSITIONS.committeeMember, { committee: COMMITTEES.standingPlain, order: 2 }),
  // `standingNoChair` deliberately has members but no chair.
  post(PEOPLE.member8, POSITIONS.committeeMember, { committee: COMMITTEES.standingNoChair, order: 1 }),
  post(PEOPLE.secretary, POSITIONS.committeeChair, { committee: COMMITTEES.childA }),
  post(PEOPLE.member9, POSITIONS.committeeChair, { committee: COMMITTEES.childB }),
  post(PEOPLE.member4, POSITIONS.committeeChair, { committee: COMMITTEES.boardSub }),
];

/** Closed posts, so a profile has previous posts to list. */
const CLOSED_POSTS: readonly AppointmentView[] = [
  post(PEOPLE.chair, POSITIONS.boardDeputy, {
    cycle: PREVIOUS_CYCLE,
    termEnd: PREVIOUS_CYCLE.endDate,
    endReason: "completed",
  }),
  post(PEOPLE.chair, POSITIONS.committeeChair, {
    committee: COMMITTEES.standingPlain,
    cycle: PREVIOUS_CYCLE,
    termEnd: PREVIOUS_CYCLE.endDate,
    endReason: "transitioned",
  }),
  post(PEOPLE.deputy, POSITIONS.boardMember, {
    cycle: PREVIOUS_CYCLE,
    termEnd: PREVIOUS_CYCLE.endDate,
    endReason: "completed",
  }),
];

// -------------------------------------------------------------- assembly

const chairOf = (id: string) =>
  COMMITTEE_POSTS.find((held) => held.committee?.id === id && held.position.rank === 1) ?? null;

const membersOf = (id: string) =>
  COMMITTEE_POSTS.filter((held) => held.committee?.id === id && held.position.rank !== 1).sort(
    (a, b) => a.position.rank - b.position.rank || a.order - b.order,
  );

const childrenOf = (id: string) =>
  Object.values(COMMITTEES)
    .filter((each) => each.parentCommitteeId === id)
    .sort((a, b) => a.order - b.order);

const toCard = (base: CommitteeSummary): CommitteeCard => ({
  ...base,
  chair: chairOf(base.id),
  memberCount: membersOf(base.id).length + (chairOf(base.id) ? 1 : 0),
  children: childrenOf(base.id),
});

const visible = Object.values(COMMITTEES);

const STANDING = visible
  .filter((each) => each.kind === "standing")
  .sort((a, b) => a.order - b.order)
  .map(toCard);

const BOARD_SUBS = visible
  .filter((each) => each.kind === "sub" && each.parentCommitteeId === null)
  .sort((a, b) => a.order - b.order)
  .map(toCard);

const pageSettings = (
  eyebrow: string,
  eyebrowEn: string,
  title: string,
  titleEn: string,
  subtitle: string,
  subtitleEn: string,
): GovernancePageSettings => ({
  isActive: true,
  hero: {
    eyebrow: ph(eyebrow, eyebrowEn),
    title: ph(title, titleEn),
    subtitle: ph(subtitle, subtitleEn),
    imageId: null,
  },
  sections: {},
});

const rowsByRank = (posts: readonly AppointmentView[]) => {
  const ranks = [...new Set(posts.map((held) => held.position.rank))].sort((a, b) => a - b);
  return ranks.map((rank) => ({
    rank,
    posts: posts
      .filter((held) => held.position.rank === rank)
      .sort((a, b) => a.position.order - b.position.order || a.order - b.order),
  }));
};

/** The board page, with the organisational chart it contains. */
export const sampleBoardPage = (): BoardPageView => ({
  page: pageSettings(
    "[الحوكمة والقيادة]",
    "[Governance and leadership]",
    "[مجلس الإدارة]",
    "[Board of Directors]",
    "[سطر تعريفي بدور المجلس]",
    "[One line on what the board does]",
  ),
  chart: {
    memberClubCount: 25,
    rows: rowsByRank(BOARD_POSTS),
    standing: STANDING,
    boardSubCommittees: BOARD_SUBS,
  },
  chairman: BOARD_POSTS.find((held) => held.position.rank === 1) ?? null,
  leadership: BOARD_POSTS.filter((held) => held.position.rank === 2),
  members: BOARD_POSTS.filter((held) => held.position.rank >= 3),
  cycle: CURRENT_CYCLE,
});

/** The committees listing, already split by kind. */
export const sampleCommitteesIndex = (): CommitteesIndexView & { page: GovernancePageSettings } => ({
  page: pageSettings(
    "[الحوكمة]",
    "[Governance]",
    "[اللجان]",
    "[Committees]",
    "[سطر تعريفي بدور اللجان]",
    "[One line on what the committees do]",
  ),
  standing: STANDING,
  boardSubCommittees: BOARD_SUBS,
  cycle: CURRENT_CYCLE,
});

const DUTIES = [1, 2, 3].map((n) => ({
  id: `duty-${n}`,
  title: ph(`[مهمة ${n}]`, `[Duty ${n}]`),
  description: ph("[وصف المهمة كما ورد في قرار التشكيل]", "[The duty as stated in the formation decision]"),
  order: n,
}));

const DOCUMENTS = [1, 2].map((n) => ({
  id: `document-${n}`,
  title: ph(`[وثيقة ${n}]`, `[Document ${n}]`),
  subtitle: ph("[رقم القرار · التاريخ]", "[Decision no. · Date]"),
  fileUrl: null,
  fileType: "PDF",
  fileSizeBytes: null,
}));

/**
 * One committee.
 *
 * The slug decides which state is served: `committee-two` has no documents and
 * no duties, `committee-three` has no chair, `committee-four` is a child of a
 * standing committee, and `committee-six` reports to the board.
 */
export const sampleCommittee = (
  slug: string,
): (CommitteeView & { page: GovernancePageSettings }) | null => {
  const base = visible.find((each) => each.slug === slug);
  if (!base || base.kind === null) return null;

  const bare = base.id === COMMITTEES.standingPlain.id;
  const parent = base.parentCommitteeId
    ? (visible.find((each) => each.id === base.parentCommitteeId) ?? null)
    : null;

  return {
    ...base,
    page: pageSettings(
      "[الحوكمة]",
      "[Governance]",
      "[اللجان]",
      "[Committees]",
      "[سطر تعريفي]",
      "[One line]",
    ),
    about: bare
      ? null
      : ph("[الغرض من اللجنة ونطاق عملها.]", "[The committee's purpose and the scope of its work.]"),
    duties: bare ? [] : DUTIES,
    formationDecision: bare ? null : { number: "[رقم]", date: "2025-01-01", documentId: null },
    documents: bare ? [] : DOCUMENTS,
    chair: chairOf(base.id),
    members: membersOf(base.id),
    parent,
    children: childrenOf(base.id).map(toCard),
    siblings: STANDING.filter((each) => each.id !== base.id).slice(0, 4),
    cycle: CURRENT_CYCLE,
  };
};

const cvEntries = (count: number, arabic: string, english: string) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${english.toLowerCase().replace(/\W+/g, "-")}-${index + 1}`,
    title: ph(`[${arabic} ${index + 1}]`, `[${english} ${index + 1}]`),
    detail: ph("[الجهة · السنة]", "[Organisation · Year]"),
    order: index + 1,
  }));

/**
 * One person's profile.
 *
 * `person-one` fills every scene and publishes contact details. `person-two`
 * has an empty record and withholds contact, so the profile has to drop four
 * of its seven scenes and the matching entries in the section nav. Any other
 * slug resolves to a person with posts but no record, which is the state the
 * federation's own content starts in.
 */
export const samplePersonProfile = (slug: string): PersonProfileView | null => {
  const base = Object.values(PEOPLE).find((each) => each.slug === slug);
  if (!base) return null;

  const full = base.slug === PEOPLE.chair.slug;
  const empty = base.slug === PEOPLE.deputy.slug;

  const held = [...BOARD_POSTS, ...COMMITTEE_POSTS].filter((each) => each.person.id === base.id);
  const closed = CLOSED_POSTS.filter((each) => each.person.id === base.id);

  return {
    page: pageSettings(
      "[الحوكمة]",
      "[Governance]",
      "[الملف الشخصي]",
      "[Profile]",
      "[سطر تعريفي]",
      "[One line]",
    ),
    person: {
      ...base,
      bio: empty
        ? null
        : ph(
            "[نبذة مختصرة عن العضو: خلفيته، ومسيرته في ألعاب القوى، وما يقدّمه للاتحاد.]",
            "[A short biography: background, career in athletics, and what they bring to the federation.]",
          ),
      nationality: empty ? null : ph("[الجنسية]", "[Nationality]"),
      cv: {
        qualifications: full ? cvEntries(3, "مؤهل", "Qualification") : [],
        certifications: full ? cvEntries(4, "شهادة", "Certificate") : [],
        previousPositions: full ? cvEntries(2, "منصب سابق", "Previous position") : [],
        experience: full ? cvEntries(2, "خبرة", "Experience") : [],
        achievements: full ? cvEntries(3, "إنجاز", "Achievement") : [],
      },
      showPublicContact: full,
      publicContact: full ? { email: "[البريد]", phone: "[الهاتف]" } : null,
    },
    current: held.sort((a, b) => a.position.rank - b.position.rank),
    previous: closed,
    others: Object.values(PEOPLE)
      .filter((each) => each.id !== base.id)
      .slice(0, 4),
  };
};

/** Every slug the sample serves, so the routes can pre-render them. */
export const sampleCommitteeSlugs = (): readonly string[] =>
  visible.filter((each) => each.kind !== null).map((each) => each.slug);

/** Every profile slug the sample serves. */
export const samplePersonSlugs = (): readonly string[] =>
  Object.values(PEOPLE).map((each) => each.slug);
