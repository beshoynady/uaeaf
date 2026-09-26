import { Section } from "@/components/ui/section";
import { SectionEyebrow } from "../parts/section-eyebrow";
import { ImageSlot } from "../parts/image-slot";
import { revealStep } from "@/lib/motion/reveal";
import { RichText } from "@/lib/about/rich-text";
import type { AppLocale } from "@/i18n/routing";
import type { AboutPage } from "@/lib/about/types";
import { sectionAnchor } from "@/lib/about/types";

/**
 * Scene 03 — the story, beside the archive photograph.
 *
 * ── The motion ───────────────────────────────────────────────────────────
 *
 * The photograph is uncovered from the reading edge, the founding-document
 * card floats up a beat later, and the paragraphs rise in turn. All three are
 * the site's `data-reveal` parts — `draw` for the uncovering, `rise` for the
 * rest — so the finished composition is what the server sent and the motion is
 * a layer over it.
 *
 * ── The emphasis ─────────────────────────────────────────────────────────
 *
 * A paragraph is a plain bilingual string in which `**text**` reads as
 * emphasis. `RichText` splits it into runs and React prints each as text, so
 * nothing an editor types can become markup. That is the whole reason this
 * page has no rich-text editor.
 */
export const AboutStory = ({
  story,
  locale,
}: {
  story: NonNullable<AboutPage["story"]>;
  locale: AppLocale;
}) => (
  <Section
    id={sectionAnchor("story")}
    register="neutral"
    enter={false}
    labelledBy="about-story-title"
    className="py-16 md:py-20 lg:py-28"
  >
    <div data-reveal="" className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-[4.5rem]">
      <div className="flex flex-col gap-5">
        <SectionEyebrow data-reveal-part="rise" style={revealStep(0)}>
          {story.eyebrow[locale]}
        </SectionEyebrow>

        <h2
          id="about-story-title"
          data-reveal-part="rise"
          style={revealStep(1)}
          className="text-balance text-heading-lg font-extrabold leading-tight"
        >
          {story.title[locale]}
        </h2>

        {story.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            data-reveal-part="rise"
            style={revealStep(2 + index)}
            className="max-w-[68ch] text-body-lg leading-[1.95] text-[color:var(--color-text-secondary)]"
          >
            <RichText text={paragraph[locale]} />
          </p>
        ))}
      </div>

      <div className="relative">
        <div
          data-reveal-part="draw"
          className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] lg:mb-14 lg:ms-14"
          style={{ transformOrigin: locale === "ar" ? "right center" : "left center" }}
        >
          <ImageSlot
            image={story.image}
            locale={locale}
            tone="ink"
            sizes="(min-width: 1024px) 45vw, 100vw"
          />
        </div>

        {/* The founding document, over the photograph's lower reading corner.
            It stands in the flow below `lg`, where there is no room to overlap
            without covering the picture it is about. */}
        <article
          data-reveal-part="rise"
          style={revealStep(3)}
          className="relative mt-5 w-full max-w-[21rem] overflow-hidden rounded-[var(--radius-lg)] bg-[color:var(--color-section-black-surface)] p-6 text-[color:var(--color-section-black-text)] shadow-[var(--elevation-panel)] lg:absolute lg:bottom-0 lg:mt-0 lg:start-0"
        >
          {/* The identity rule runs from the reading edge in either language:
              green nearest the start, red at the far end. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 block h-1 from-[var(--color-brand-primary)] via-[var(--color-section-black-text)] to-[var(--color-brand-secondary)] ltr:bg-linear-to-r rtl:bg-linear-to-l"
          />
          <DocumentIcon />
          <p className="mt-3 text-label font-semibold text-[color:var(--color-section-black-text-muted)]">
            {story.docCard.label[locale]}
          </p>
          <p className="mt-1.5 text-body-lg font-extrabold leading-snug">{story.docCard.title[locale]}</p>
          <p className="mt-1.5 text-body text-[color:var(--color-section-black-text-muted)]">
            {story.docCard.date[locale]}
          </p>
        </article>
      </div>
    </div>
  </Section>
);

const DocumentIcon = () => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color-brand-primary)"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);
