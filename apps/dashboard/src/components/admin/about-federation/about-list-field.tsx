"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BUTTON_ICON, BUTTON_SECONDARY, FOCUS_RING, TRANSITION } from "@/components/ui/interactive";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * One of the About page's three editable lists — milestones, achievements,
 * pioneers — in the order it is printed.
 *
 * ── Why this is not `BlockListField` ──────────────────────────────────────
 *
 * That component's rows are fixed to a title, a description and an optional
 * icon, with no per-row visibility and no picture. These rows carry a date
 * precision, a category, a medal, a portrait and two independent hidden
 * states. The same choice was made once already for the Strategic Plan, whose
 * `PlanListField` is a sibling of `BlockListField` rather than a use of it;
 * this follows that precedent rather than bending a shared component into a
 * shape it was not built for.
 *
 * ── What a row offers ─────────────────────────────────────────────────────
 *
 * - **Reordering three ways**: two buttons, the arrow keys on the handle, and
 *   a native drag from the handle — so a pointer, a keyboard and a screen
 *   reader each have a way, and every way announces the new position.
 * - **A row is `draggable` only while its handle is pressed.** Left draggable
 *   always, a mouse drag inside any of the row's inputs would pick up the row
 *   instead of selecting text.
 * - **State in an icon and in words**, never in colour alone (WCAG 1.4.1).
 *   "Hidden" and "hidden automatically" are different states and say so.
 * - **An explicit Edit button** opening the editor in place, rather than a row
 *   that is always expanded: six milestones open at once is a wall, and the
 *   approved screen shows one.
 * - **Deleting asks first**, inside the editor, because a list row is cheap to
 *   click by accident and the writing in it is not cheap to redo.
 */

export interface AboutListItem {
  _id?: string;
  isVisible?: boolean;
}

/** What one row shows before it is opened. */
export interface RowSummary {
  /** The left-hand fact: a date, a year. */
  lead: string;
  /** Whether `lead` is a value the federation has not confirmed. */
  leadUnconfirmed?: boolean;
  title: string;
  /** Drawn beside the title, e.g. the "featured" badge. */
  mark?: ReactNode;
}

export interface AboutListLabels {
  /** The list's own name, for the add button and the announcements. */
  addItem: string;
  removeItem: string;
  /** Asked before a row is deleted. */
  removeTitle: string;
  removeBody: string;
  /** Why nothing more can be added, for a list the approved composition draws
   *  in one row. Required whenever `maxItems` is given. */
  limitReached?: string;
}

export type ItemState = "visible" | "hidden" | "autoHidden";

/** The destructive button inside an opened row. It carries the focus ring and
 *  the pressed response, which a hand-written copy of it did not — a keyboard
 *  reached it and nothing on screen said so. */
const REMOVE_BUTTON = `inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-3 text-label font-semibold text-[color:var(--color-semantic-error-text)] hover:bg-[color-mix(in_srgb,var(--color-semantic-error)_10%,transparent)] active:bg-[color-mix(in_srgb,var(--color-semantic-error)_18%,transparent)] ${TRANSITION} ${FOCUS_RING} disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] disabled:hover:bg-transparent`;

export const AboutListField = <T extends AboutListItem>({
  id,
  items,
  onChange,
  disabled,
  labels,
  summaryOf,
  stateOf,
  children,
  makeItem,
  maxItems,
}: {
  id: string;
  items: readonly T[];
  onChange: (items: T[]) => void;
  disabled: boolean;
  labels: AboutListLabels;
  /**
   * How many the approved composition can draw, hidden items counted — they
   * take their place back the moment an editor shows them again.
   *
   * At the cap the add button is disabled and says why, rather than staying
   * lit and doing nothing: a control that looks available and is not is read
   * as a bug in the screen. Deleting stays available, because deleting is how
   * an editor makes room.
   */
  maxItems?: number;
  summaryOf: (item: T) => RowSummary;
  /** Whether the item prints, and if not, whether the editor chose that. */
  stateOf: (item: T) => ItemState;
  /** The item's own fields, rendered inside the opened row. */
  children: (item: T, patch: (change: Partial<T>) => void, index: number) => ReactNode;
  makeItem: () => T;
}) => {
  const t = useTranslations("AboutFederation");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const handles = useRef(new Map<number, HTMLButtonElement>());
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocus.current === null) {
      return;
    }
    handles.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [items]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) {
      return;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    pendingFocus.current = to;
    // The open row follows the item it belongs to, not the position it left.
    setOpenIndex((current) => (current === from ? to : current));
    setAnnouncement(t("list.reordered", { position: to + 1, total: items.length }));
    onChange(next);
  };

  /** At the cap. Hidden items count: they take their place back the moment an
   *  editor shows them again. */
  const full = maxItems !== undefined && items.length >= maxItems;

  const patchAt = (index: number) => (change: Partial<T>) =>
    onChange(items.map((item, position) => (position === index ? { ...item, ...change } : item)));

  const remove = (index: number) => {
    setPendingRemoval(null);
    setOpenIndex(null);
    setAnnouncement(t("list.removed"));
    onChange(items.filter((_, position) => position !== index));
  };

  const add = () => {
    // Checked here, against the list as it stands now, rather than from a
    // value captured when the button was drawn (CLAUDE.md §31.1): the list can
    // have grown since, and the disabled button is the structure, this is the
    // backstop.
    if (maxItems !== undefined && items.length >= maxItems) {
      return;
    }
    onChange([...items, makeItem()]);
    // The new row opens on its own: an editor who just pressed "add" wants to
    // fill it in, and a collapsed empty row reads as nothing having happened.
    setOpenIndex(items.length);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <p className="text-body text-[color:var(--color-text-muted)]">{t("list.empty")}</p>
      ) : null}

      <ol className="flex flex-col gap-2">
        {items.map((item, index) => {
          const summary = summaryOf(item);
          const state = stateOf(item);
          const open = openIndex === index;
          const rowId = `${id}-${index}`;

          return (
            <li
              key={item._id ?? `new-${index}`}
              draggable={dragging === index}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(event) => {
                if (dragging !== null) {
                  event.preventDefault();
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData("text/plain"));
                setDragging(null);
                if (Number.isInteger(from)) {
                  move(from, index);
                }
              }}
              onDragEnd={() => setDragging(null)}
            >
              <div
                className={`flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 ${
                  open
                    ? "border-[color:var(--color-brand-primary)] bg-[color:var(--color-surface-sunken)]"
                    : "border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)]"
                }`}
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-sunken)] text-label font-bold text-[color:var(--color-text-secondary)]">
                  {index + 1}
                </span>

                <button
                  type="button"
                  ref={(node) => {
                    if (node) {
                      handles.current.set(index, node);
                    } else {
                      handles.current.delete(index);
                    }
                  }}
                  className={BUTTON_ICON}
                  aria-label={t("list.reorderHandle", { position: index + 1 })}
                  disabled={disabled}
                  onMouseDown={() => setDragging(index)}
                  onMouseUp={() => setDragging(null)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      move(index, index - 1);
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      move(index, index + 1);
                    }
                  }}
                >
                  <GripIcon />
                </button>

                <span className="flex shrink-0">
                  <button
                    type="button"
                    className={BUTTON_ICON}
                    aria-label={t("list.moveUp")}
                    disabled={disabled || index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ChevronIcon up />
                  </button>
                  <button
                    type="button"
                    className={BUTTON_ICON}
                    aria-label={t("list.moveDown")}
                    disabled={disabled || index === items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ChevronIcon />
                  </button>
                </span>

                <span
                  className={`w-24 shrink-0 text-label font-semibold ${
                    summary.leadUnconfirmed
                      ? "text-[color:var(--color-semantic-warning-text)]"
                      : "text-[color:var(--color-text-primary)]"
                  }`}
                >
                  {summary.lead}
                </span>

                <span className="flex min-w-0 grow items-center gap-2">
                  <span className="truncate text-body">{summary.title}</span>
                  {summary.mark}
                </span>

                <ItemStateBadge state={state} />

                <button
                  type="button"
                  className={BUTTON_SECONDARY}
                  aria-expanded={open}
                  aria-controls={`${rowId}-editor`}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  {open ? t("list.close") : t("list.edit")}
                </button>
              </div>

              {open ? (
                <div
                  id={`${rowId}-editor`}
                  className="mt-2 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-5"
                >
                  {children(item, patchAt(index), index)}

                  <div className="flex justify-end border-t border-[color:var(--color-border-subtle)] pt-4">
                    <button
                      type="button"
                      className={REMOVE_BUTTON}
                      disabled={disabled}
                      onClick={() => setPendingRemoval(index)}
                    >
                      {labels.removeItem}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={BUTTON_SECONDARY}
          disabled={disabled || full}
          aria-describedby={full ? `${id}-limit` : undefined}
          onClick={add}
        >
          {labels.addItem}
        </button>

        {full && labels.limitReached ? (
          <p id={`${id}-limit`} className="text-label text-[color:var(--color-text-muted)]">
            {labels.limitReached}
          </p>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={labels.removeTitle}
        confirmLabel={labels.removeItem}
        cancelLabel={t("list.cancel")}
        tone="destructive"
        onConfirm={() => {
          // Read at the moment the action runs, never from the value the flow
          // opened with (CLAUDE.md §31): the list may have been reordered
          // while the dialog stood open.
          if (pendingRemoval !== null && pendingRemoval < items.length) {
            remove(pendingRemoval);
          } else {
            setPendingRemoval(null);
          }
        }}
        onCancel={() => setPendingRemoval(null)}
      >
        {labels.removeBody}
      </ConfirmDialog>
    </div>
  );
};

/** Two facts in one badge: whether the item prints, and — when it does not —
 *  whether that was the editor's doing. An icon and words, never colour on its
 *  own (WCAG 1.4.1). */
const ItemStateBadge = ({ state }: { state: ItemState }) => {
  const t = useTranslations("AboutFederation");

  const tone =
    state === "visible"
      ? "bg-[color-mix(in_srgb,var(--color-semantic-success)_10%,transparent)] text-[color:var(--color-semantic-success-text)]"
      : "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-label font-semibold ${tone}`}
    >
      {state === "visible" ? <EyeIcon /> : <EyeOffIcon />}
      {t(`list.state.${state}`)}
    </span>
  );
};

/* Lucide paths, inlined per ADR-0068 D6.1 — no icon library. */

const GripIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);

const ChevronIcon = ({ up = false }: { up?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <path d="M17.94 17.94A10 10 0 0 1 2 12s4-7 10-7a9.7 9.7 0 0 1 5 1.4M1 1l22 22" />
  </svg>
);
