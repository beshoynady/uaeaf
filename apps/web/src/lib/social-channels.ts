import { SOCIAL_LINKS, type SocialLink } from "@/lib/navigation";
import type { ContactSocialLink, MediaAssetPublic } from "@/lib/api/types";

/**
 * The federation's channels, from the contact page's record, as a page can
 * draw them. The contact page and the footer both read the channels here
 * (ADR-0092), so they cannot disagree on which destinations are safe, what a
 * channel is called, or which picture it wears.
 *
 * `SOCIAL_LINKS` supplies only the artwork and the platform colour, keyed by
 * name; the channels themselves are content an editor controls.
 */

export interface SocialChannel {
  href: string;
  /** The accessible name: the platform in the reading language, or the
   *  editor's own word for a platform the site has no artwork for. */
  name: string;
  /** The site's built-in artwork and brand treatment, when it has one. */
  known?: SocialLink;
  /** The image the editor uploaded for this channel, when it is published. */
  icon?: MediaAssetPublic;
}

/** Artwork and brand treatment for the platforms the design system ships,
 *  keyed by the same lowercase name the `Social` message namespace uses. */
const KNOWN = new Map(SOCIAL_LINKS.map((social) => [social.key, social]));

/** `https:` and `http:` only. The platform and the URL are both free text in
 *  the admin panel, and `javascript:` in an href is a script the page runs on
 *  click — a stored-XSS vector through a field an editor may not realise is
 *  dangerous. */
const safeHref = (url: string): string | null => {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
};

/** The editor's word, reduced to the key the catalogues use. Free text means
 *  "Instagram", "instagram" and " Insta gram " all reach us for one channel. */
const keyOf = (platform: string) => platform.trim().toLowerCase().replace(/\s+/g, "");

/**
 * @param nameOf the `Social` catalogue's name for a known platform's key.
 */
export const socialChannels = (
  links: readonly ContactSocialLink[],
  icons: ReadonlyMap<string, MediaAssetPublic> | undefined,
  nameOf: (key: string) => string,
): SocialChannel[] =>
  links
    .map((link) => {
      const href = safeHref(link.url);
      if (!href) return null;
      const key = keyOf(link.platform);
      const known = KNOWN.get(key);
      return {
        href,
        known,
        icon: link.iconId ? icons?.get(link.iconId) : undefined,
        // A platform with no artwork is still shown, named by the word the
        // editor typed. Dropping it would hide something saved in the panel.
        name: known ? nameOf(key) : link.platform.trim(),
      };
    })
    .filter((channel): channel is NonNullable<typeof channel> => channel !== null);
