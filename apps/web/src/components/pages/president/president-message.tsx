import type { CSSProperties } from "react";
import { Surface } from "@uaeaf/brand-ui";
import { renderBlocks } from "@/components/rich-text/rich-text";
import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import type { PublicImage, PresidentMessagePublic } from "@/lib/api/types";

/**
 * The message itself: the full body, the signature, and beside them an ink
 * card carrying the president's portrait and the pull-quote, in one
 * `<article>` on the canvas (ADR-0098 D7 recipe for institutional pages).
 *
 * - **Two columns from `lg`**: the body at Chapter 4 §4.6's measure on the
 *   reading-start side, the ink card beside it and held in view while the body
 *   scrolls. Below `lg`, one reading column, with the card after the first
 *   paragraph, so the first screen after the hero starts with the message
 *   rather than an excerpt of it.
 * - **The card is an ink surface with the mesh**, as every pull-quote in the
 *   kit is. The mesh is not decoration there: ink measures 1.05:1 against the
 *   dark page ground and needs a cue that is not the ground (ADR-0098 §8.4).
 *   Its text is the surface's one white tier.
 * - **The portrait moved here from the old photographic hero.** The kit's
 *   `PageHero` is ink with no photograph, and the portrait is content with a
 *   field, so it stays on the page, beside the words it signs.
 *   A plain `<img>` rather than `SplitFeature`/`next/image`: the portrait is a
 *   remote Cloudinary asset, and the kit's image components take project
 *   assets only.
 * - **The signature** takes its name and title from the record and its date
 *   from the Live publication, in a `<time>`.
 *
 * Body paragraphs never move. The card and the signature are marked for the
 * one-shot reveal (`reveal-once.tsx`); the server HTML is complete and at rest.
 */

/**
 * Chapter 4 §4.6: 65–75 characters a line in Arabic, 75–85 in English.
 *
 * In `ch`, but not at face value: `ch` is the width of "0", and an average
 * Arabic letter in Alexandria is far narrower, so `70ch` measured 104
 * characters a line and `80ch` in IBM Plex Sans measured 105. These widths
 * are the ones that measured inside the range on the rendered page.
 */
export const MEASURE: Record<AppLocale, string> = {
  ar: "max-w-[47ch]",
  en: "max-w-[61ch]",
};

/** From `lg` the body keeps its measure and the card takes the rest of the row.
 *  Written per locale in full, so the class scanner finds each one. */
const COLUMNS: Record<AppLocale, string> = {
  ar: "lg:grid-cols-[minmax(0,47ch)_minmax(0,1fr)]",
  en: "lg:grid-cols-[minmax(0,61ch)_minmax(0,1fr)]",
};

/** The federation's own time zone, so the date a message is signed with does
 *  not depend on where the page was rendered. */
const DATE_FORMAT: Record<AppLocale, Intl.DateTimeFormat> = {
  ar: new Intl.DateTimeFormat("ar-AE", { dateStyle: "long", timeZone: "Asia/Dubai" }),
  en: new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "Asia/Dubai" }),
};

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

const Portrait = ({ image, locale }: { image: PublicImage; locale: AppLocale }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    data-portrait=""
    src={image.url}
    srcSet={isCloudinaryUrl(image.url) ? cloudinarySrcSet(image.url, image.width) : undefined}
    sizes="(min-width: 1024px) 40vw, 100vw"
    alt={image.altText[locale]}
    width={image.width}
    height={image.height}
    loading="lazy"
    decoding="async"
    className="block h-auto w-full rounded-[var(--radius-md)]"
  />
);

const QuoteCard = ({
  quote,
  portrait,
  rows,
  locale,
}: {
  quote: string | null;
  portrait: PublicImage | null;
  rows: number;
  locale: AppLocale;
}) => (
  // From `lg` the card spans every row the body's paragraphs take, so the body
  // runs on without a gap beside it.
  <div
    data-reveal=""
    className="md:order-first md:mb-2 lg:sticky lg:top-[var(--space-32)] lg:order-none lg:col-start-2 lg:mb-0 lg:self-start"
    style={{ gridRow: `1 / span ${rows}` }}
  >
    <Surface kind="ink" mesh as="figure" className="m-0 flex flex-col gap-6 overflow-clip rounded-[var(--radius-lg)] p-6 md:p-8">
      {portrait ? <Portrait image={portrait} locale={locale} /> : null}
      {quote ? (
        <blockquote data-reveal-part="rise" className="m-0 text-h3 text-balance text-[color:var(--surface-text)]">
          <p>{quote}</p>
        </blockquote>
      ) : null}
    </Surface>
  </div>
);

export const PresidentMessage = ({ record, locale }: { record: PresidentMessagePublic; locale: AppLocale }) => {
  const [first, ...rest] = renderBlocks(record.messageBody[locale], locale);
  const quote = record.pullQuote?.[locale] ?? null;
  const portrait = record.featuredImage;

  return (
    <Surface kind="canvas" mesh>
      <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
        <article className={`mx-auto ${MEASURE[locale]} text-body text-[color:var(--color-text-secondary)] lg:max-w-none`}>
          <div className={`flex flex-col gap-4 text-pretty lg:grid ${COLUMNS[locale]} lg:gap-x-16`}>
            {first}
            {quote || portrait ? (
              <QuoteCard quote={quote} portrait={portrait} rows={1 + rest.length} locale={locale} />
            ) : null}
            {rest}
          </div>

          <footer data-reveal="" className="mt-8">
            <p data-reveal-part="rise" style={revealStep(0)} className="text-h4 text-balance text-[color:var(--color-text-primary)]">
              {record.signatoryName[locale]}
            </p>
            <p data-reveal-part="rise" style={revealStep(1)} className="mt-1 text-body">
              {record.signatoryTitle[locale]}
            </p>
            {/* `body-sm`, 13px on a phone: the caption role is 12px there, under
                Chapter 4 §4.10's minimum (owner decision, closing brief M4). */}
            <p data-reveal-part="rise" style={revealStep(2)} className="mt-2 text-body-sm text-[color:var(--color-text-muted)]">
              <time dateTime={record.publishedAt}>{DATE_FORMAT[locale].format(new Date(record.publishedAt))}</time>
            </p>
          </footer>
        </article>
      </div>
    </Surface>
  );
};
