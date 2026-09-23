import { useTranslations } from "next-intl";
import { SocialChannelLink } from "@/components/ui/social-channel-link";
import { LIFT } from "@/components/ui/surface";
import { socialChannels } from "@/lib/social-channels";
import type { ContactSocialLink, MediaAssetPublic } from "@/lib/api/types";

/**
 * The federation's social channels, from the page's own record.
 *
 * `ContactUsPage.socialLinks` has been on the API contract since the schema
 * was written and the admin panel has always saved it; the public page read
 * it, received it, and rendered nothing. An editor could fill the field and
 * watch it disappear. This is what closes that.
 *
 * The channels come from the record, the same channels the footer draws
 * (ADR-0092); `socialChannels` is where both read them. What is borrowed from
 * `SOCIAL_LINKS` is only the artwork and the platform colour, keyed by name.
 *
 * Those colours are third-party brand identities, not UAEAF palette values —
 * the one place on this page where a colour outside the system is correct,
 * because a reader recognises Instagram by its gradient before reading its
 * name. ADR-0065 R2 forbids colour as decoration; this is colour as
 * identification, which is the opposite.
 *
 * A link may carry its own icon, uploaded in the admin panel (owner request
 * 2026-09-21). When it resolves to a published image it is drawn instead of
 * the built-in artwork, as complete button artwork the way X and TikTok are,
 * on the neutral card ground an unknown channel already uses — the image may
 * be transparent, and a brand gradient would be a colour the editor did not
 * choose. When it does not resolve (hidden, deleted, or never set), the
 * built-in artwork is drawn as before, so a channel never goes blank.
 */

export const ContactSocial = ({
  links,
  icons,
}: {
  links: readonly ContactSocialLink[];
  /** The published images the links' `iconId`s resolved to, by id. */
  icons?: ReadonlyMap<string, MediaAssetPublic>;
}) => {
  const t = useTranslations("Contact.social");
  const tSocial = useTranslations("Social");

  // Which channels are safe to link, what each is called and which picture
  // it wears are decided once, for this page and the footer alike.
  const channels = socialChannels(links, icons, (key) => tSocial(key));

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
            {/* This page's own shell — `radius.md`, and `.lift` carrying the
                elevation and the ascent-vector nudge so hover is felt and not
                merely seen. The 44px target, the artwork and the
                external-link semantics are the shared component's. */}
            <SocialChannelLink
              channel={channel}
              className={`${LIFT} rounded-[var(--radius-md)]`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};
