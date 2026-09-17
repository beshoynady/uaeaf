import type { ReactNode } from "react";
import { CARD } from "@/components/ui/surface";
import type { AppLocale } from "@/i18n/routing";
import type { OrganizationNamePublic, PublicImage } from "@/lib/api/types";
import { OrganizationLogo } from "./organization-logo";
import { OrganizationName } from "./organization-name";

/**
 * One organisation as a card: its logo on its plate and its name beneath
 * (ADR-0077 D3, ADR-0085 D5). Shared by sponsors, partners and memberships.
 *
 * Not a control, so it answers no pointer: a hover response on a card that
 * does nothing when clicked is a false affordance (`surface.ts`, Chapter 11).
 * The Figma hover frame on the memberships row is not built for that reason.
 *
 * The widths follow the approved row (five cards across 1312px at 1440), and
 * a list longer than a row wraps under it, centred, rather than scrolling
 * sideways behind dots (ADR-0077 D4, ADR-0085 D3 #9).
 */

/** Five across from `xl`, four at `lg`, three at `md`, two on a phone, with the
 *  row's `gap-4` taken out: the column widths of the approved row. */
export const CARD_WIDTH =
  "basis-[calc((100%_-_var(--space-4))/2)] md:basis-[calc((100%_-_2*var(--space-4))/3)] lg:basis-[calc((100%_-_3*var(--space-4))/4)] xl:basis-[calc((100%_-_4*var(--space-4))/5)]";

/** `CARD` with its edge in the accent at 2px (`--border-width-thick`), written
 *  out rather than layered on `CARD`: two border utilities on one element
 *  resolve by stylesheet order, not by the order written here. */
const CARD_EMPHASIS =
  "rounded-[var(--radius-md)] border-2 border-[color:var(--color-border-accent)] bg-[color:var(--color-surface-raised)] shadow-[var(--elevation-card)]";

export const OrganizationCard = ({
  name,
  logo,
  locale,
  badges,
  details,
  emphasis = false,
}: {
  name: OrganizationNamePublic;
  logo: PublicImage | null;
  locale: AppLocale;
  /** Above the logo: a sponsor's tier and VIP mark, in words. */
  badges?: ReactNode;
  /** Under the name: a sponsor's sector line. */
  details?: ReactNode;
  /** A VIP sponsor: the accent edge, beside the word that says so. */
  emphasis?: boolean;
}) => (
  <li
    data-reveal-part="rise"
    className={`flex min-w-0 grow-0 shrink-0 flex-col gap-3 p-4 ${CARD_WIDTH} ${emphasis ? CARD_EMPHASIS : CARD}`}
  >
    {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
    {/* No plate edge inside a card: the card is the object, and a bordered
        plate inside it would be a box in a box (ADR-0085 D3 #6). */}
    <OrganizationLogo logo={logo} name={name} locale={locale} size="card" decorative />
    <p className="text-center text-body-sm font-bold text-balance text-[color:var(--color-text-primary)]">
      <OrganizationName name={name} locale={locale} />
    </p>
    {details}
  </li>
);

/** A small label in words: a tier, or the VIP mark. Never below 13px. */
export const CardBadge = ({ children, strong = false }: { children: ReactNode; strong?: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-body-sm font-semibold ${
      strong
        ? "border-[color:var(--color-border-accent)] text-[color:var(--color-text-primary)]"
        : "border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)]"
    }`}
  >
    {children}
  </span>
);
