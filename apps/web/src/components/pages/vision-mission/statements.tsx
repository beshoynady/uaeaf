import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { MEASURE } from "@/components/pages/president/president-message";
import { IdentityBand } from "@/components/ui/identity-hero";
import type { AppLocale } from "@/i18n/routing";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import type { LocalizedText, PublicImage, VisionMissionPublic } from "@/lib/api/types";

/**
 * The vision and the mission (Figma `1172:2271`, `1172:2298`): two statements
 * of one kind, printed the same way (ADR-0070 D4, as amended by ADR-0071 D7).
 *
 * - Each statement's name is its `h2`, so a reader moving by headings hears
 *   "Vision", "Mission", "Goals", "Values". The one-line statement under it
 *   takes the h2 size without the element, as the President's name does in
 *   `IdentityHero`.
 * - Its ordinal, 01 and 02, at `display-xl` in the muted text colour, and out
 *   of the accessibility tree: the name already says which statement it is,
 *   and the ordinal encodes no sequence. Its colour is the neutral tier until
 *   the item colours are decided (ADR-0071 D9).
 * - Its text keeps Chapter 4 §4.6's measure, the one the President's Message
 *   measured (§7.5-3), set at `body-lg` so its `ch` counts the text it holds.
 * - With a photograph, the statement and its picture share a row from `lg`.
 *   The picture takes 5 of the 12 columns, the cap the portrait takes beside
 *   a title (ADR-0069 D10), and the two rows alternate: the vision's picture
 *   at the end of the reading line, the mission's at its start. Its height is
 *   the statement's, cropped to cover, so no ratio is chosen for it: at its own
 *   2.29:1 it measured 528×231 beside a taller text. Below `lg` the statement
 *   comes first and its picture follows at its own ratio (Chapter 5 §5.10).
 *   The picture stands beside the words, not under them, so they read on the
 *   page's own ground with no scrim.
 * - Without one, the statement is text in one centred column. The photograph
 *   is content with a field (owner rule 2026-09-14), so an editor changes this
 *   by uploading or removing the picture, never by a setting.
 * - The band carries the identity lines between the hero and the goals
 *   (ADR-0071 D8).
 * - The ordinal, the name and the statement rise once as a block; the text
 *   under them is reading text and never moves (ADR-0069 D10).
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

const Statement = ({
  id,
  ordinal,
  label,
  title,
  titleField,
  text,
  textField,
  image,
  imageFirst,
  locale,
}: {
  id: string;
  ordinal: string;
  label: string;
  title: LocalizedText | null;
  titleField: string;
  text: LocalizedText;
  textField: string;
  image: PublicImage | null;
  /** From `lg`, the picture at the start of the reading line. */
  imageFirst: boolean;
  locale: AppLocale;
}) => (
  <section
    aria-labelledby={id}
    className={image ? "grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-6 xl:gap-8" : undefined}
  >
    <div className={`min-w-0 ${MEASURE[locale]} ${image ? "lg:col-span-7" : "mx-auto"}`}>
      <div data-reveal="">
        <span
          aria-hidden="true"
          data-numeral=""
          data-reveal-part="rise"
          className="block text-display-xl tabular-nums text-[color:var(--color-text-muted)]"
        >
          {ordinal}
        </span>
        <h2
          id={id}
          data-reveal-part="rise"
          style={revealStep(1)}
          className="mt-4 text-label font-bold text-[color:var(--color-text-secondary)]"
        >
          {label}
        </h2>
        {title ? (
          <p
            data-field={titleField}
            data-reveal-part="rise"
            style={revealStep(2)}
            className="mt-2 text-h2 text-balance text-[color:var(--color-text-primary)]"
          >
            {title[locale]}
          </p>
        ) : null}
      </div>
      <p data-field={textField} className="mt-4 text-pretty text-[color:var(--color-text-secondary)]">
        {text[locale]}
      </p>
    </div>

    {image ? (
      <div className={`lg:col-span-5 lg:self-stretch ${imageFirst ? "lg:order-first" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          srcSet={isCloudinaryUrl(image.url) ? cloudinarySrcSet(image.url, image.width) : undefined}
          // 5 of 12 columns from `lg`, the full width below it.
          sizes="(min-width: 1024px) 42vw, 100vw"
          alt={image.altText[locale]}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full rounded-[var(--radius-lg)] lg:h-full lg:object-cover"
        />
      </div>
    ) : null}
  </section>
);

export const VisionMissionStatements = async ({
  record,
  locale,
}: {
  record: VisionMissionPublic;
  locale: AppLocale;
}) => {
  const t = await getTranslations({ locale, namespace: "VisionMission" });

  return (
    <IdentityBand>
      <div className="flex flex-col gap-12 text-body-lg md:gap-16">
        <Statement
          id="vision-title"
          ordinal="01"
          label={t("vision")}
          title={record.visionTitle}
          titleField="visionTitle"
          text={record.visionText}
          textField="visionText"
          image={record.visionImage}
          imageFirst={false}
          locale={locale}
        />
        <Statement
          id="mission-title"
          ordinal="02"
          label={t("mission")}
          title={record.missionTitle}
          titleField="missionTitle"
          text={record.missionText}
          textField="missionText"
          image={record.missionImage}
          imageFirst
          locale={locale}
        />
      </div>
    </IdentityBand>
  );
};
