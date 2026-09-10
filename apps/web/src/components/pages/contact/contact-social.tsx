import Image from "next/image";
import { useTranslations } from "next-intl";
import { FOCUS } from "@/components/ui/interactive";
import { CARD, LIFT } from "@/components/ui/surface";
import { SOCIAL_LINKS } from "@/lib/navigation";
import type { SocialLink } from "@/lib/api/types";

/**
 * The federation's social channels, from the page's own record.
 *
 * `ContactUsPage.socialLinks` has been on the API contract since the schema
 * was written and the admin panel has always saved it; the public page read
 * it, received it, and rendered nothing. An editor could fill the field and
 * watch it disappear. This is what closes that.
 *
 * The channels come from the record rather than from `SOCIAL_LINKS`, which
 * the footer uses: that constant is site chrome and the same on every page,
 * while this is content an editor controls. What is borrowed from it is only
 * the artwork and the platform colour, keyed by name.
 *
 * Those colours are third-party brand identities, not UAEAF palette values —
 * the one place on this page where a colour outside the system is correct,
 * because a reader recognises Instagram by its gradient before reading its
 * name. ADR-0065 R2 forbids colour as decoration; this is colour as
 * identification, which is the opposite.
 */

/** Artwork and brand treatment for the platforms the design system ships,
 *  keyed by the same lowercase name the `Social` message namespace uses. */
const KNOWN = new Map(SOCIAL_LINKS.map((social) => [social.key, social]));

/** `https:` and `http:` only. The platform and the URL are both free text in
 *  the admin panel, and `javascript:` in an href is a script the page runs on
 *  click — a stored-XSS vector through a field an editor may not realise is
 *  dangerous. */
function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** The editor's word, reduced to the key the catalogues use. Free text means
 *  "Instagram", "instagram" and " Insta gram " all reach us for one channel. */
const keyOf = (platform: string) => platform.trim().toLowerCase().replace(/\s+/g, "");

export function ContactSocial({ links }: { links: readonly SocialLink[] }) {
  const t = useTranslations("Contact.social");
  const tSocial = useTranslations("Social");

  const channels = links
    .map((link) => {
      const href = safeHref(link.url);
      if (!href) return null;
      const key = keyOf(link.platform);
      const known = KNOWN.get(key);
      return {
        href,
        known,
        // A platform with no artwork is still shown, named by the word the
        // editor typed. Dropping it would repeat the very defect this
        // component exists to fix.
        name: known ? tSocial(key) : link.platform.trim(),
      };
    })
    .filter((channel): channel is NonNullable<typeof channel> => channel !== null);

  // An empty heading over an empty row is a gap in the vertical rhythm that
  // reads as a bug, so the whole section is absent rather than empty.
  if (channels.length === 0) return null;

  return (
    <section
      aria-labelledby="contact-social-heading"
      data-testid="contact-social"
      className="rise-scroll flex flex-col items-center gap-4 border-t border-[color:var(--color-border-default)] pt-10 text-center"
    >
      <h2
        id="contact-social-heading"
        className="text-h3 text-[color:var(--color-text-primary)]"
      >
        {t("title")}
      </h2>
      <p className="max-w-[52ch] text-body-sm text-[color:var(--color-text-secondary)]">
        {t("note")}
      </p>

      <ul className="flex flex-wrap items-center justify-center gap-3">
        {channels.map((channel) => (
          <li key={channel.href}>
            <a
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={channel.name}
              // 44px, not the footer's 32: that one predates the touch-target
              // gate and is its own finding. `.lift` carries the elevation and
              // the ascent-vector nudge, so hover is felt and not merely seen.
              //
              // A known channel is a square holding its artwork; an unknown
              // one is a pill that has to grow to fit a word, so it takes a
              // minimum rather than a fixed size.
              className={`${LIFT} flex items-center justify-center overflow-hidden rounded-[var(--radius-md)] ${FOCUS} ${
                channel.known
                  ? `size-11 ${channel.known.className}`
                  : `min-h-11 min-w-11 ${CARD} px-3 text-label font-bold text-[color:var(--color-text-primary)]`
              }`}
            >
              {channel.known ? (
                // X and TikTok export as complete button artwork rather than a
                // glyph, so they fill the button; the rest are glyphs on a
                // brand-coloured ground.
                <Image
                  src={channel.known.icon}
                  alt=""
                  width={channel.known.fullBleed ? 44 : 20}
                  height={channel.known.fullBleed ? 44 : 20}
                  aria-hidden="true"
                  className={channel.known.fullBleed ? "size-11 object-cover" : "size-5 object-contain"}
                />
              ) : (
                <span aria-hidden="true">{channel.name.slice(0, 2)}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
