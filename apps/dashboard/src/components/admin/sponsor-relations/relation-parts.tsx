"use client";

import { useTranslations } from "next-intl";
import { displayName, type ContentLocale } from "@uaeaf/content/sponsors";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { SELECTABLE_ROW } from "@/components/ui/interactive";
import { SelectedMark } from "@/components/ui/selected-mark";
import type { FieldError } from "@/lib/admin/sponsor-relations/organizations";

/**
 * The pieces the sponsors, partners and memberships screens share: a name shown
 * with the site's rule, the demo and visibility marks, the logo on its plate,
 * the ordered list of records, and the two single-language name fields.
 */

/** Chapter 4 §4.3's family for a text's own language, as the site sets it. */
const FONT_FOR: Record<ContentLocale, string> = { ar: "font-arabic", en: "font-latin" };

const graphemes = (text: string): number => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.trim())].length;

/** The site's naming rule (ADR-0085 D4): the page's language when the
 *  organisation has a name in it, otherwise its other name, isolated and
 *  declared. `null` when it has neither. */
export const NameText = ({ ar, en, locale, className }: { ar: string; en: string; locale: ContentLocale; className?: string }) => {
  const shown = displayName({ ar, en }, locale);
  if (!shown) return null;
  return shown.isForeign ? (
    <bdi lang={shown.lang} className={`${FONT_FOR[shown.lang]}${className ? ` ${className}` : ""}`}>
      {shown.text}
    </bdi>
  ) : (
    <span className={className}>{shown.text}</span>
  );
};

/** A plain-text label for a record, for summaries and accessible names. */
export const nameLabel = (ar: string, en: string, locale: ContentLocale): string | null => displayName({ ar, en }, locale)?.text ?? null;

const BADGE = "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-caption font-medium";

/** A fictional seed record (ADR-0085 D2.1): never shown in production. */
export const DemoBadge = () => {
  const t = useTranslations("SponsorRelations");
  return <span className={`${BADGE} border-[color:var(--color-semantic-warning)] text-[color:var(--color-semantic-warning-text)]`}>{t("demoBadge")}</span>;
};

export const VisibilityBadge = ({ visible }: { visible: boolean }) => {
  const t = useTranslations("SponsorRelations");
  return (
    <span className="inline-flex items-center gap-1.5 text-caption text-[color:var(--color-text-secondary)]">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${visible ? "bg-[color:var(--color-semantic-success)]" : "border-2 border-[color:var(--color-border-strong)]"}`}
      />
      {visible ? t("shownBadge") : t("hiddenBadge")}
    </span>
  );
};

const PLATE_SIZE = { list: "h-10 w-16 p-1", card: "h-20 w-full p-3" } as const;

/** A logo on the site's plate (ADR-0085 D6.1), whole and never cropped. */
export const LogoPlate = ({ url, size }: { url: string | null; size: keyof typeof PLATE_SIZE }) =>
  url ? (
    <span className={`flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-logo-plate)] ${PLATE_SIZE[size]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a library picture, the same element MediaPicker uses. */}
      <img src={url} alt="" className="size-full object-contain" />
    </span>
  ) : null;

export interface ListRecord {
  key: string;
  ar: string;
  en: string;
  logoUrl: string | null;
  isDemo: boolean;
  isVisible: boolean;
  /** A second line under the name, when the screen has one. */
  meta?: string;
}

const Chevron = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className={`size-4 fill-current ${up ? "-rotate-90" : "rotate-90"}`}>
    <path d="M6 3l5 5-5 5-1.4-1.4L8.2 8 4.6 4.4z" />
  </svg>
);

/** The records in the site's order: choosing one opens it, and each moves one
 *  place at a time with a named button. */
export const RecordList = ({
  label,
  records,
  selectedKey,
  locale,
  onSelect,
  onMove,
  addLabel,
  onAdd,
  empty,
}: {
  label: string;
  records: readonly ListRecord[];
  selectedKey: string | null;
  locale: ContentLocale;
  onSelect: (key: string) => void;
  onMove: (key: string, delta: -1 | 1) => void;
  addLabel: string;
  onAdd: () => void;
  empty: string;
}) => {
  const t = useTranslations("SponsorRelations");
  return (
    <div className="flex flex-col gap-3">
      {records.length === 0 ? <p className="text-body-sm text-[color:var(--color-text-secondary)]">{empty}</p> : null}
      <ol aria-label={label} className="flex flex-col gap-2">
        {records.map((record, at) => {
          const name = nameLabel(record.ar, record.en, locale) ?? t("untitled");
          return (
            <li key={record.key} className="flex items-stretch gap-1">
              {/* The selected row carries a static tricolour edge and a check
                  (Chapter 12 §12.15.1) — never the green border alone. */}
              <span className="relative flex min-w-0 flex-1">
              <button type="button" aria-current={record.key === selectedKey} onClick={() => onSelect(record.key)} className={`${SELECTABLE_ROW} flex min-w-0 flex-1 items-center gap-3`}>
                <LogoPlate url={record.logoUrl} size="list" />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-label font-medium text-[color:var(--color-text-primary)]">
                    {nameLabel(record.ar, record.en, locale) ? <NameText ar={record.ar} en={record.en} locale={locale} /> : t("untitled")}
                  </span>
                  {record.meta ? <span className="text-caption text-[color:var(--color-text-secondary)]">{record.meta}</span> : null}
                  <span className="flex flex-wrap items-center gap-2">
                    <VisibilityBadge visible={record.isVisible} />
                    {record.isDemo ? <DemoBadge /> : null}
                  </span>
                </span>
              </button>
              {record.key === selectedKey ? <SelectedMark radius="md" /> : null}
              </span>
              <span className="flex flex-col justify-center">
                <Button variant="icon" aria-label={`${t("moveUp")}: ${name}`} disabled={at === 0} onClick={() => onMove(record.key, -1)}>
                  <Chevron up />
                </Button>
                <Button variant="icon" aria-label={`${t("moveDown")}: ${name}`} disabled={at === records.length - 1} onClick={() => onMove(record.key, 1)}>
                  <Chevron up={false} />
                </Button>
              </span>
            </li>
          );
        })}
      </ol>
      <Button variant="secondary" onClick={onAdd}>
        {addLabel}
      </Button>
    </div>
  );
};

/** The sentence a field shows for its error, from the API's own code. */
export const useFieldMessage = () => {
  const t = useTranslations("SponsorRelations");
  const writeErrors = useTranslations("WriteErrors");
  return (error: FieldError | undefined): string | null => {
    if (!error) return null;
    return t.has(`errors.${error.code}`) ? t(`errors.${error.code}`, { limit: error.limit ?? 0 }) : writeErrors(error.code);
  };
};

export const errorAt = (errors: readonly FieldError[], path: string): FieldError | undefined => errors.find((error) => error.path === path);

/** The two single-language names: either, or both, never translated. */
export const NameFields = ({
  idPrefix,
  ar,
  en,
  max,
  errors,
  pathPrefix,
  onChange,
}: {
  idPrefix: string;
  ar: string;
  en: string;
  max: number;
  errors: readonly FieldError[];
  pathPrefix: string;
  onChange: (patch: { nameAr?: string; nameEn?: string }) => void;
}) => {
  const t = useTranslations("SponsorRelations");
  const message = useFieldMessage();
  const both = message(errorAt(errors, `${pathPrefix}.name`));
  return (
    <fieldset id={`${idPrefix}-name`} aria-describedby={`${idPrefix}-name-hint`} className="flex flex-col gap-4">
      <legend className="sr-only">{t("fields.name")}</legend>
      <p id={`${idPrefix}-name-hint`} className="text-caption text-[color:var(--color-text-muted)]">
        {t("nameHint")}
      </p>
      <TextField
        id={`${idPrefix}-nameAr`}
        label={t("nameAr")}
        dir="rtl"
        lang="ar"
        value={ar}
        onChange={(event) => onChange({ nameAr: event.target.value })}
        hint={t("characters", { count: graphemes(ar), max })}
        error={message(errorAt(errors, `${pathPrefix}.nameAr`)) ?? both}
      />
      <TextField
        id={`${idPrefix}-nameEn`}
        label={t("nameEn")}
        dir="ltr"
        lang="en"
        value={en}
        onChange={(event) => onChange({ nameEn: event.target.value })}
        hint={t("characters", { count: graphemes(en), max })}
        error={message(errorAt(errors, `${pathPrefix}.nameEn`)) ?? both}
      />
    </fieldset>
  );
};

/** A start and an optional end, as Dubai calendar days. */
export const DayFields = ({
  idPrefix,
  startDay,
  endDay,
  errors,
  pathPrefix,
  endHint,
  onChange,
}: {
  idPrefix: string;
  startDay: string;
  endDay: string;
  errors: readonly FieldError[];
  pathPrefix: string;
  endHint?: string;
  onChange: (patch: { startDay?: string; endDay?: string }) => void;
}) => {
  const t = useTranslations("SponsorRelations");
  const message = useFieldMessage();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id={`${idPrefix}-startDay`}
        type="date"
        label={t("startDay")}
        value={startDay}
        required
        onChange={(event) => onChange({ startDay: event.target.value })}
        error={message(errorAt(errors, `${pathPrefix}.startDay`))}
      />
      <TextField
        id={`${idPrefix}-endDay`}
        type="date"
        label={t("endDay")}
        value={endDay}
        onChange={(event) => onChange({ endDay: event.target.value })}
        hint={endHint ?? t("endHint")}
        error={message(errorAt(errors, `${pathPrefix}.endDay`))}
      />
    </div>
  );
};
