import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { MEASURE } from "@/components/pages/president/president-message";
import { AccentRule } from "@/components/ui/accent-rule";
import { SeamLines } from "@/components/ui/identity-hero";
import { itemInk, type ItemTone } from "@/components/ui/item-card";
import { Section } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PublicImage, VisionMissionPublic } from "@/lib/api/types";

/**
 * The vision and the mission (Figma `1172:2271`, `1172:2298`): two statements
 * of one kind, printed the same way (ADR-0072 D5, D6).
 *
 * - Each statement is a section of its own on alternating grounds, the vision
 *   on the page's base and the mission sunken, so the page's rhythm comes from
 *   the grounds rather than from panels inside them.
 * - Its name is its `h2`, marked by the accent rule, so a reader moving by
 *   headings hears "Vision", "Mission", "Goals", "Values". The one-line
 *   statement under it takes the h2 size without the element.
 * - Its ordinal, 01 and 02, at `display-2xl` in its item's ink: the two
 *   statements are a closed set, so the first takes item 1's colour and the
 *   second item 2's (ADR-0072 D1). Out of the accessibility tree: the name
 *   already says which statement it is.
 * - With a photograph, the words hold seven of the twelve columns from `lg` and
 *   the photograph the other five, cut on a slant and running to the page edge
 *   (`SlantedPhoto`). The ordinal stands between the words and the picture.
 *   The vision's picture is at the end of the reading line and the mission's at
 *   its start, so the rows alternate and mirror with the language. Below `lg`
 *   the ordinal, the words and the picture stack in that order.
 * - Without one, the statement is one centred column, and its ordinal is the
 *   section's identity element (owner decision, closing brief M1; ADR-0074 D1).
 *   The photograph is content with a field (owner rule 2026-09-14), so an
 *   editor changes this by uploading or removing the picture, never by a
 *   setting.
 * - The seam between the two is marked by their photographs meeting there on
 *   opposite sides. Where one is missing, the mission draws the identity
 *   strokes on it (`SeamLines`, page-building guide §8 rule 3), and clips
 *   sideways only, so the strokes above its top edge stay painted.
 * - The name is `body-sm`, 13px on a phone: the label role is 12px there, under
 *   Chapter 4 §4.10's minimum (owner decision, closing brief M4).
 * - The text keeps Chapter 4 §4.6's measure, the one the President's Message
 *   measured (§7.5-3). The ordinal and the name rise once as a block; the
 *   statement's own text is reading text and never moves.
 */

const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;

const Statement = ({
  id,
  ordinal,
  tone,
  ground,
  label,
  title,
  titleField,
  text,
  textField,
  image,
  imageSide,
  seam,
  locale,
}: {
  id: string;
  ordinal: string;
  tone: ItemTone;
  ground: "base" | "sunken";
  label: string;
  title: LocalizedText | null;
  titleField: string;
  text: LocalizedText;
  textField: string;
  image: PublicImage | null;
  /** From `lg`, the reading-line end the picture stands on. */
  imageSide: "start" | "end";
  /** Identity strokes on the seam with the section before. */
  seam: boolean;
  locale: AppLocale;
}) => (
  <Section
    labelledBy={id}
    ground={ground}
    enter={false}
    className={`relative isolate ${seam ? "overflow-x-clip" : "overflow-clip"} py-12 md:py-16 lg:py-24`}
  >
    {seam ? <SeamLines /> : null}
    <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
      <div
        data-reveal=""
        className={`flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8 ${
          image ? (imageSide === "start" ? "lg:col-span-7 lg:col-start-6" : "lg:col-span-7 lg:col-start-1") : "lg:justify-center"
        }`}
      >
        <span
          aria-hidden="true"
          data-numeral=""
          data-reveal-part="numeral"
          className={`shrink-0 text-display-2xl tabular-nums ${itemInk(tone)} ${image && imageSide === "end" ? "lg:order-last" : ""}`}
        >
          {ordinal}
        </span>
        <div className={`min-w-0 ${MEASURE[locale]}`}>
          <h2
            id={id}
            data-reveal-part="rise"
            style={revealStep(1)}
            className="flex items-center gap-3 text-body-sm font-bold text-[color:var(--color-text-secondary)]"
          >
            <AccentRule />
            {label}
          </h2>
          {title ? (
            <p
              data-field={titleField}
              data-reveal-part="rise"
              style={revealStep(2)}
              className="mt-3 text-h2 text-balance text-[color:var(--color-text-primary)]"
            >
              {title[locale]}
            </p>
          ) : null}
          <p data-field={textField} className="mt-4 text-body-lg text-pretty text-[color:var(--color-text-secondary)]">
            {text[locale]}
          </p>
        </div>
      </div>

      {image ? (
        <SlantedPhoto image={image} locale={locale} side={imageSide} sizes="(min-width: 1024px) 42vw, 100vw" />
      ) : null}
    </div>
  </Section>
);

export const VisionMissionStatements = async ({
  record,
  locale,
}: {
  record: VisionMissionPublic;
  locale: AppLocale;
}) => {
  const t = await getTranslations({ locale, namespace: "VisionMission" });
  const photographsMeet = Boolean(record.visionImage && record.missionImage);

  return (
    <>
      <Statement
        id="vision-title"
        ordinal="01"
        tone={1}
        ground="base"
        label={t("vision")}
        title={record.visionTitle}
        titleField="visionTitle"
        text={record.visionText}
        textField="visionText"
        image={record.visionImage}
        imageSide="end"
        seam={false}
        locale={locale}
      />
      <Statement
        id="mission-title"
        ordinal="02"
        tone={2}
        ground="sunken"
        label={t("mission")}
        title={record.missionTitle}
        titleField="missionTitle"
        text={record.missionText}
        textField="missionText"
        image={record.missionImage}
        imageSide="start"
        seam={!photographsMeet}
        locale={locale}
      />
    </>
  );
};
