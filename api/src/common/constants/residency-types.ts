/** Shared Local/Guest unification — identical closed list on
 *  `athletes.residencyType` and `officials.residencyType` on the live
 *  FigJam board (confirmed 2026-09-01), so it lives here rather than being
 *  redeclared per collection or imported cross-module from one feature
 *  module into another. */
export const RESIDENCY_TYPES = ['Local', 'Guest'] as const;
export type ResidencyType = (typeof RESIDENCY_TYPES)[number];
