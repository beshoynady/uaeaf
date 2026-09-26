import { Section } from "@/components/ui/section";
import { FOCUS } from "@/components/ui/interactive";
import { Link } from "@/i18n/navigation";
import { revealStep } from "@/lib/motion/reveal";
import type { AppLocale } from "@/i18n/routing";
import type { AboutPage } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";

/**
 * The closing call, on the identity's red ground.
 *
 * The one place on this page where red is the whole surface rather than an
 * accent, which is what the guide reserves it for: the moment the page asks
 * for something. Its two buttons are ordinary links, and both hrefs are paths
 * inside this site — the API refuses anything else, so the locale-aware `Link`
 * can always resolve them.
 */
export const AboutCta = ({ cta, locale }: { cta: NonNullable<AboutPage["cta"]>; locale: AppLocale }) => (
  <Section
    id={sectionAnchor("cta")}
    register="red"
    labelledBy="about-cta-title"
    enter={false}
    className="py-14 md:py-16"
  >
    <div data-reveal="" className="flex flex-wrap items-center justify-between gap-8">
      <div data-reveal-part="rise" style={revealStep(0)} className="flex max-w-[44rem] flex-col gap-2.5">
        <h2 id="about-cta-title" className="text-balance text-heading-md font-extrabold">
          {cta.title[locale]}
        </h2>
        <p className="text-body-lg leading-relaxed">{cta.description[locale]}</p>
      </div>

      <div data-reveal-part="rise" style={revealStep(1)} className="flex flex-wrap gap-3.5">
        <Link
          href={cta.primary.href}
          className={`inline-flex min-h-13 items-center rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] px-7 text-body font-bold text-[color:var(--color-text-primary)] ${FOCUS}`}
        >
          {cta.primary.label[locale]}
        </Link>

        <Link
          href={cta.secondary.href}
          className={`inline-flex min-h-13 items-center rounded-[var(--radius-md)] border-2 border-[color:var(--color-section-red-border)] px-7 text-body font-bold text-[color:var(--color-section-red-text)] ${FOCUS}`}
        >
          {cta.secondary.label[locale]}
        </Link>
      </div>
    </div>
  </Section>
);
