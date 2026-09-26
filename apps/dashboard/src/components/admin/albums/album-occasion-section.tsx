"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { FormSection } from "@/components/ui/form-section";
import { TextField } from "@/components/auth/text-field";
import { problemText } from "./form-types";
import type { SectionProps } from "./form-types";

/**
 * 2. When and where the occasion happened.
 *
 * Both optional, and both clearable: `UpdateAlbumDto` accepts `null` for them,
 * so emptying the field on an existing album removes the value rather than
 * leaving the old one behind.
 */
export const AlbumOccasionSection = (props: SectionProps) => {
  const t = useTranslations("Albums");
  const { draft, set, problems } = props;

  return (
    <FormSection
      number={2}
      title={t("sectionOccasion")}
      complete={!problems.includes("locationPair")}
      completeLabel={t("sectionComplete")}
    >
      <div className="md:max-w-[calc(50%-0.5rem)]">
        <TextField
          id="album-event-date"
          label={t("eventDateLabel")}
          type="date"
          dir="ltr"
          value={draft.eventDate}
          onChange={(event) => set("eventDate", event.target.value)}
          hint={t("eventDateHint")}
        />
      </div>

      <BilingualField
        id="album-location"
        labelAr={t("locationArLabel")}
        labelEn={t("locationEnLabel")}
        valueAr={draft.locationAr}
        valueEn={draft.locationEn}
        onChangeAr={(value) => set("locationAr", value)}
        onChangeEn={(value) => set("locationEn", value)}
        hint={t("pairHint")}
        error={problemText(props, "locationPair", t)}
      />
    </FormSection>
  );
};
