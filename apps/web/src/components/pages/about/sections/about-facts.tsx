import { Section } from "@/components/ui/section";
import { CARD } from "@/components/ui/surface";
import { revealStep } from "@/lib/motion/reveal";
import type { AppLocale } from "@/i18n/routing";
import type { AboutFact, AboutPage } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";
import { CountUp } from "../parts/count-up";

/**
 * Scene 02 — the key numbers.
 *
 * ── The motion ───────────────────────────────────────────────────────────
 *
 * The cards rise one after another, and the years count to themselves once.
 * The rise is the site's own `data-reveal` system rather than a script: it is
 * transform-only and driven by CSS, so the finished row is in the server HTML
 * and a crawler, a printed page or a reader arriving by anchor sees it whole.
 * `revealStep` sets each card's place in the sequence.
 *
 * The stagger counts the cards that are actually here. The API has already
 * removed any the editor hid, so the second card is the second card, not the
 * second of a list with a gap in it.
 *
 * ── The numbers ──────────────────────────────────────────────────────────
 *
 * `value` is stored as text, because the federation prints "1974" today and
 * may print "+50" later. So it counts only when it reads as a whole number,
 * and otherwise stands as written — a rule the page can apply without an
 * editor having to declare which kind of value they typed.
 */
export const AboutFacts = ({
  facts,
  locale,
}: {
  facts: NonNullable<AboutPage["facts"]>;
  locale: AppLocale;
}) => {
  return (
    <Section id={sectionAnchor("facts")} register="neutral" enter={false} className="py-12 md:py-16 lg:py-20">
      <ul data-reveal="" className="grid list-none grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {facts.items.map((fact, index) => (
          <li key={fact._id} data-reveal-part="rise" style={revealStep(index)}>
            <FactCard fact={fact} locale={locale} />
          </li>
        ))}
      </ul>
    </Section>
  );
};

/** The identity colour each card's edge takes, and the ink its figure takes.
 *  They are not the same value: the identity colours are theme-immutable and
 *  so cannot carry text (ADR-0063 D1), which is why the card wears its colour
 *  on the border and the badge while the figure takes a role that answers to
 *  the ground. Written out whole so Tailwind can see every class. */
const TONES = {
  green: { edge: "border-[color:var(--color-brand-primary)]", ink: "text-[color:var(--color-text-link)]" },
  black: { edge: "border-[color:var(--color-text-primary)]", ink: "text-[color:var(--color-text-primary)]" },
  red: { edge: "border-[color:var(--color-brand-secondary)]", ink: "text-[color:var(--color-text-primary)]" },
  tri: { edge: "border-transparent", ink: "text-[color:var(--color-text-link)]" },
} as const;

const FactCard = ({ fact, locale }: { fact: AboutFact; locale: AppLocale }) => {
  const tone = TONES[fact.tone];
  const numeric = /^\d+$/.test(fact.value.trim()) ? Number(fact.value.trim()) : null;

  return (
    <article
      className={`${CARD} flex h-full min-h-[11rem] flex-col justify-between gap-6 border-2 p-6 ${tone.edge}`}
      // The three-colour card carries its edge as a gradient, which a border
      // colour cannot express.
      style={
        fact.tone === "tri"
          ? {
              borderImage:
                "linear-gradient(135deg, var(--color-brand-primary) 0 26%, var(--color-text-primary) 44% 56%, var(--color-brand-secondary) 74% 100%) 1",
            }
          : undefined
      }
    >
      <span className="w-fit rounded-full bg-[color:var(--color-surface-sunken)] px-3 py-1 text-label font-bold text-[color:var(--color-text-secondary)]">
        {fact.badge[locale]}
      </span>

      <div>
        <p className={`text-[clamp(2.5rem,5vw,3.75rem)] font-black leading-none tracking-tight ${tone.ink}`}>
          {numeric === null ? (
            fact.value
          ) : (
            <CountUp value={numeric} locale={locale} grouping={false} />
          )}
        </p>
        <p className="mt-2.5 text-body font-semibold text-[color:var(--color-text-primary)]">{fact.label[locale]}</p>
      </div>
    </article>
  );
};
