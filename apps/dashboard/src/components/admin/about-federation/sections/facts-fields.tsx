"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import { TextField } from "@/components/auth/text-field";
import { AboutListField } from "../about-list-field";
import { emptyText, type SectionFieldsProps } from "./section-fields";

/** The four colours a card can wear, in the order the approved row draws
 *  them. `tri` is green, black and red together on one edge. */
const FACT_TONES = ["green", "black", "red", "tri"] as const;
type FactTone = (typeof FACT_TONES)[number];

/** The approved composition stands the cards in a single row of four. The
 *  screen's copy of that number; the API has its own and refuses a fifth. */
const MAX_FACTS = 4;

/**
 * The number cards under the header: a figure printed large, a short badge
 * above it, a line under it, and the colour the card wears.
 *
 * No headings here. The approved page draws the row straight under the
 * header with nothing above it, so there is nothing to title.
 *
 * ── The figure is one string, not a pair ──────────────────────────────────
 *
 * "1974" is the same in both languages, and the page may one day print "+50",
 * so the figure is kept as text and typed once. Its direction follows what is
 * typed rather than the page's, because a figure has no language of its own.
 *
 * ── Four is a ceiling, and hidden cards count toward it ───────────────────
 *
 * The row has four places, and the API counts the whole list, hidden cards
 * included. The editor is told so beside the list rather than discovering it
 * as a refused save.
 */
export const FactsFields = ({ value, patch, disabled }: SectionFieldsProps<"facts">) => {
  const t = useTranslations("AboutFederation");
  return (
    <>
      <AboutListField
        id="about-facts-items"
        items={value.items}
        onChange={(items) => patch({ items })}
        maxItems={MAX_FACTS}
        disabled={disabled}
        labels={{
          addItem: t("facts.add"),
          removeItem: t("facts.remove"),
          removeTitle: t("facts.removeTitle"),
          removeBody: t("facts.removeBody"),
          limitReached: t("facts.limit", { max: MAX_FACTS }),
        }}
        summaryOf={(item) => ({
          lead: item.value.trim() || "—",
          title: item.label.ar || item.label.en || t("facts.untitled"),
        })}
        stateOf={(item) => (item.isVisible === false ? "hidden" : "visible")}
        makeItem={() => ({
          value: "",
          badge: emptyText(),
          label: emptyText(),
          // The first colour no card is wearing yet, so cards added one after
          // another come out as the approved row draws them rather than as
          // four green ones.
          tone: FACT_TONES.find((tone) => !value.items.some((item) => item.tone === tone)) ?? FACT_TONES[0],
          isVisible: true,
        })}
      >
        {(item, patchItem, index) => {
          const id = `about-facts-${index}`;

          return (
            <>
              <TextField
                id={`${id}-value`}
                label={t("facts.value")}
                hint={t("facts.valueHint")}
                dir="auto"
                value={item.value}
                disabled={disabled}
                required
                onChange={(event) => patchItem({ value: event.target.value })}
              />

              <BilingualField
                id={`${id}-badge`}
                labelAr={t("facts.badge")}
                labelEn={t("facts.badge")}
                valueAr={item.badge.ar}
                valueEn={item.badge.en}
                onChangeAr={(ar) => patchItem({ badge: { ...item.badge, ar } })}
                onChangeEn={(en) => patchItem({ badge: { ...item.badge, en } })}
                disabled={disabled}
                required
                hint={t("facts.badgeHint")}
              />

              <BilingualField
                id={`${id}-label`}
                labelAr={t("facts.label")}
                labelEn={t("facts.label")}
                valueAr={item.label.ar}
                valueEn={item.label.en}
                onChangeAr={(ar) => patchItem({ label: { ...item.label, ar } })}
                onChangeEn={(en) => patchItem({ label: { ...item.label, en } })}
                disabled={disabled}
                required
              />

              <SelectField
                id={`${id}-tone`}
                label={t("facts.tone")}
                hint={t("facts.toneHint")}
                value={item.tone}
                disabled={disabled}
                options={FACT_TONES.map((tone) => ({ value: tone, label: t(`facts.tones.${tone}`) }))}
                onChange={(event) => patchItem({ tone: event.target.value as FactTone })}
              />

              <SwitchField
                id={`${id}-hidden`}
                label={t("facts.hideSwitch")}
                checked={item.isVisible === false}
                disabled={disabled}
                onChange={(hide) => patchItem({ isVisible: !hide })}
              />
            </>
          );
        }}
      </AboutListField>

      {/* Mounted empty so that reaching the ceiling is announced, not only
          drawn: the region has to exist before its text changes. `sr-only`
          while empty keeps it out of the section's spacing. */}
    </>
  );
};
