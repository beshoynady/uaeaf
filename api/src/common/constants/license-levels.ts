/** Shared coaching/officiating license-level scale — identical closed list
 *  on `coaches.licenseLevel` and `officials.licenseLevel` on the live
 *  FigJam board, so it lives here rather than being redeclared per
 *  collection. */
export const LICENSE_LEVELS = ['Level1', 'Level2', 'Level3', 'Level4', 'International'] as const;
export type LicenseLevel = (typeof LICENSE_LEVELS)[number];
