import { fetchPublic } from "@/lib/api/public-client";
import { fetchPublicMedia } from "@/lib/api/media";
import { findPublicPage } from "@/lib/pages/public-pages";
import type { ContactSocialLink, ContactUsPage, MediaAssetPublic } from "@/lib/api/types";

/**
 * The federation's channels and their artwork, read once.
 *
 * The contact page's record is the one source for them (ADR-0092), and three
 * surfaces now draw them: the footer on every page, the contact page itself,
 * and the newsroom's sidebar. This is where all three read, so a channel an
 * editor adds appears in all three or in none — never in two of them.
 */
export interface SocialContent {
  channels: readonly ContactSocialLink[];
  /** The published images the channels' `iconId`s resolved to, by id. */
  icons: ReadonlyMap<string, MediaAssetPublic>;
}

export const loadSocialChannels = async (): Promise<SocialContent> => {
  const contact = await fetchPublic<ContactUsPage>(findPublicPage("contact-us")!.apiPath);
  const channels = contact?.socialLinks ?? [];

  return {
    channels,
    // No request at all when no channel carries an icon.
    icons: await fetchPublicMedia(channels.map((link) => link.iconId)),
  };
};
