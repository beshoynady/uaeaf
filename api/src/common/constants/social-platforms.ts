/** Closed platform list for `athleteProfiles.socialLinks` validation.
 *  Confirmed final (2026-09-03) — not a placeholder. */
export const SOCIAL_LINK_PLATFORMS = ['Facebook', 'Instagram', 'X', 'YouTube', 'TikTok'] as const;
export type SocialLinkPlatform = (typeof SOCIAL_LINK_PLATFORMS)[number];
