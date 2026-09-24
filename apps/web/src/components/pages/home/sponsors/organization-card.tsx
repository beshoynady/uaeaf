import type { ReactNode } from "react";
import { BrandBorder, Surface, type BrandBorderTone, type BrandBorderVariant } from "@uaeaf/brand-ui";
import { BADGE, CARD } from "@/components/ui/surface";
import type { AppLocale } from "@/i18n/routing";
import type { OrganizationNamePublic, PublicImage, SponsorshipPublic } from "@/lib/api/types";
import { OrganizationLogo } from "./organization-logo";
import { OrganizationName } from "./organization-name";

/**
 * One organisation as a card: its logo on its plate and its name beneath
 * (ADR-0077 D3, ADR-0085 D5). Shared by sponsors, partners and memberships.
 *
 * Not a control, so it answers no pointer of its own: a hover response on a
 * card that does nothing when clicked is a false affordance (`surface.ts`,
 * Chapter 11). The one exception is the kit's `hover` edge on a membership
 * card, which is the identity answering attention rather than a click target
 * (ADR-0098 D5, public site only).
 *
 * The widths follow the approved row (five cards across 1312px at 1440), and
 * a list longer than a row wraps under it, centred, rather than scrolling
 * sideways behind dots (ADR-0077 D4, ADR-0085 D3 #9).
 */

/** Five across from `xl`, four at `lg`, three at `md`, two on a phone, with the
 *  row's `gap-4` taken out: the column widths of the approved row. */
export const CARD_WIDTH =
  "basis-[calc((100%_-_var(--space-4))/2)] md:basis-[calc((100%_-_2*var(--space-4))/3)] lg:basis-[calc((100%_-_3*var(--space-4))/4)] xl:basis-[calc((100%_-_4*var(--space-4))/5)]";

/**
 * Which identity edge a sponsor's card carries (ADR-0098 D5).
 *
 * The tricolour is the full identity, so it is reserved for the one tier the
 * federation names as its strategic partner; every other tier takes the single
 * green line. Decided by tier and never by the sponsor's own brand, which is
 * third-party colour the identity layer must not borrow.
 */
export const sponsorTone = (tier: SponsorshipPublic["tier"]): BrandBorderTone =>
  tier === "Strategic" ? "tricolor" : "green";

/** The card's body, laid out the same way framed or not. */
const BODY = "flex flex-col gap-3 p-4";

export const OrganizationCard = ({
  name,
  logo,
  locale,
  badges,
  details,
  frame,
}: {
  name: OrganizationNamePublic;
  logo: PublicImage | null;
  locale: AppLocale;
  /** Above the logo: a sponsor's tier and VIP mark, in words. */
  badges?: ReactNode;
  /** Under the name: a sponsor's sector line. */
  details?: ReactNode;
  /**
   * The kit's identity edge around the card. Sponsors and memberships carry
   * one; partners do not, because they stand on the green band, where every
   * edge collapses to white and a white ring around a white plate adds nothing.
   */
  frame?: { variant: BrandBorderVariant; tone: BrandBorderTone };
}) => {
  const content = (
    <>
      {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
      {/* No plate edge inside a card: the card is the object, and a bordered
          plate inside it would be a box in a box (ADR-0085 D3 #6). */}
      <OrganizationLogo logo={logo} name={name} locale={locale} size="card" decorative />
      <p className="text-center text-body-sm font-bold text-balance text-[color:var(--color-text-primary)]">
        <OrganizationName name={name} locale={locale} />
      </p>
      {details}
    </>
  );

  if (!frame) {
    return (
      // `raised` so any kit component inside reads the plate's own ink rather
      // than the band's white when the card stands on the green partners band.
      <li
        data-reveal-part="rise"
        data-surface="raised"
        className={`${BODY} min-w-0 grow-0 shrink-0 ${CARD_WIDTH} ${CARD}`}
      >
        {content}
      </li>
    );
  }

  return (
    <li data-reveal-part="rise" className={`flex min-w-0 grow-0 shrink-0 ${CARD_WIDTH}`}>
      {/* The ring replaces the card's own hairline, so the plate inside is a
          `raised` surface with no border: one edge, not two. `*:flex-1` lets
          the ring's clipping wrapper take the row's height, so a card with a
          sector line and one without still end on the same baseline. */}
      <BrandBorder variant={frame.variant} tone={frame.tone} className="flex w-full *:flex *:flex-1">
        <Surface kind="raised" as="div" className={`${BODY} flex-1 rounded-[var(--radius-md)]`}>
          {content}
        </Surface>
      </BrandBorder>
    </li>
  );
};

/** A small label in words: a tier, or the VIP mark. Never below 13px. */
export const CardBadge = ({ children, strong = false }: { children: ReactNode; strong?: boolean }) => (
  <span
    className={`${BADGE} ${
      strong
        ? "border-[color:var(--color-border-accent)] text-[color:var(--color-text-primary)]"
        : "border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)]"
    }`}
  >
    {children}
  </span>
);
