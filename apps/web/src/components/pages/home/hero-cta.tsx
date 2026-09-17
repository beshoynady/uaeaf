import type { ReactNode } from "react";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { HeroCta as HeroCtaData } from "@/lib/api/types";

/**
 * A hero slide's call to action.
 *
 * ── Which shape a button takes ────────────────────────────────────────────
 *
 * The rule is about how many are visible, not about which slot they sit in
 * (owner decision 2026-09-16): two visible give the approved composition's
 * filled button followed by a text link; **one** visible is drawn as the
 * filled button whichever of the two it is. A lone secondary rendered as a
 * quiet text link would leave the slide with no evident action at all, which
 * is the one state a hero cannot be in.
 *
 * ── Where it points ──────────────────────────────────────────────────────
 *
 * An internal path goes through next-intl's `Link`, which adds the reading
 * locale — so an editor writes `/championships` once and both languages route
 * correctly. An external link is a plain anchor opened in a new tab with
 * `rel="noopener noreferrer"`: `noopener` because a new tab otherwise gets a
 * live handle on this one, and `noreferrer` because the federation's internal
 * paths are not a third party's business.
 *
 * The API has already refused anything that is neither (`invalidCtaUrl`), so
 * this component never has to decide what an odd URL means.
 */

/** Every interaction state the contract asks for, on both variants: rest,
 *  hover, active, focus-visible, and the three that do not apply to a
 *  navigation link — disabled, loading, selected — which is why neither
 *  variant invents them. Visited is left to the browser: a hero CTA that
 *  changed colour after one visit would read as a different button. */
const SHAPE = `inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--button-radius)] px-4 py-3.5 text-body-sm font-semibold ${TRANSITION}`;

const FILLED = `${SHAPE} bg-[color:var(--button-primary-background)] text-[color:var(--button-primary-text)] hover:bg-[color:var(--button-primary-background-hover)] active:bg-[color:var(--button-primary-background-pressed)]`;

/** The quiet second action: a text link on the scrim, underlined so it is not
 *  carried by colour alone (WCAG 1.4.1) — the picture beneath it is an
 *  unknown ground and colour is the first thing it eats. */
const TEXT_LINK = `${SHAPE} px-2 text-[color:var(--color-text-on-brand)] underline underline-offset-4 decoration-[color:var(--color-text-on-brand)]/60 hover:decoration-[color:var(--color-text-on-brand)] active:opacity-80`;

const Shell = ({
  cta,
  className,
  children,
}: {
  cta: HeroCtaData;
  className: string;
  children: ReactNode;
}) =>
  // The focus ring is added where each link is drawn rather than inside the
  // recipe, so `interaction-state-contract.spec.ts` sees it at the call site —
  // the same placement `plan-buttons.ts` documents for the same reason.
  cta.isExternal ? (
    <a href={cta.url} target="_blank" rel="noopener noreferrer" className={`${className} ${FOCUS}`}>
      {children}
    </a>
  ) : (
    <Link href={cta.url} className={`${className} ${FOCUS}`}>
      {children}
    </Link>
  );

export const HeroCtaRow = ({
  primary,
  secondary,
  locale,
  externalHint,
}: {
  primary: HeroCtaData | null;
  secondary: HeroCtaData | null;
  locale: AppLocale;
  /** Read out after an external link's own words, never shown: a new tab is a
   *  change of context a sighted reader sees and a screen-reader user does
   *  not (WCAG 3.2.5). */
  externalHint: string;
}) => {
  const shown = [primary, secondary].filter((cta): cta is HeroCtaData => cta !== null);
  if (shown.length === 0) return null;

  const [first, second] = shown;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Shell cta={first} className={FILLED}>
        {first.label[locale]}
        {first.isExternal ? <span className="sr-only"> ({externalHint})</span> : null}
      </Shell>
      {second ? (
        <Shell cta={second} className={TEXT_LINK}>
          {second.label[locale]}
          {second.isExternal ? <span className="sr-only"> ({externalHint})</span> : null}
        </Shell>
      ) : null}
    </div>
  );
};
