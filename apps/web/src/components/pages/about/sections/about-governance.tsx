import { Section } from "@/components/ui/section";
import { FOCUS } from "@/components/ui/interactive";
import { SectionEyebrow } from "../parts/section-eyebrow";
import { revealStep } from "@/lib/motion/reveal";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { AboutGovernanceCard, AboutPage } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";

/**
 * Scene 08 — governance and transparency.
 *
 * The three cards rise in turn, through the site's `data-reveal` system —
 * transform-only, so the statement beside them cannot be pushed around by the
 * motion, and the finished row is in the server HTML.
 *
 * The link is a `Link` from the app's own navigation, which carries the locale:
 * the API stores a path inside this site and refuses anything else, so the
 * path here is always one this router can resolve.
 */
export const AboutGovernance = ({
  governance,
  locale,
}: {
  governance: NonNullable<AboutPage["governance"]>;
  locale: AppLocale;
}) => (
  <Section
    id={sectionAnchor("governance")}
    register="neutral"
    enter={false}
    labelledBy="about-governance-title"
    className="py-16 md:py-20 lg:py-24"
  >
    <div data-reveal="" className="grid items-center gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
      <div className="flex flex-col gap-3.5">
        <SectionEyebrow data-reveal-part="rise" style={revealStep(0)}>
          {governance.eyebrow[locale]}
        </SectionEyebrow>

        <h2
          id="about-governance-title"
          data-reveal-part="rise"
          style={revealStep(1)}
          className="text-balance text-heading-md font-extrabold leading-snug"
        >
          {governance.title[locale]}
        </h2>

        <p
          data-reveal-part="rise"
          style={revealStep(2)}
          className="max-w-[60ch] text-body-lg leading-relaxed text-[color:var(--color-text-secondary)]"
        >
          {governance.description[locale]}
        </p>

        <Link
          href={governance.link.href}
          data-reveal-part="rise"
          style={revealStep(3)}
          className={`mt-2 inline-flex w-fit min-h-13 items-center rounded-[var(--radius-md)] bg-[color:var(--color-brand-primary)] px-7 text-body font-bold text-[color:var(--color-text-on-brand)] ${FOCUS}`}
        >
          {governance.link.label[locale]}
        </Link>
      </div>

      <ul className="grid list-none gap-4 sm:grid-cols-3">
        {governance.cards.map((card, index) => (
          <li key={card._id} data-reveal-part="rise" style={revealStep(4 + index)}>
            <GovernanceCard card={card} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  </Section>
);

/** Each card takes one identity colour, written out whole so Tailwind sees
 *  every class. */
const TONES = {
  green: "bg-[color-mix(in_srgb,var(--color-brand-primary)_10%,transparent)]",
  black: "bg-[color:var(--color-surface-sunken)]",
  red: "bg-[color-mix(in_srgb,var(--color-brand-secondary)_10%,transparent)]",
} as const;

const ICON_INK = {
  green: "var(--color-brand-primary)",
  black: "var(--color-text-primary)",
  red: "var(--color-brand-secondary)",
} as const;

const GovernanceCard = ({ card, locale }: { card: AboutGovernanceCard; locale: AppLocale }) => (
  <article className={`flex h-full flex-col gap-3 rounded-[var(--radius-lg)] p-6 ${TONES[card.tone]}`}>
    <ShieldIcon ink={ICON_INK[card.tone]} />
    <h3 className="text-body-lg font-extrabold leading-snug">{card.title[locale]}</h3>
    <p className="text-body leading-relaxed text-[color:var(--color-text-secondary)]">{card.text[locale]}</p>
  </article>
);

/** One mark for all three, tinted by the card's own colour: three different
 *  glyphs would imply three different kinds of thing, and these are three
 *  aspects of one. */
const ShieldIcon = ({ ink }: { ink: string }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="1.8" aria-hidden="true">
    <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
