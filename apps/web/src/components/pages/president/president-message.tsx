import type { CSSProperties } from "react";
import { renderBlocks } from "@/components/rich-text/rich-text";
import { Section } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { PresidentMessagePublic } from "@/lib/api/types";

/**
 * The message itself: the pull-quote, the full body and the signature, in one
 * `<article>` on the neutral band (`page-president-message.md` §7.4, ADR-0069
 * D10).
 *
 * - **Two columns from `lg`** (ADR-0072 D9, the owner's reference): the body at
 *   Chapter 4 §4.6's measure on the reading-start side, the pull-quote one column
 *   gap beside it at the same measure, under a decorative quotation mark in the
 *   accent colour, alongside every paragraph and held in
 *   view while the body scrolls. Below `lg`, one centred reading column at the
 *   measure (§7.5-3), in
 *   place of Figma's 1344px line (PM-D26). `body` type, `text-secondary`, and
 *   `space-4` between paragraphs; the bold lead-ins carry `text-primary`
 *   (PM-D13, D24, D28).
 * - **The pull-quote is editorial text**, `h3`, with a thin rule on the
 *   reading-start edge. From `md` it opens the message; on a phone it follows
 *   the first paragraph, so the first screen after the hero starts with the
 *   message rather than an excerpt of it. The DOM keeps it after the first
 *   paragraph at every width: it is a separate statement, not a repetition,
 *   and holds no control, so the reading order a screen reader follows stays
 *   the phone's. Rendered at every breakpoint (PM-D03).
 * - **The signature** takes its name and title from the record and its date
 *   from the Live publication (§7.5-4), in a `<time>`.
 *
 * Body paragraphs never move. The quote and the signature are marked for the
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

/** From `lg` the body keeps its measure and the quote takes the rest of the row.
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

const PullQuote = ({ quote, rows, locale }: { quote: string; rows: number; locale: AppLocale }) => (
  // `md:mb-2 lg:mb-4` on top of the column's `gap-4`: the quote stands 24px
  // above the body at `md` and 32px from `lg`, one step with the Speech Card's
  // padding ramp (§1.3 rule 3, PM-D22). On a phone the column's 16px holds.
  // From `lg` the figure spans every row the body's paragraphs take, so the body
  // runs on without a gap beside it.
  <figure
    data-reveal=""
    className={`relative m-0 ps-6 md:order-first md:mb-2 lg:sticky lg:top-[var(--space-32)] lg:order-none lg:col-start-2 lg:mb-0 lg:self-start lg:justify-self-start ${MEASURE[locale]}`}
    style={{ gridRow: `1 / span ${rows}` }}
  >
    <span
      aria-hidden="true"
      data-reveal-part="rule"
      className="absolute inset-y-0 start-0 w-[var(--border-width-thick)] origin-top bg-[color:var(--color-border-accent)]"
    />
    <span
      aria-hidden="true"
      data-quote-mark=""
      data-reveal-part="rise"
      className="block text-display-xl leading-none text-[color:var(--color-border-accent)]"
    >
      “
    </span>
    <blockquote data-reveal-part="rise" style={revealStep(1)} className="m-0 text-h3 text-balance text-[color:var(--color-text-primary)]">
      <p>{quote}</p>
    </blockquote>
  </figure>
);

export const PresidentMessage = ({ record, locale }: { record: PresidentMessagePublic; locale: AppLocale }) => {
  const [first, ...rest] = renderBlocks(record.messageBody[locale], locale);
  const quote = record.pullQuote?.[locale];

  return (
    <Section enter={false} className="py-12 md:py-16">
      <article className={`mx-auto ${MEASURE[locale]} text-body text-[color:var(--color-text-secondary)] lg:max-w-none`}>
        <div className={`flex flex-col gap-4 text-pretty lg:grid ${COLUMNS[locale]} lg:gap-x-16`}>
          {first}
          {quote ? <PullQuote quote={quote} rows={1 + rest.length} locale={locale} /> : null}
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
    </Section>
  );
};
