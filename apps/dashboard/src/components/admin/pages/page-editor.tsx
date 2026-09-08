"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LocalizedText } from "@/lib/api/types";
import { ADDRESS_PARTS, type PageField, type StaticPage } from "@/lib/admin/static-pages";
import { StatusMessage } from "@/components/auth/status-message";
import { TextField } from "@/components/auth/text-field";
import { BilingualField } from "@/components/admin/bilingual-field";
import { MediaPicker, type MediaAssetOption } from "./media-picker";
import type { AppLocale } from "@/i18n/routing";

/** The stored row, as the API returns it. Every field is optional because a
 *  page that has never been saved has no row at all. */
export type PageRecord = Record<string, unknown> | null;

interface PhoneRow {
  label: LocalizedText;
  number: string;
}
interface LinkRow {
  platform: string;
  url: string;
}

/**
 * One singleton content page's editor, built from its field list.
 *
 * The form is generated rather than hand-written because these pages really
 * are the same shape — ten of them are a headline, a standfirst and an
 * image. Twelve hand-written forms would be twelve places for a field name
 * to be misspelled in a way nothing catches until an editor's text silently
 * fails to save.
 *
 * Required bilingual fields are checked here, before the request, so the
 * message can say which language is missing. The route handler checks again
 * — it has to, since it is a public endpoint — but by then it no longer
 * knows which control on screen to point at.
 */
export function PageEditor({
  page,
  record,
  images,
  canEdit,
  canReadMedia = true,
  locale,
}: {
  page: StaticPage;
  record: PageRecord;
  images: readonly MediaAssetOption[];
  /** `<resource>:Update`. Without it the content is shown and the controls
   *  are not — the API would refuse the write anyway, and a disabled Save is
   *  a promise the screen cannot keep. */
  canEdit: boolean;
  canReadMedia?: boolean;
  locale: AppLocale;
}) {
  const t = useTranslations("SitePages");
  const errors = useTranslations("WriteErrors");
  const router = useRouter();

  const initial = useMemo(() => toFormState(page, record), [page, record]);
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "success" | "error"; key: string } | null>(null);

  const dirty = JSON.stringify(state) !== JSON.stringify(initial);

  function patch(name: string, value: unknown) {
    setOutcome(null);
    setState((current) => ({ ...current, [name]: value }));
  }

  async function save() {
    const missing = page.fields.some(
      (field) =>
        field.kind === "localized" &&
        field.required &&
        !bothHalvesFilled(state[field.name] as LocalizedText),
    );
    const missingText = page.fields.some(
      (field) =>
        field.kind === "text" && field.required && String(state[field.name] ?? "").trim().length === 0,
    );
    if (missing || missingText) {
      setOutcome({ tone: "error", key: "__missingFields" });
      return;
    }

    setSaving(true);
    setOutcome(null);

    try {
      const response = await fetch(`/api/admin/pages/${page.key}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setOutcome({ tone: "error", key: body?.code ?? "serviceUnavailable" });
        setSaving(false);
        return;
      }

      setOutcome({ tone: "success", key: "__saved" });
      setSaving(false);
      // The server component above holds the record; refreshing is what makes
      // `initial` match what was written, so the diff resets without this
      // component guessing at the new state.
      router.refresh();
    } catch {
      setOutcome({ tone: "error", key: "serviceUnavailable" });
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex flex-col gap-6 px-5 py-5"
    >
      {outcome ? (
        <StatusMessage
          tone={outcome.tone}
          title={outcome.tone === "success" ? t("savedTitle") : t("saveFailedTitle")}
        >
          {outcome.key === "__saved"
            ? t("savedBody")
            : outcome.key === "__missingFields"
              ? t("missingFields")
              : errors.has(outcome.key)
                ? errors(outcome.key)
                : errors("serviceUnavailable")}
        </StatusMessage>
      ) : null}

      {/* One grid for the whole form so the rhythm holds: a short single
          value takes half the width and pairs with its neighbour, while
          anything bilingual or repeatable spans both columns. Laid out
          per-field instead, three short fields after two full-width rows
          read as a ragged left edge with nothing beside them. */}
      <div className="grid gap-6 sm:grid-cols-2">
        {page.fields.map((field) => (
          <div key={field.name} className={field.kind === "text" ? "" : "sm:col-span-2"}>
            <Field
              field={field}
              state={state}
              images={images}
              canReadMedia={canReadMedia}
              disabled={!canEdit || saving}
              locale={locale}
              onChange={patch}
            />
          </div>
        ))}
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--color-border-default)] pt-4">
          <p aria-live="polite" className="text-caption text-[color:var(--color-text-secondary)]">
            {dirty ? t("unsaved") : t("noChanges")}
          </p>
          <div className="ms-auto flex gap-2">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => {
                setState(initial);
                setOutcome(null);
              }}
              className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 text-label text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] active:bg-[color:var(--color-surface-skeleton)]"
            >
              {t("reset")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-5 text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--button-disabled-text)] active:bg-[color:var(--button-primary-background-pressed)]"
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      ) : (
        <StatusMessage tone="info" title={t("readOnlyTitle")}>
          {t("readOnlyBody")}
        </StatusMessage>
      )}
    </form>
  );
}

function Field({
  field,
  state,
  images,
  canReadMedia,
  disabled,
  locale,
  onChange,
}: {
  field: PageField;
  state: Record<string, unknown>;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  disabled: boolean;
  locale: AppLocale;
  onChange: (name: string, value: unknown) => void;
}) {
  const t = useTranslations("SitePages");
  const label = t(`field_${field.name}`);

  switch (field.kind) {
    case "media":
      return (
        <MediaPicker
          label={label}
          value={String(state[field.name] ?? "")}
          images={images}
          canRead={canReadMedia}
          disabled={disabled}
          locale={locale}
          onChange={(id) => onChange(field.name, id)}
        />
      );

    case "localized": {
      const value = (state[field.name] ?? { ar: "", en: "" }) as LocalizedText;
      return (
        <BilingualField
          id={`field-${field.name}`}
          multiline={field.multiline}
          labelAr={t("labelAr", { label })}
          labelEn={t("labelEn", { label })}
          valueAr={value.ar}
          valueEn={value.en}
          onChangeAr={(ar) => onChange(field.name, { ...value, ar })}
          onChangeEn={(en) => onChange(field.name, { ...value, en })}
          hint={field.required ? undefined : t("optional")}
          disabled={disabled}
          required={field.required}
        />
      );
    }

    case "text":
      return (
        <TextField
          id={`field-${field.name}`}
          label={label}
          type={field.inputType === "email" ? "email" : "text"}
          inputMode={field.inputType === "email" ? "email" : undefined}
          hint={field.required ? undefined : t("optional")}
          value={String(state[field.name] ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      );

    case "address":
      return (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">
            {label}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ADDRESS_PARTS.map((part) => {
              const address = (state[field.name] ?? {}) as Record<string, string>;
              return (
                <TextField
                  key={part}
                  id={`address-${part}`}
                  label={t(`part_${part}`)}
                  dir="auto"
                  value={address[part] ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(field.name, { ...address, [part]: event.target.value })
                  }
                />
              );
            })}
          </div>
        </fieldset>
      );

    case "phones": {
      const rows = (state[field.name] ?? []) as PhoneRow[];
      return (
        <RepeatableRows
          legend={label}
          rows={rows}
          disabled={disabled}
          addLabel={t("addPhone")}
          onAdd={() => onChange(field.name, [...rows, { label: { ar: "", en: "" }, number: "" }])}
          onRemove={(index) => onChange(field.name, rows.filter((_, i) => i !== index))}
          renderRow={(row, index) => (
            <>
              <BilingualField
                id={`phone-${index}-label`}
                labelAr={t("labelAr", { label: t("phoneLabel") })}
                labelEn={t("labelEn", { label: t("phoneLabel") })}
                valueAr={row.label.ar}
                valueEn={row.label.en}
                onChangeAr={(ar) => replaceRow(rows, index, { ...row, label: { ...row.label, ar } })}
                onChangeEn={(en) => replaceRow(rows, index, { ...row, label: { ...row.label, en } })}
                disabled={disabled}
              />
              <div className="max-w-[280px]">
                <TextField
                  id={`phone-${index}-number`}
                  label={t("phoneNumber")}
                  type="tel"
                  inputMode="tel"
                  value={row.number}
                  disabled={disabled}
                  onChange={(event) =>
                    replaceRow(rows, index, { ...row, number: event.target.value })
                  }
                />
              </div>
            </>
          )}
        />
      );

      function replaceRow(current: PhoneRow[], index: number, next: PhoneRow) {
        onChange(
          field.name,
          current.map((row, i) => (i === index ? next : row)),
        );
      }
    }

    case "socialLinks": {
      const rows = (state[field.name] ?? []) as LinkRow[];
      const replace = (index: number, next: LinkRow) =>
        onChange(
          field.name,
          rows.map((row, i) => (i === index ? next : row)),
        );
      return (
        <RepeatableRows
          legend={label}
          rows={rows}
          disabled={disabled}
          addLabel={t("addLink")}
          onAdd={() => onChange(field.name, [...rows, { platform: "", url: "" }])}
          onRemove={(index) => onChange(field.name, rows.filter((_, i) => i !== index))}
          renderRow={(row, index) => (
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <TextField
                id={`link-${index}-platform`}
                label={t("linkPlatform")}
                dir="auto"
                value={row.platform}
                disabled={disabled}
                onChange={(event) => replace(index, { ...row, platform: event.target.value })}
              />
              <TextField
                id={`link-${index}-url`}
                label={t("linkUrl")}
                type="url"
                value={row.url}
                disabled={disabled}
                onChange={(event) => replace(index, { ...row, url: event.target.value })}
              />
            </div>
          )}
        />
      );
    }
  }
}

/**
 * A list the editor grows and shrinks.
 *
 * Each row carries its own remove control rather than one "remove last":
 * the row someone wants gone is rarely the last one, and moving the wanted
 * rows around to delete an unwanted one is how the wrong row gets deleted.
 */
function RepeatableRows<Row>({
  legend,
  rows,
  disabled,
  addLabel,
  onAdd,
  onRemove,
  renderRow,
}: {
  legend: string;
  rows: readonly Row[];
  disabled: boolean;
  addLabel: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderRow: (row: Row, index: number) => React.ReactNode;
}) {
  const t = useTranslations("SitePages");
  return (
    <fieldset className="flex flex-col gap-3" aria-label={legend}>
      <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">
        {legend}
      </legend>

      {rows.length === 0 ? (
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("noRows")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-4"
            >
              {renderRow(row, index)}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(index)}
                className="h-9 self-start rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-3 text-caption text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-semantic-error)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed active:bg-[color:var(--color-surface-skeleton)]"
              >
                {t("removeRow")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="h-10 self-start rounded-[var(--radius-md)] border border-[color:var(--color-brand-primary)] px-4 text-label font-medium text-[color:var(--color-brand-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-surface-base))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:border-[color:var(--color-border-default)] disabled:text-[color:var(--color-text-disabled)] active:bg-[color:var(--color-surface-skeleton)]"
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

/** Every declared field gets an entry, so a control is never uncontrolled and
 *  the unsaved-changes comparison has something stable to compare against. */
function toFormState(page: StaticPage, record: PageRecord): Record<string, unknown> {
  const stored = record ?? {};
  const state: Record<string, unknown> = {};

  for (const field of page.fields) {
    const value = stored[field.name];
    switch (field.kind) {
      case "localized":
        state[field.name] = isLocalized(value) ? { ar: value.ar, en: value.en } : { ar: "", en: "" };
        break;
      case "media":
      case "text":
        state[field.name] = typeof value === "string" ? value : "";
        break;
      case "address":
        state[field.name] = typeof value === "object" && value !== null ? { ...value } : {};
        break;
      case "phones":
        state[field.name] = Array.isArray(value)
          ? value.map((row) => ({
              label: isLocalized((row as PhoneRow).label)
                ? { ...(row as PhoneRow).label }
                : { ar: "", en: "" },
              number: String((row as PhoneRow).number ?? ""),
            }))
          : [];
        break;
      case "socialLinks":
        state[field.name] = Array.isArray(value)
          ? value.map((row) => ({
              platform: String((row as LinkRow).platform ?? ""),
              url: String((row as LinkRow).url ?? ""),
            }))
          : [];
        break;
    }
  }

  return state;
}

function isLocalized(value: unknown): value is LocalizedText {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LocalizedText).ar === "string" &&
    typeof (value as LocalizedText).en === "string"
  );
}

function bothHalvesFilled(value: LocalizedText | undefined): boolean {
  return (value?.ar ?? "").trim().length > 0 && (value?.en ?? "").trim().length > 0;
}
