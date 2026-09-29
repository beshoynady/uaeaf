"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { FormSection } from "@/components/ui/form-section";
import { clearOf, fieldProblem } from "./season-form-types";
import type { SeasonSectionProps } from "./season-form-types";

/**
 * 5. What the season is about, and — once it is over — how it closed.
 *
 * The closing summary is always editable here, whatever the season's dates
 * (spec §6.2 item 5): the public page shows it only after the season ends,
 * which is a display rule, not an input rule. Writing it early is how it is
 * ready on the day.
 */
export const SeasonAboutSection = (props: SeasonSectionProps) => {
  const t = useTranslations("Seasons");
  const { draft, set, problems, disabled } = props;

  return (
    <FormSection
      number={5}
      title={t("sectionAbout")}
      complete={clearOf(problems, ["aboutArRequired", "aboutEnRequired", "closingSummaryPair"])}
      completeLabel={t("sectionComplete")}
    >
      <BilingualField
        id="season-about"
        labelAr={t("aboutArLabel")}
        labelEn={t("aboutEnLabel")}
        valueAr={draft.aboutAr}
        valueEn={draft.aboutEn}
        onChangeAr={(value) => set("aboutAr", value)}
        onChangeEn={(value) => set("aboutEn", value)}
        multiline
        required
        disabled={disabled}
        error={fieldProblem(props, ["aboutArRequired", "aboutEnRequired"], t)}
      />

      <BilingualField
        id="season-closing"
        labelAr={t("closingArLabel")}
        labelEn={t("closingEnLabel")}
        valueAr={draft.closingAr}
        valueEn={draft.closingEn}
        onChangeAr={(value) => set("closingAr", value)}
        onChangeEn={(value) => set("closingEn", value)}
        multiline
        disabled={disabled}
        hint={t("closingHint")}
        error={fieldProblem(props, "closingSummaryPair", t)}
      />
    </FormSection>
  );
};
