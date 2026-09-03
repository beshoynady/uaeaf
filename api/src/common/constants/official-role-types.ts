/** Officiating role types — shared between `officials.roleType` (an
 *  official's general qualification) and `officialAssignments.role` (the
 *  specific role assigned for one match/event, independently chosen each
 *  time; confirmed 2026-09-03). Promoted here rather than duplicated, same
 *  reasoning as `RESIDENCY_TYPES`/`LICENSE_LEVELS`. */
export const OFFICIAL_ROLE_TYPES = ['Referee', 'Judge', 'Starter', 'Timekeeper', 'TechnicalDelegate', 'Other'] as const;
export type OfficialRoleType = (typeof OFFICIAL_ROLE_TYPES)[number];
