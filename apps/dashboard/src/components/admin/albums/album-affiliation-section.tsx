"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { FormSection } from "@/components/ui/form-section";
import { SelectField } from "@/components/ui/select-field";
import { PeoplePicker } from "./people-picker";
import { problemText } from "./form-types";
import {
  AFFILIATION_KEYS,
  AFFILIATION_PROBLEMS,
  PROBLEM_FIELD,
  pickerLock,
} from "@/lib/admin/albums/affiliation";
import type { AffiliationKey } from "@/lib/admin/albums/affiliation";
import type { SectionProps } from "./form-types";
import type { PersonOption } from "@/lib/admin/albums/types";

/**
 * 3. Where the album sits, and who appears in it.
 *
 * -- The four occasion pickers ------------------------------------------------
 *
 * Season, championship, competition and public event have no collections yet,
 * so each picker is drawn disabled with "available when the module is built"
 * beneath it — not hidden, because the editor should see where the album will
 * be placed once it can be.
 *
 * Their rules are already live. A picker whose parent is empty says which
 * parent it needs; a championship and a public event lock each other out; and
 * any incoherent combination (one stored before the rules, or produced by
 * clearing a parent) is named under the field that would fix it, and stops the
 * save before the API's 422 would. The day the modules land, the options
 * arrive and none of this changes.
 *
 * -- Athletes and clubs --------------------------------------------------------
 *
 * These work today, against the two public lists. They sit outside the rules
 * on purpose: they say who appears, not where the album sits.
 */

const LOCK_HINT = {
  moduleMissing: "lockModuleMissing",
  needsSeason: "lockNeedsSeason",
  needsChampionship: "lockNeedsChampionship",
  exclusiveWithPublicEvent: "lockExclusiveWithPublicEvent",
  exclusiveWithChampionship: "lockExclusiveWithChampionship",
} as const;

const LABEL: Record<AffiliationKey, string> = {
  seasonId: "seasonLabel",
  championshipId: "championshipLabel",
  competitionId: "competitionLabel",
  publicEventId: "publicEventLabel",
};

export const AlbumAffiliationSection = ({
  athletes,
  clubs,
  onAthletesChange,
  onClubsChange,
  locale,
  ...props
}: SectionProps & {
  athletes: readonly PersonOption[];
  clubs: readonly PersonOption[];
  onAthletesChange: (next: PersonOption[]) => void;
  onClubsChange: (next: PersonOption[]) => void;
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Albums");
  const { draft, set, problems } = props;
  const affiliationClear = !problems.some((problem) => (AFFILIATION_PROBLEMS as readonly string[]).includes(problem));

  const fieldProblems = (key: AffiliationKey) =>
    AFFILIATION_PROBLEMS.filter((problem) => PROBLEM_FIELD[problem] === key);

  return (
    <FormSection
      number={3}
      title={t("sectionAffiliation")}
      complete={affiliationClear && !problems.includes("championshipNamePair")}
      completeLabel={t("sectionComplete")}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {AFFILIATION_KEYS.map((key) => {
          const value = draft.affiliation[key];
          const lock = pickerLock(draft.affiliation, key);
          return (
            <SelectField
              key={key}
              id={`album-${key}`}
              label={t(LABEL[key])}
              value={value ?? ""}
              disabled={lock !== null}
              onChange={(event) =>
                set("affiliation", { ...draft.affiliation, [key]: event.target.value === "" ? null : event.target.value })
              }
              options={[
                { value: "", label: t("affiliationNone") },
                // A stored id with no collection to name it: shown as what it
                // is, so the editor can see the album is placed, and clear it.
                ...(value ? [{ value, label: t("storedId", { id: value }) }] : []),
              ]}
              hint={lock ? t(LOCK_HINT[lock]) : undefined}
              error={problemText(props, fieldProblems(key), t)}
            />
          );
        })}
      </div>

      <BilingualField
        id="album-championship-name"
        labelAr={t("championshipNameArLabel")}
        labelEn={t("championshipNameEnLabel")}
        valueAr={draft.championshipNameAr}
        valueEn={draft.championshipNameEn}
        onChangeAr={(value) => set("championshipNameAr", value)}
        onChangeEn={(value) => set("championshipNameEn", value)}
        hint={t("championshipNameHint")}
        error={problemText(props, ["championshipNamePair", "championshipNameCannotClear"], t)}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <PeoplePicker
          kind="athletes"
          label={t("athletesLabel")}
          selected={athletes}
          onChange={onAthletesChange}
          locale={locale}
        />
        <PeoplePicker kind="clubs" label={t("clubsLabel")} selected={clubs} onChange={onClubsChange} locale={locale} />
      </div>
    </FormSection>
  );
};
