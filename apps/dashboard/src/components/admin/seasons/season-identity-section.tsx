"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { FormSection } from "@/components/ui/form-section";
import { TextField } from "@/components/auth/text-field";
import { clearOf, fieldProblem } from "./season-form-types";
import type { SeasonSectionProps } from "./season-form-types";

/**
 * 1. What the season is called — in full, in short, and at what address —
 *    and its tagline.
 *
 * The name's halves are both required (`LocalizedTextDto`). The address is set
 * once — `UpdateSeasonDto` has no `slug` — so on an existing season it is
 * shown, disabled, with the reason, rather than hidden: a missing control
 * leaves an editor hunting for it. It follows the English name until the
 * editor writes one, the album form's behaviour.
 */
export const SeasonIdentitySection = ({
  creating,
  onSlugEdited,
  ...props
}: SeasonSectionProps & {
  creating: boolean;
  onSlugEdited: () => void;
}) => {
  const t = useTranslations("Seasons");
  const { draft, set, problems, disabled } = props;

  return (
    <FormSection
      number={1}
      title={t("sectionIdentity")}
      complete={clearOf(problems, ["nameArRequired", "nameEnRequired", "slugInvalid", "shortNameRequired", "taglinePair"])}
      completeLabel={t("sectionComplete")}
    >
      <BilingualField
        id="season-name"
        labelAr={t("nameArLabel")}
        labelEn={t("nameEnLabel")}
        valueAr={draft.nameAr}
        valueEn={draft.nameEn}
        onChangeAr={(value) => set("nameAr", value)}
        onChangeEn={(value) => set("nameEn", value)}
        required
        disabled={disabled}
        error={fieldProblem(props, ["nameArRequired", "nameEnRequired"], t)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="season-short-name"
          label={t("shortNameLabel")}
          dir="ltr"
          value={draft.shortName}
          required
          disabled={disabled}
          onChange={(event) => set("shortName", event.target.value)}
          hint={t("shortNameHint")}
          error={fieldProblem(props, "shortNameRequired", t)}
        />
        <TextField
          id="season-slug"
          label={t("slugLabel")}
          dir="ltr"
          value={draft.slug}
          required={creating}
          disabled={disabled || !creating}
          onChange={(event) => {
            onSlugEdited();
            set("slug", event.target.value.trim().toLowerCase());
          }}
          hint={creating ? t("slugHint") : t("slugLockedHint")}
          error={fieldProblem(props, "slugInvalid", t)}
        />
      </div>

      <BilingualField
        id="season-tagline"
        labelAr={t("taglineArLabel")}
        labelEn={t("taglineEnLabel")}
        valueAr={draft.taglineAr}
        valueEn={draft.taglineEn}
        onChangeAr={(value) => set("taglineAr", value)}
        onChangeEn={(value) => set("taglineEn", value)}
        disabled={disabled}
        hint={t("pairHint")}
        error={fieldProblem(props, "taglinePair", t)}
      />
    </FormSection>
  );
};
