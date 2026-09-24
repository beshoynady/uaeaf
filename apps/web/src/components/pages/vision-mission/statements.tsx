import { getTranslations } from "next-intl/server";
import { SectionHeading, Surface } from "@uaeaf/brand-ui";
import { MEASURE } from "@/components/pages/president/president-message";
import { CONTAINER } from "@/components/ui/section";
import { SlantedPhoto } from "@/components/ui/slanted-photo";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText, PublicImage, VisionMissionPublic } from "@/lib/api/types";

/**
 * The vision and the mission: two statements of one kind, printed the same
 * way, each on its own canvas surface with the mesh.
 *
 * - Its name ("Vision", "Mission") is the kit's `SectionHeading`, so a reader
 *   moving by headings hears "Vision", "Mission", "Goals", "Values", and the
 *   tricolour rule under it is the section's identity element. The one-line
 *   statement follows at the h2 size without the element.
 * - The two canvas sections read as two because each carries its own mesh:
 *   the vision's red corner ends where the mission's green corner begins.
 * - With a photograph, the words hold seven of the twelve columns from `lg`
 *   and the photograph the other five, cut on a slant and running to the page
 *   edge (`SlantedPhoto`). The vision's picture is at the end of the reading
 *   line and the mission's at its start, so the rows alternate and mirror with
 *   the language. `SplitFeature` is the kit's shape for this, but it renders
 *   through `next/image` and takes project assets only, and these photographs
 *   are stored Cloudinary assets — so the approved slanted photograph stays.
 * - Without one, the statement is one centred column. The photograph is
 *   content with a field (owner rule 2026-09-14), so an editor changes this by
 *   uploading or removing the picture, never by a setting.
 * - The text keeps Chapter 4 §4.6's measure. The statement's text is reading
 *   text and never moves.
 */

const Statement = ({
  label,
  title,
  titleField,
  text,
  textField,
  image,
  imageSide,
  locale,
}: {
  label: string;
  title: LocalizedText | null;
  titleField: string;
  text: LocalizedText;
  textField: string;
  image: PublicImage | null;
  /** From `lg`, the reading-line end the picture stands on. */
  imageSide: "start" | "end";
  locale: AppLocale;
}) => (
  // `overflow-clip` contains the photograph's bleed; the surface is already
  // positioned, which is what `SlantedPhoto` places itself against from `lg`.
  <Surface kind="canvas" mesh className="overflow-clip">
    <div className={`${CONTAINER} py-12 md:py-16 lg:py-24`}>
      <div className={image ? "grid gap-8 lg:grid-cols-12 lg:gap-x-6 xl:gap-x-8" : undefined}>
        <div
          data-reveal=""
          className={`min-w-0 ${MEASURE[locale]} ${
            image ? (imageSide === "start" ? "lg:col-span-7 lg:col-start-6" : "lg:col-span-7 lg:col-start-1") : "mx-auto"
          }`}
        >
          <SectionHeading title={label} />
          {title ? (
            <p data-field={titleField} className="text-h2 text-balance text-[color:var(--surface-text)]">
              {title[locale]}
            </p>
          ) : null}
          <p data-field={textField} className="mt-4 text-body-lg text-pretty text-[color:var(--surface-text-muted)]">
            {text[locale]}
          </p>
        </div>

        {image ? (
          <SlantedPhoto image={image} locale={locale} side={imageSide} sizes="(min-width: 1024px) 42vw, 100vw" />
        ) : null}
      </div>
    </div>
  </Surface>
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
    <>
      <Statement
        label={t("vision")}
        title={record.visionTitle}
        titleField="visionTitle"
        text={record.visionText}
        textField="visionText"
        image={record.visionImage}
        imageSide="end"
        locale={locale}
      />
      <Statement
        label={t("mission")}
        title={record.missionTitle}
        titleField="missionTitle"
        text={record.missionText}
        textField="missionText"
        image={record.missionImage}
        imageSide="start"
        locale={locale}
      />
    </>
  );
};
