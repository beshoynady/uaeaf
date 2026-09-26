"use client";

import { useTranslations } from "next-intl";
import { FOCUS_RING } from "@/components/ui/interactive";
import { BilingualField } from "@/components/admin/bilingual-field";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import { TextField } from "@/components/auth/text-field";
import { AboutListField } from "../about-list-field";
import { MediaField } from "../media-field";
import { SectionHeadings } from "./section-headings";
import { emptyText, type SectionFieldsProps } from "./section-fields";

/** The four states of "how much of this date do we actually know". */
const PRECISIONS = ["year", "monthYear", "fullDate", "unknown"] as const;
type Precision = (typeof PRECISIONS)[number];

/** Which parts each precision claims. The one place this is written on the
 *  screen side; the API has its own copy and refuses a mismatch. */
const PARTS: Record<Precision, readonly ("year" | "month" | "day")[]> = {
  year: ["year"],
  monthYear: ["year", "month"],
  fullDate: ["year", "month", "day"],
  unknown: [],
};

const CATEGORIES = [
  "association",
  "firstLeadership",
  "firstParticipation",
  "federation",
  "globalMembership",
  "continentalMembership",
] as const;

/**
 * The founding-years timeline: its three headings, and its milestones.
 *
 * ── The date is the interesting part ──────────────────────────────────────
 *
 * A milestone carries only the date parts its precision claims, and "unknown"
 * is a real answer rather than a blank one. The federation documented the
 * Basra championship but never confirmed its year, and would rather hold it
 * than print a guess — so an undated milestone is withheld from the page
 * whatever its own visibility switch says, and the editor is told that in as
 * many words, in a blue information panel rather than a red error one. Nothing
 * is wrong; something is pending.
 *
 * Choosing "unknown" disables the date inputs rather than hiding them: hidden,
 * the editor cannot see what would be asked of them if they knew.
 */
export const TimelineFields = ({
  value,
  patch,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: SectionFieldsProps<"timeline">) => {
  const t = useTranslations("AboutFederation");

  return (
    <>
      <SectionHeadings
        idPrefix="about-timeline"
        value={value}
        patch={patch}
        disabled={disabled}
        withDescription
      />

      <AboutListField
        id="about-timeline-items"
        items={value.items}
        onChange={(items) => patch({ items })}
        disabled={disabled}
        labels={{
          addItem: t("timeline.add"),
          removeItem: t("timeline.remove"),
          removeTitle: t("timeline.removeTitle"),
          removeBody: t("timeline.removeBody"),
        }}
        summaryOf={(item) => ({
          lead:
            item.datePrecision === "unknown"
              ? t("timeline.dateUnknownShort")
              : formatLead(item, locale),
          leadUnconfirmed: item.datePrecision === "unknown",
          title: item.title.ar || item.title.en || t("timeline.untitled"),
          mark: item.featured ? <FeaturedMark label={t("timeline.featured")} /> : undefined,
        })}
        stateOf={(item) =>
          item.datePrecision === "unknown" ? "autoHidden" : item.isVisible === false ? "hidden" : "visible"
        }
        makeItem={() => ({
          datePrecision: "year" as const,
          year: null,
          month: null,
          day: null,
          category: "association" as const,
          title: emptyText(),
          description: emptyText(),
          featured: false,
          imageId: null,
          isVisible: true,
        })}
      >
        {(item, patchItem, index) => {
          const precision = item.datePrecision as Precision;
          const needs = PARTS[precision];
          const id = `about-timeline-${index}`;

          return (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-label font-bold">{t("timeline.datePrecision")}</legend>
                <div
                  role="radiogroup"
                  aria-label={t("timeline.datePrecision")}
                  className="inline-flex w-fit gap-1 rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-1"
                >
                  {PRECISIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={precision === option}
                      disabled={disabled}
                      className={`h-9 rounded-[var(--radius-sm)] px-3.5 text-label font-semibold ${FOCUS_RING} ${
                        precision === option
                          ? "bg-[color:var(--color-surface-raised)] text-[color:var(--color-semantic-success-text)] shadow-sm"
                          : "text-[color:var(--color-text-secondary)]"
                      }`}
                      onClick={() => patchItem({ datePrecision: option })}
                    >
                      {t(`timeline.precision.${option}`)}
                    </button>
                  ))}
                </div>
              </fieldset>

              {precision === "unknown" ? (
                <p className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-semantic-info)_10%,transparent)] px-3.5 py-3 text-label leading-relaxed text-[color:var(--color-semantic-info-text)]">
                  <InfoIcon />
                  {t("timeline.unknownExplained")}
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  id={`${id}-year`}
                  label={t("timeline.year")}
                  type="number"
                  inputMode="numeric"
                  value={item.year ?? ""}
                  disabled={disabled || !needs.includes("year")}
                  required={needs.includes("year")}
                  onChange={(event) => patchItem({ year: numberOrNull(event.target.value) })}
                />
                <TextField
                  id={`${id}-month`}
                  label={t("timeline.month")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={12}
                  value={item.month ?? ""}
                  disabled={disabled || !needs.includes("month")}
                  required={needs.includes("month")}
                  onChange={(event) => patchItem({ month: numberOrNull(event.target.value) })}
                />
                <TextField
                  id={`${id}-day`}
                  label={t("timeline.day")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={item.day ?? ""}
                  disabled={disabled || !needs.includes("day")}
                  required={needs.includes("day")}
                  onChange={(event) => patchItem({ day: numberOrNull(event.target.value) })}
                />
              </div>

              <SelectField
                id={`${id}-category`}
                label={t("timeline.category")}
                value={item.category}
                disabled={disabled}
                options={CATEGORIES.map((category) => ({
                  value: category,
                  label: t(`timeline.categories.${category}`),
                }))}
                onChange={(event) => patchItem({ category: event.target.value as (typeof CATEGORIES)[number] })}
              />

              <BilingualField
                id={`${id}-title`}
                labelAr={t("timeline.title")}
                labelEn={t("timeline.title")}
                valueAr={item.title.ar}
                valueEn={item.title.en}
                onChangeAr={(ar) => patchItem({ title: { ...item.title, ar } })}
                onChangeEn={(en) => patchItem({ title: { ...item.title, en } })}
                disabled={disabled}
                required
              />

              <BilingualField
                id={`${id}-description`}
                labelAr={t("timeline.description")}
                labelEn={t("timeline.description")}
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
                label={t("timeline.image")}
                value={item.imageId ?? null}
                images={images}
                canReadMedia={canReadMedia}
                disabled={disabled}
                locale={locale}
                onChange={(imageId) => patchItem({ imageId })}
                onUploaded={onUploaded}
                minSourcePx={800}
              />

              <div className="flex flex-wrap gap-6">
                <SwitchField
                  id={`${id}-featured`}
                  label={t("timeline.featuredSwitch")}
                  checked={item.featured === true}
                  disabled={disabled}
                  onChange={(featured) => patchItem({ featured })}
                />
                <SwitchField
                  id={`${id}-hidden`}
                  label={t("timeline.hideSwitch")}
                  hint={precision === "unknown" ? t("timeline.hideMoot") : undefined}
                  checked={item.isVisible === false}
                  disabled={disabled}
                  onChange={(hide) => patchItem({ isVisible: !hide })}
                />
              </div>
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

/** The row's left-hand fact, in whatever precision the milestone actually
 *  claims — never padded out to a fuller date than the federation has. */
const formatLead = (
  item: { year: number | null; month: number | null; day: number | null; datePrecision: string },
  locale: string,
): string => {
  if (item.year === null) {
    return "—";
  }
  // Latin digits throughout (Chapter 19 §5): `ar` alone would reach them only
  // by the locale's default rather than by a decision.
  const year = new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: false }).format(item.year);
  if (item.datePrecision === "year" || item.month === null) {
    return year;
  }
  const month = new Intl.DateTimeFormat(locale, { month: "long", numberingSystem: "latn" }).format(
    new Date(Date.UTC(2000, item.month - 1, 1)),
  );
  return item.datePrecision === "fullDate" && item.day !== null ? `${item.day} ${month} ${year}` : `${month} ${year}`;
};

const FeaturedMark = ({ label }: { label: string }) => (
  <span className="inline-flex shrink-0 rounded-full bg-[color:var(--color-text-primary)] px-2 py-0.5 text-caption font-bold text-[color:var(--color-surface-raised)]">
    {label}
  </span>
);

const InfoIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="mt-0.5 shrink-0"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v5h1" />
  </svg>
);
