"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { FormSection } from "@/components/ui/form-section";
import { TextField } from "@/components/auth/text-field";
import { problemText } from "./form-types";
import type { SectionProps } from "./form-types";

/**
 * 1. What the album is called and what it is about, in both languages, and
 *    its address.
 *
 * Both title halves are required: the API's `LocalizedTextDto` refuses an
 * empty half, and the public gallery is read in both languages. The address is
 * set once — `UpdateAlbumDto` has no `slug` — so on an existing album it is
 * shown, disabled, with the reason, rather than hidden: a missing control
 * leaves an editor hunting for it.
 */
export const AlbumBasicsSection = ({
  creating,
  onSlugEdited,
  ...props
}: SectionProps & {
  creating: boolean;
  /** The first time the editor types an address themselves, the title stops
   *  suggesting one — their address is theirs. */
  onSlugEdited: () => void;
}) => {
  const t = useTranslations("Albums");
  const { draft, set, problems } = props;
  const complete =
    draft.titleAr.trim() !== "" &&
    draft.titleEn.trim() !== "" &&
    !problems.some((problem) => ["slugInvalid", "descriptionPair", "descriptionCannotClear"].includes(problem));

  return (
    <FormSection number={1} title={t("sectionBasics")} complete={complete} completeLabel={t("sectionComplete")}>
      <BilingualField
        id="album-title"
        labelAr={t("titleArLabel")}
        labelEn={t("titleEnLabel")}
        valueAr={draft.titleAr}
        valueEn={draft.titleEn}
        onChangeAr={(value) => set("titleAr", value)}
        onChangeEn={(value) => set("titleEn", value)}
        required
        error={problemText(props, ["titleArRequired", "titleEnRequired"], t)}
      />

      <TextField
        id="album-slug"
        label={t("slugLabel")}
        dir="ltr"
        value={draft.slug}
        required={creating}
        disabled={!creating}
        onChange={(event) => {
          onSlugEdited();
          set("slug", event.target.value.trim().toLowerCase());
        }}
        hint={creating ? t("slugHint") : t("slugLockedHint")}
        error={problemText(props, "slugInvalid", t)}
      />

      <BilingualField
        id="album-description"
        labelAr={t("descriptionArLabel")}
        labelEn={t("descriptionEnLabel")}
        valueAr={draft.descriptionAr}
        valueEn={draft.descriptionEn}
        onChangeAr={(value) => set("descriptionAr", value)}
        onChangeEn={(value) => set("descriptionEn", value)}
        multiline
        hint={t("pairHint")}
        error={problemText(props, ["descriptionPair", "descriptionCannotClear"], t)}
      />
    </FormSection>
  );
};
