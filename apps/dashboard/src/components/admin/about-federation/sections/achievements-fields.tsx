"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import { TextField } from "@/components/auth/text-field";
import type { LocalizedText } from "@/lib/api/types";
import { AboutListField } from "../about-list-field";
import { MediaField } from "../media-field";
import { SectionHeadings } from "./section-headings";
import { emptyText, type SectionFieldsProps } from "./section-fields";

/** The four medals a card can carry. The screen's copy; the API has its own
 *  and refuses any other value. */
const MEDAL_KINDS = ["gold", "silver", "bronze", "other"] as const;
type MedalKind = (typeof MEDAL_KINDS)[number];

/** The years the API accepts for an achievement. Stated on the input too, so
 *  the browser can say so before a refused save does. */
const YEAR_MIN = 1900;
const YEAR_MAX = 2200;

/**
 * The golden moments: the section's three headings, and its achievement cards.
 *
 * ── The medal is a kind, and sometimes a label ────────────────────────────
 *
 * Each card carries one of four medal kinds, and the page prints that kind's
 * own name on the badge. A haul the four cannot name — "5 golds" at one
 * championship — is written as a label that replaces it. The label is
 * optional, and once both of its halves are blank it is stored as null rather
 * than as an empty pair: null is what the page reads as "print the kind's
 * name", and the API would refuse a written label with nothing in it.
 *
 * The year and the medal share a row because the card prints them on one line.
 *
 * ── The athlete link is not edited here ───────────────────────────────────
 *
 * A card may point at the athlete's own record. This dashboard has no athlete
 * picker, so the link is neither shown nor changed on this screen: a stored
 * link travels through the draft untouched, and a new card starts without one.
 * The card's own words are the editorial content either way.
 */
export const AchievementsFields = ({
  value,
  patch,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: SectionFieldsProps<"achievements">) => {
  const t = useTranslations("AboutFederation");

  return (
    <>
      <SectionHeadings
        idPrefix="about-achievements"
        value={value}
        patch={patch}
        disabled={disabled}
        withDescription
      />

      <AboutListField
        id="about-achievements-items"
        items={value.items}
        onChange={(items) => patch({ items })}
        disabled={disabled}
        labels={{
          addItem: t("achievements.add"),
          removeItem: t("achievements.remove"),
          removeTitle: t("achievements.removeTitle"),
          removeBody: t("achievements.removeBody"),
        }}
        summaryOf={(item) => ({
          lead: formatYear(item.year, locale),
          title: item.title.ar || item.title.en || t("achievements.untitled"),
        })}
        stateOf={(item) => (item.isVisible === false ? "hidden" : "visible")}
        makeItem={() => ({
          // No year until one is typed: a year filled in for the editor is a
          // fact nobody checked, and it would print as readily as a real one.
          year: null,
          place: emptyText(),
          // A select has to stand on something; the first kind, as the
          // timeline starts on its first category.
          medalKind: MEDAL_KINDS[0],
          medalLabel: null,
          title: emptyText(),
          description: emptyText(),
          athleteId: null,
          imageId: null,
          isVisible: true,
        })}
      >
        {(item, patchItem, index) => {
          const id = `about-achievements-${index}`;
          const label = item.medalLabel ?? emptyText();

          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id={`${id}-year`}
                  label={t("achievements.year")}
                  type="number"
                  inputMode="numeric"
                  min={YEAR_MIN}
                  max={YEAR_MAX}
                  value={item.year ?? ""}
                  disabled={disabled}
                  required
                  onChange={(event) => patchItem({ year: numberOrNull(event.target.value) })}
                />
                <SelectField
                  id={`${id}-medal`}
                  label={t("achievements.medalKind")}
                  value={item.medalKind}
                  disabled={disabled}
                  required
                  options={MEDAL_KINDS.map((kind) => ({
                    value: kind,
                    label: t(`achievements.medalKinds.${kind}`),
                  }))}
                  onChange={(event) => patchItem({ medalKind: event.target.value as MedalKind })}
                />
              </div>

              <BilingualField
                id={`${id}-medal-label`}
                labelAr={t("achievements.medalLabel")}
                labelEn={t("achievements.medalLabel")}
                valueAr={label.ar}
                valueEn={label.en}
                onChangeAr={(ar) => patchItem({ medalLabel: labelOrNull({ ...label, ar }) })}
                onChangeEn={(en) => patchItem({ medalLabel: labelOrNull({ ...label, en }) })}
                disabled={disabled}
                hint={t("achievements.medalLabelHint")}
              />

              <BilingualField
                id={`${id}-place`}
                labelAr={t("achievements.place")}
                labelEn={t("achievements.place")}
                valueAr={item.place.ar}
                valueEn={item.place.en}
                onChangeAr={(ar) => patchItem({ place: { ...item.place, ar } })}
                onChangeEn={(en) => patchItem({ place: { ...item.place, en } })}
                disabled={disabled}
                required
                hint={t("achievements.placeHint")}
              />

              <BilingualField
                id={`${id}-title`}
                labelAr={t("achievements.title")}
                labelEn={t("achievements.title")}
                valueAr={item.title.ar}
                valueEn={item.title.en}
                onChangeAr={(ar) => patchItem({ title: { ...item.title, ar } })}
                onChangeEn={(en) => patchItem({ title: { ...item.title, en } })}
                disabled={disabled}
                required
              />

              <BilingualField
                id={`${id}-description`}
                labelAr={t("achievements.description")}
                labelEn={t("achievements.description")}
                valueAr={item.description.ar}
                valueEn={item.description.en}
                onChangeAr={(ar) => patchItem({ description: { ...item.description, ar } })}
                onChangeEn={(en) => patchItem({ description: { ...item.description, en } })}
                disabled={disabled}
                required
                multiline
                hint={t("emphasisHint")}
              />

              <MediaField
                id={`${id}-image`}
                label={t("achievements.image")}
                value={item.imageId ?? null}
                images={images}
                canReadMedia={canReadMedia}
                disabled={disabled}
                locale={locale}
                onChange={(imageId) => patchItem({ imageId })}
                onUploaded={onUploaded}
                minSourcePx={800}
              />

              <SwitchField
                id={`${id}-hidden`}
                label={t("achievements.hideSwitch")}
                checked={item.isVisible === false}
                disabled={disabled}
                onChange={(hide) => patchItem({ isVisible: !hide })}
              />
            </>
          );
        }}
      </AboutListField>
    </>
  );
};

const numberOrNull = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Blank on both sides is no label at all. Blank is judged after trimming,
 *  the same way the readiness panel judges a half-written pair. */
const labelOrNull = (label: LocalizedText): LocalizedText | null =>
  label.ar.trim() === "" && label.en.trim() === "" ? null : label;

/** The row's left-hand fact. Latin digits throughout (Chapter 19 §5): `ar`
 *  alone would reach them only by the locale's default rather than by a
 *  decision. */
const formatYear = (year: number | null | undefined, locale: string): string =>
  typeof year === "number"
    ? new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: false }).format(year)
    : "—";
