"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { SelectField } from "@/components/ui/select-field";
import { BUTTON_ICON, BUTTON_SECONDARY } from "@/components/ui/interactive";
import { ValueIcon, VALUE_ICON_KEYS } from "@/lib/icons/value-icons";
import { appendBlock, moveBlock, removeBlock, type BlockDraft } from "@/lib/admin/content-blocks";

/**
 * A bounded editorial list — goals, values, pillars — in the order it is
 * printed (ADR-0070). Built from the President's Message values editor, for
 * any list of `{ title, description, displayOrder }` with or without an icon.
 *
 * - Reordering is two buttons per row, not a drag handle: operable by keyboard
 *   and pointer alike, and the new position is announced.
 * - Focus follows the row that moved, and moves to the button still available
 *   when the row lands at an end.
 * - An icon list starts a new row on a real key, since the API requires one.
 */
export const BlockListField = <T extends BlockDraft>({
  id,
  items,
  onChange,
  disabled,
  withIcon,
  labels,
}: {
  id: string;
  items: readonly T[];
  onChange: (items: T[]) => void;
  disabled: boolean;
  withIcon: boolean;
  /** What one entry is called, in the screen's own words. */
  labels: { legend: (number: number, total: number) => string; add: string; remove: string; empty: string };
}) => {
  const t = useTranslations("EditorialEditor");
  const [announcement, setAnnouncement] = useState("");
  const pendingFocus = useRef<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (pendingFocus.current === null) {
      return;
    }
    buttons.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [items]);

  const register = (key: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      buttons.current.set(key, node);
    } else {
      buttons.current.delete(key);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) {
      return;
    }
    const atEnd = direction === -1 ? target === 0 : target === items.length - 1;
    pendingFocus.current = `${target}:${atEnd ? -direction : direction}`;
    setAnnouncement(t("reordered", { position: target + 1, total: items.length }));
    onChange(moveBlock(items, index, direction));
  };

  const patch = (index: number, change: Partial<T>) =>
    onChange(items.map((entry, position) => (position === index ? { ...entry, ...change } : entry)));

  const add = () => {
    const empty = { ar: "", en: "" };
    const template = (withIcon
      ? { title: { ...empty }, description: { ...empty }, iconKey: VALUE_ICON_KEYS[0] }
      : { title: { ...empty }, description: { ...empty } }) as unknown as Omit<T, "displayOrder">;
    onChange(appendBlock(items, template));
  };

  return (
    <>
      {items.length === 0 ? <p className="text-body text-[color:var(--color-text-muted)]">{labels.empty}</p> : null}

      <ol className="flex flex-col gap-4">
        {items.map((item, index) => (
          <li key={index}>
            <fieldset className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">
                  {labels.legend(index + 1, items.length)}
                </legend>

                <div className="flex shrink-0 items-center gap-1">
                  <MoveButton
                    label={t("moveUp")}
                    glyph="up"
                    disabled={disabled || index === 0}
                    register={register(`${index}:-1`)}
                    onClick={() => move(index, -1)}
                  />
                  <MoveButton
                    label={t("moveDown")}
                    glyph="down"
                    disabled={disabled || index === items.length - 1}
                    register={register(`${index}:1`)}
                    onClick={() => move(index, 1)}
                  />
                  <button
                    type="button"
                    className={BUTTON_ICON}
                    aria-label={labels.remove}
                    disabled={disabled}
                    onClick={() => onChange(removeBlock(items, index))}
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="m4 4 8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              </div>

              {withIcon ? (
                <div className="flex items-end gap-3">
                  <SelectField
                    id={`${id}-${index}-icon`}
                    label={t("itemIcon")}
                    className="flex-1"
                    value={item.iconKey ?? VALUE_ICON_KEYS[0]}
                    disabled={disabled}
                    options={VALUE_ICON_KEYS.map((key) => ({ value: key, label: t(`icon.${key}`) }))}
                    onChange={(event) => patch(index, { iconKey: event.target.value } as Partial<T>)}
                  />
                  {/* The chosen glyph beside the control: a native option list cannot draw one. */}
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-brand-primary)]">
                    <ValueIcon iconKey={item.iconKey ?? VALUE_ICON_KEYS[0]} />
                  </span>
                </div>
              ) : null}

              <BilingualField
                id={`${id}-${index}-title`}
                labelAr={t("labelAr", { label: t("itemTitle") })}
                labelEn={t("labelEn", { label: t("itemTitle") })}
                valueAr={item.title.ar}
                valueEn={item.title.en}
                onChangeAr={(ar) => patch(index, { title: { ...item.title, ar } } as Partial<T>)}
                onChangeEn={(en) => patch(index, { title: { ...item.title, en } } as Partial<T>)}
                disabled={disabled}
                required
              />

              <BilingualField
                id={`${id}-${index}-description`}
                multiline
                labelAr={t("labelAr", { label: t("itemDescription") })}
                labelEn={t("labelEn", { label: t("itemDescription") })}
                valueAr={item.description.ar}
                valueEn={item.description.en}
                onChangeAr={(ar) => patch(index, { description: { ...item.description, ar } } as Partial<T>)}
                onChangeEn={(en) => patch(index, { description: { ...item.description, en } } as Partial<T>)}
                disabled={disabled}
                required
              />
            </fieldset>
          </li>
        ))}
      </ol>

      <div>
        <button type="button" className={BUTTON_SECONDARY} disabled={disabled} onClick={add}>
          {labels.add}
        </button>
      </div>

      {/* Polite, and outside the list: a move is a result the reader asked for. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
};

const MoveButton = ({
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
}) => (
  <button ref={register} type="button" className={BUTTON_ICON} aria-label={label} disabled={disabled} onClick={onClick}>
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
