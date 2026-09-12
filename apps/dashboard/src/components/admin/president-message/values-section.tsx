"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { SelectField } from "@/components/ui/select-field";
import { BUTTON_ICON, BUTTON_SECONDARY } from "@/components/ui/interactive";
import { ValueIcon, VALUE_ICON_KEYS } from "@/lib/icons/value-icons";
import { addValue, moveValue, removeValue } from "@/lib/admin/president-message";
import type { SectionProps } from "./section-props";

/**
 * This message's values, in the order they are printed.
 *
 * Order is content here, so it has to be editable — and editable by keyboard,
 * which is why it is two buttons per row rather than a drag handle. Dragging
 * is the affordance a mouse user reaches for and the one a keyboard user
 * cannot use at all; a pair of buttons is operable by both, and the position
 * is announced so a screen-reader user learns the result of a move they
 * cannot see.
 *
 * Focus follows the row. Moving an item and leaving focus on a button that is
 * now attached to a different value is how a keyboard user reorders the wrong
 * thing twice.
 */
export function ValuesSection({ draft, onChange, disabled }: SectionProps) {
  const t = useTranslations("PresidentMessage");
  const [announcement, setAnnouncement] = useState("");
  /** Which move button to restore focus to once the list has re-rendered. */
  const pendingFocus = useRef<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const values = draft.values;

  useEffect(() => {
    if (pendingFocus.current === null) {
      return;
    }
    buttons.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [values]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= values.length) {
      return;
    }

    // Focus follows the value to its new row. When it lands at either end its
    // own button is about to be disabled, so focus moves to the one still
    // available rather than to a control the browser will refuse — which
    // would drop the reader back to the top of the document.
    const atEnd = direction === -1 ? target === 0 : target === values.length - 1;
    pendingFocus.current = `${target}:${atEnd ? -direction : direction}`;

    setAnnouncement(t("valuesReordered", { position: target + 1, total: values.length }));
    onChange({ values: moveValue(values, index, direction) });
  };

  const patchValue = (index: number, patch: Partial<(typeof values)[number]>) => {
    onChange({
      values: values.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry,
      ),
    });
  };

  return (
    <>
      <BilingualField
        id="values-title"
        labelAr={t("labelAr", { label: t("valuesTitle") })}
        labelEn={t("labelEn", { label: t("valuesTitle") })}
        valueAr={draft.valuesTitle.ar}
        valueEn={draft.valuesTitle.en}
        onChangeAr={(ar) => onChange({ valuesTitle: { ...draft.valuesTitle, ar } })}
        onChangeEn={(en) => onChange({ valuesTitle: { ...draft.valuesTitle, en } })}
        disabled={disabled}
      />

      {values.length === 0 ? (
        <p className="text-body text-[color:var(--color-text-muted)]">{t("noValues")}</p>
      ) : null}

      <ol className="flex flex-col gap-4">
        {values.map((value, index) => (
          <li key={index}>
            <fieldset className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                {/* Names the row by its position, which is the only thing
                    that distinguishes two values whose titles are still
                    empty. */}
                <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">
                  {t("valueLegend", { number: index + 1, total: values.length })}
                </legend>

                <div className="flex shrink-0 items-center gap-1">
                  <MoveButton
                    label={t("moveUp")}
                    glyph="up"
                    disabled={disabled || index === 0}
                    register={(node) => registerButton(buttons.current, `${index}:-1`, node)}
                    onClick={() => move(index, -1)}
                  />
                  <MoveButton
                    label={t("moveDown")}
                    glyph="down"
                    disabled={disabled || index === values.length - 1}
                    register={(node) => registerButton(buttons.current, `${index}:1`, node)}
                    onClick={() => move(index, 1)}
                  />
                  <button
                    type="button"
                    className={BUTTON_ICON}
                    aria-label={t("removeValue")}
                    disabled={disabled}
                    onClick={() => onChange({ values: removeValue(values, index) })}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="m4 4 8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-end gap-3">
                <SelectField
                  id={`value-${index}-icon`}
                  label={t("valueIcon")}
                  className="flex-1"
                  value={value.iconKey}
                  disabled={disabled}
                  options={VALUE_ICON_KEYS.map((key) => ({
                    value: key,
                    label: t(`icon.${key}`),
                  }))}
                  onChange={(event) => patchValue(index, { iconKey: event.target.value })}
                />
                {/* The chosen glyph, beside the control rather than inside
                    it: a native option list cannot draw one, and an author
                    picking "shield" should see what they picked. */}
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-brand-primary)]">
                  <ValueIcon iconKey={value.iconKey} />
                </span>
              </div>

              <BilingualField
                id={`value-${index}-title`}
                labelAr={t("labelAr", { label: t("valueTitle") })}
                labelEn={t("labelEn", { label: t("valueTitle") })}
                valueAr={value.title.ar}
                valueEn={value.title.en}
                onChangeAr={(ar) => patchValue(index, { title: { ...value.title, ar } })}
                onChangeEn={(en) => patchValue(index, { title: { ...value.title, en } })}
                disabled={disabled}
                required
              />

              <BilingualField
                id={`value-${index}-description`}
                multiline
                labelAr={t("labelAr", { label: t("valueDescription") })}
                labelEn={t("labelEn", { label: t("valueDescription") })}
                valueAr={value.description.ar}
                valueEn={value.description.en}
                onChangeAr={(ar) => patchValue(index, { description: { ...value.description, ar } })}
                onChangeEn={(en) => patchValue(index, { description: { ...value.description, en } })}
                disabled={disabled}
                required
              />
            </fieldset>
          </li>
        ))}
      </ol>

      <div>
        <button
          type="button"
          className={BUTTON_SECONDARY}
          disabled={disabled}
          onClick={() => onChange({ values: addValue(values) })}
        >
          {t("addValue")}
        </button>
      </div>

      {/* Polite, and outside the list: a move is a result the reader asked
          for, not an interruption, and a region inside a row that just moved
          is a region the reader was not pointed at. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function registerButton(
  registry: Map<string, HTMLButtonElement>,
  key: string,
  node: HTMLButtonElement | null,
): void {
  if (node) {
    registry.set(key, node);
  } else {
    registry.delete(key);
  }
}

function MoveButton({
  label,
  glyph,
  disabled,
  register,
  onClick,
}: {
  label: string;
  glyph: "up" | "down";
  disabled: boolean;
  register: (node: HTMLButtonElement | null) => void;
  onClick: () => void;
}) {
  return (
    <button
      ref={register}
      type="button"
      className={BUTTON_ICON}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {glyph === "up" ? <path d="M8 12.5V4m0 0L4.5 7.5M8 4l3.5 3.5" /> : <path d="M8 3.5V12m0 0 3.5-3.5M8 12 4.5 8.5" />}
      </svg>
    </button>
  );
}
