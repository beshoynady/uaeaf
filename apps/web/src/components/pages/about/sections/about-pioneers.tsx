import { Section } from "@/components/ui/section";
import { SectionEyebrow } from "../parts/section-eyebrow";
import { ImageSlot } from "../parts/image-slot";
import { revealStep } from "@/lib/motion/reveal";
import type { AppLocale } from "@/i18n/routing";
import type { AboutPage, AboutPioneer } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";

/**
 * Scene 06 — the founding figures.
 *
 * ── The motion ───────────────────────────────────────────────────────────
 *
 * Each portrait is uncovered from below, which is the site's `draw` reveal
 * part: a `transform` on a clipped box, so nothing about the page's height
 * depends on it and the finished composition is what the server sent.
 *
 * ── The wide card ────────────────────────────────────────────────────────
 *
 * At most one entry is the featured one, and the API is the one that enforces
 * it. Here it simply takes the wider column. Where the list has no featured
 * entry — which an editor can produce — every card is the ordinary size and
 * the grid stays even, so the section never depends on a flag being set.
 */
export const AboutPioneers = ({
  pioneers,
  locale,
}: {
  pioneers: NonNullable<AboutPage["pioneers"]>;
  locale: AppLocale;
}) => (
  <Section
    id={sectionAnchor("pioneers")}
    register="black"
    labelledBy="about-pioneers-title"
    enter={false}
    className="py-16 md:py-20 lg:py-28"
  >
    <>
      <header className="mb-11 flex flex-col gap-3.5">
        <SectionEyebrow onDark>{pioneers.eyebrow[locale]}</SectionEyebrow>
        <h2 id="about-pioneers-title" className="text-balance text-heading-lg font-extrabold">
          {pioneers.title[locale]}
        </h2>
      </header>

      <ul
        data-reveal=""
        className="grid list-none gap-6 lg:grid-cols-[1.5fr_1fr]"
      >
        {pioneers.items.map((person, index) => (
          <li
            key={person._id}
            data-reveal-part="rise"
            style={revealStep(index)}
          >
            <PersonCard person={person} locale={locale} />
          </li>
        ))}
      </ul>
    </>
  </Section>
);

const PersonCard = ({ person, locale }: { person: AboutPioneer; locale: AppLocale }) => (
  <article
    className={`flex h-full overflow-hidden rounded-[var(--radius-xl)] border-2 border-[color:var(--color-section-black-border)] ${
      person.featured ? "flex-col sm:flex-row" : "flex-col"
    }`}
  >
    <div
      className={`relative overflow-hidden ${
        person.featured ? "aspect-[4/3] sm:aspect-auto sm:w-[18.75rem] sm:shrink-0" : "aspect-[16/10]"
      }`}
    >
      {/* The portrait is uncovered from its lower edge, the way a photograph
          is lifted out of an archive box. */}
      <span data-reveal-part="draw" className="absolute inset-0 origin-bottom">
        <ImageSlot
          image={person.image}
          locale={locale}
          tone={person.featured ? "green" : "red"}
          sizes={person.featured ? "(min-width: 1024px) 19rem, 100vw" : "(min-width: 1024px) 28rem, 100vw"}
        />
      </span>
    </div>

    <div className="flex grow flex-col justify-center gap-3 p-7">
      <span
        className={`w-fit rounded-full px-3 py-1 text-label font-bold ${
          person.featured
            ? "bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]"
            : "bg-[color:var(--color-brand-secondary)] text-[color:var(--color-text-on-brand)]"
        }`}
      >
        {person.badge[locale]}
      </span>

      <h3 className={person.featured ? "text-heading-sm font-extrabold" : "text-body-lg font-extrabold"}>
        {person.name[locale]}
      </h3>

      <p className="text-body leading-relaxed text-[color:var(--color-section-black-text-muted)]">
        {person.description[locale]}
      </p>
    </div>
  </article>
);
