"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { TextField } from "@/components/auth/text-field";
import { SelectField } from "@/components/ui/select-field";
import { BUTTON_ICON, BUTTON_SECONDARY } from "@/components/ui/interactive";
import { PlanPhaseIcon, PLAN_PHASE_ICON_KEYS } from "@/lib/icons/plan-phase-icons";
import {
  appendItem,
  moveItem,
  removeItem,
  toggleVisible,
  type DraftOf,
  type PlanListItemDraft,
  type PlanListKind,
  type PlanMetricDraft,
  type PlanPhaseDraft,
} from "@/lib/admin/plan-lists";
import type { LocalizedText } from "@/lib/api/types";

/** What one entry is called, in the screen's own words. */
export interface PlanListLabels {
  legend: (number: number, total: number) => string;
  add: string;
  remove: string;
  empty: string;
  /** The visibility checkbox's name — checked means the item is printed. */
  show: string;
  /** The badge a hidden row carries. */
  hide: string;
  /** Why the last visible item cannot be removed or hidden. */
  lastVisible: string;
  /** Why nothing more can be added, on a list that stands in one row. */
  limitReached?: string;
}

/** Whether the item at `index` is the only one still printed: removing or
 *  hiding it would take its section off the page (ADR-0075). */
const isLastVisible = (items: readonly { isVisible: boolean }[], index: number): boolean =>
  items[index]?.isVisible === true && items.filter((item) => item.isVisible).length === 1;

/**
 * One of the strategic plan's five lists (ADR-0075), in the order it is
 * printed. Built from the shared `BlockListField` for items that carry an
 * identity and a visibility, which that field's rows do not.
 *
 * - Reordering is three things at once: a native drag from the row's handle,
 *   two buttons per row, and the arrow keys on the handle — so a pointer, a
 *   keyboard and a screen reader each have a way, and every way announces the
 *   new position.
 * - A row is `draggable` only while its handle is pressed. Left draggable all
 *   the time, a mouse drag inside any of the row's inputs would pick up the
 *   row instead of selecting text.
 * - A hidden row stays on the screen, badged, and stays editable: hiding is
 *   taking the item off the page, not out of the draft.
 * - Focus follows the row that moved, to the control that moved it.
 * - A new row has no `_id`; the API tells it from a stored one by exactly
 *   that. A new phase starts on a real icon key, since the API requires one.
 * - The last visible item cannot be removed or hidden, and its row says why:
 *   a list with nothing printed takes its section off the page, which the
 *   page rules forbid an editor to do (ADR-0075). The API refuses it too; the
 *   screen makes the state unreachable (CLAUDE.md §31.2), and each handler
 *   checks again at the moment it acts (§31.1).
 */
export const PlanListField = <K extends PlanListKind>({
  id,
  items,
  onChange,
  disabled,
  labels,
  fields,
  max,
}: {
  id: string;
  items: readonly DraftOf<K>[];
  onChange: (items: DraftOf<K>[]) => void;
  disabled: boolean;
  labels: PlanListLabels;
  /** Which item shape the list holds, and so which inputs a row shows. */
  fields: { kind: K };
  /** How many items this list may hold, where it stands in one row
   *  (`MAX_PLAN_ROW_ITEMS`, ADR-0075). The wrapping lists pass none. */
  max?: number;
}) => {
  const t = useTranslations("StrategicPlan");
  const e = useTranslations("EditorialEditor");
  const legendBase = useId();
  const [announcement, setAnnouncement] = useState("");
  const [armed, setArmed] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  /** A list that stands in one row and already holds what the row holds. */
  const full = max !== undefined && items.length >= max;
  const limitId = `${legendBase}-limit`;

  useEffect(() => {
    if (pendingFocus.current === null) {
      return;
    }
    buttons.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [items]);

  // A handle pressed and released anywhere else, with no drag, would leave
  // its row draggable, and a later text selection in that row's inputs would
  // pick the row up. Released anywhere, the row is disarmed.
  useEffect(() => {
    if (armed === null) {
      return;
    }
    const disarm = () => setArmed(null);
    document.addEventListener("pointerup", disarm);
    document.addEventListener("pointercancel", disarm);
    return () => {
      document.removeEventListener("pointerup", disarm);
      document.removeEventListener("pointercancel", disarm);
    };
  }, [armed]);

  const register = (key: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      buttons.current.set(key, node);
    } else {
      buttons.current.delete(key);
    }
  };

  // Two moves to the same position would set the same text, and a live region
  // announces a change, not a repeat: the second one alternates a zero-width
  // space so it is heard too.
  const announce = (position: number) => {
    const text = e("reordered", { position: position + 1, total: items.length });
    setAnnouncement((current) => (current === text ? `${text}​` : text));
  };

  /** One step, from a button or the handle's arrow keys. `focus` names the
   *  control that should hold focus on the row's new position. */
  const step = (index: number, direction: -1 | 1, focus: "button" | "handle") => {
    const target = index + direction;
    if (target < 0 || target >= items.length) {
      return;
    }
    if (focus === "handle") {
      pendingFocus.current = `${target}:handle`;
    } else {
      const atEnd = direction === -1 ? target === 0 : target === items.length - 1;
      pendingFocus.current = `${target}:${atEnd ? -direction : direction}`;
    }
    announce(target);
    onChange(moveItem(items, index, target));
  };

  const onDragStart = (index: number) => (event: DragEvent<HTMLLIElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    dragFrom.current = index;
    // Firefox starts no drag without data; the index is as good a payload as any.
    event.dataTransfer?.setData("text/plain", String(index));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  };

  const onDragOver = (event: DragEvent<HTMLLIElement>) => {
    // Only a row of this list is a drop target, and only while one of its own
    // rows is in flight: preventing the default is what allows the drop.
    if (dragFrom.current === null) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  };

  const onDrop = (index: number) => (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    const from = dragFrom.current;
    dragFrom.current = null;
    setArmed(null);
    // Read when the drop lands: a save that started while the row was in
    // flight disables the list, and the drop must not reorder under it.
    if (disabled || from === null || from === index) {
      return;
    }
    announce(index);
    onChange(moveItem(items, from, index));
  };

  const onDragEnd = () => {
    dragFrom.current = null;
    setArmed(null);
  };

  const onHandleKey = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      step(index, event.key === "ArrowUp" ? -1 : 1, "handle");
    }
  };

  const remove = (index: number) => {
    if (disabled || isLastVisible(items, index)) {
      return;
    }
    onChange(removeItem(items, index));
    // Rows are keyed by position: left where it was, focus would land on the
    // next row's remove button, and a second press would delete that too.
    addButton.current?.focus();
  };

  const toggle = (index: number) => {
    if (disabled || isLastVisible(items, index)) {
      return;
    }
    onChange(toggleVisible(items, index));
  };

  /** A change may name any field of the four shapes; a row only ever sends
   *  the fields its kind shows, so the merged shape stays honest. */
  const patch = (index: number, change: Partial<PlanPhaseDraft & PlanMetricDraft>) =>
    onChange(items.map((entry, position) => (position === index ? { ...entry, ...change } : entry)));

  const add = () => {
    // Read when the press lands, not when the button was drawn: an item added
    // in another tab and adopted by a refresh can fill the row in between
    // (CLAUDE.md §31.1).
    // Read when the press lands, not when the button was drawn: an item added
    // in another tab and adopted by a refresh can fill the row in between
    // (CLAUDE.md §31.1).
    if (disabled || (max !== undefined && items.length >= max)) {
      return;
    }
    const empty = (): LocalizedText => ({ ar: "", en: "" });
    const template =
      fields.kind === "metric"
        ? { value: "", label: empty(), isVisible: true }
        : fields.kind === "phase"
          ? { title: empty(), description: empty(), iconKey: PLAN_PHASE_ICON_KEYS[0], isVisible: true }
          : { title: empty(), description: empty(), isVisible: true };
    onChange(appendItem(items, template as unknown as Omit<DraftOf<K>, "displayOrder" | "_id">));
  };

  const bilingual = (
    index: number,
    field: "title" | "description" | "label",
    value: LocalizedText,
    label: string,
    options: { multiline?: boolean; required?: boolean } = {},
  ) => {
    const set = (next: LocalizedText) =>
      patch(index, field === "title" ? { title: next } : field === "description" ? { description: next } : { label: next });
    return (
      <BilingualField
        id={`${id}-${index}-${field}`}
        labelAr={e("labelAr", { label })}
        labelEn={e("labelEn", { label })}
        valueAr={value.ar}
        valueEn={value.en}
        onChangeAr={(ar) => set({ ...value, ar })}
        onChangeEn={(en) => set({ ...value, en })}
        disabled={disabled}
        multiline={options.multiline}
        required={options.required}
      />
    );
  };

  /** The inputs one row shows, by the list's kind. The casts narrow the
   *  generic item to the shape the kind guarantees. */
  const inputs = (item: DraftOf<K>, index: number) => {
    if (fields.kind === "metric") {
      const metric = item as PlanMetricDraft;
      return (
        <>
          <TextField
            id={`${id}-${index}-value`}
            label={t("metricValue")}
            value={metric.value}
            required
            disabled={disabled}
            onChange={(event) => patch(index, { value: event.target.value })}
          />
          {bilingual(index, "label", metric.label, t("metricLabel"), { required: true })}
        </>
      );
    }

    const entry = item as PlanListItemDraft;
    return (
      <>
        {fields.kind === "phase" ? (
          <div className="flex items-end gap-3">
            <SelectField
              id={`${id}-${index}-icon`}
              label={e("itemIcon")}
              className="flex-1"
              value={(item as PlanPhaseDraft).iconKey}
              disabled={disabled}
              options={PLAN_PHASE_ICON_KEYS.map((key) => ({ value: key, label: t(`icon.${key}`) }))}
              onChange={(event) => patch(index, { iconKey: event.target.value })}
            />
            {/* The chosen glyph beside the control: a native option list cannot draw one. */}
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-brand-primary)]">
              <PlanPhaseIcon iconKey={(item as PlanPhaseDraft).iconKey} />
            </span>
          </div>
        ) : null}

        {bilingual(index, "title", entry.title, e("itemTitle"), { required: true })}
        {bilingual(index, "description", entry.description, fields.kind === "step" ? t("stepDescription") : e("itemDescription"), {
          multiline: true,
          required: fields.kind !== "step",
        })}
      </>
    );
  };

  return (
    <>
      {items.length === 0 ? <p className="text-body text-[color:var(--color-text-muted)]">{labels.empty}</p> : null}

      <ol className="flex flex-col gap-4">
        {items.map((item, index) => {
          const legendId = `${legendBase}-${index}`;
          const noteId = `${legendBase}-${index}-last`;
          const lastVisible = isLastVisible(items, index);
          return (
            <li
              key={index}
              draggable={armed === index}
              onDragStart={onDragStart(index)}
              onDragOver={onDragOver}
              onDrop={onDrop(index)}
              onDragEnd={onDragEnd}
            >
              <fieldset
                aria-labelledby={legendId}
                className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <legend id={legendId} className="text-label font-medium text-[color:var(--color-text-secondary)]">
                      {labels.legend(index + 1, items.length)}
                    </legend>
                    {item.isVisible ? null : (
                      <span className="rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-2 py-0.5 text-caption font-medium text-[color:var(--color-text-secondary)]">
                        {labels.hide}
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 text-label text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--color-surface-raised)] active:bg-[color:var(--color-surface-skeleton)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-[var(--opacity-disabled)]">
                      <input
                        type="checkbox"
                        checked={item.isVisible}
                        disabled={disabled || lastVisible}
                        aria-describedby={lastVisible ? noteId : undefined}
                        onChange={() => toggle(index)}
                        className="size-[18px] accent-[color:var(--color-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)] disabled:cursor-not-allowed"
                      />
                      {labels.show}
                    </label>

                    <button
                      ref={register(`${index}:handle`)}
                      type="button"
                      className={`${BUTTON_ICON} cursor-grab active:cursor-grabbing touch-none`}
                      aria-label={t("dragHandle")}
                      disabled={disabled}
                      onPointerDown={() => setArmed(index)}
                      onPointerUp={() => setArmed(null)}
                      onKeyDown={onHandleKey(index)}
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
                        <circle cx="6" cy="3.5" r="1.25" />
                        <circle cx="10" cy="3.5" r="1.25" />
                        <circle cx="6" cy="8" r="1.25" />
                        <circle cx="10" cy="8" r="1.25" />
                        <circle cx="6" cy="12.5" r="1.25" />
                        <circle cx="10" cy="12.5" r="1.25" />
                      </svg>
                    </button>
                    <MoveButton
                      label={e("moveUp")}
                      glyph="up"
                      disabled={disabled || index === 0}
                      register={register(`${index}:-1`)}
                      onClick={() => step(index, -1, "button")}
                    />
                    <MoveButton
                      label={e("moveDown")}
                      glyph="down"
                      disabled={disabled || index === items.length - 1}
                      register={register(`${index}:1`)}
                      onClick={() => step(index, 1, "button")}
                    />
                    <button
                      type="button"
                      className={BUTTON_ICON}
                      aria-label={labels.remove}
                      aria-describedby={lastVisible ? noteId : undefined}
                      disabled={disabled || lastVisible}
                      onClick={() => remove(index)}
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="m4 4 8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  </div>
                </div>

                {lastVisible ? (
                  <p id={noteId} className="text-body-sm text-[color:var(--color-text-secondary)]">
                    {labels.lastVisible}
                  </p>
                ) : null}

                {inputs(item, index)}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div>
        <button
          ref={addButton}
          type="button"
          className={BUTTON_SECONDARY}
          disabled={disabled || full}
          aria-describedby={full ? limitId : undefined}
          onClick={add}
        >
          {labels.add}
        </button>
        {full ? (
          <p id={limitId} className="mt-2 text-body-sm text-[color:var(--color-text-secondary)]">
            {labels.limitReached}
          </p>
        ) : null}
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
