"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";

/**
 * CMP-CONFIRMATIONDIALOG-001 — the pause before an action that is hard to
 * take back.
 *
 * Built on the platform's `<dialog>` and `showModal()` rather than a
 * dependency, because that one call is the whole of what a dependency would
 * be bought for: the top layer, the backdrop, the inert rest of the page, the
 * focus trap, `Esc`, and returning focus to whatever opened it — all of it
 * specified behaviour rather than something this file has to re-implement and
 * keep correct.
 *
 * The two rules the chapter is emphatic about, and how each is met:
 *
 * - **"MUST NOT be accidentally confirmed by a default-focused action."**
 *   Focus lands on Cancel when the dialog opens. `<dialog>` focuses the first
 *   focusable descendant by default, so Cancel is rendered first in the DOM
 *   and placed second visually with `order` — the reading order the reader
 *   sees is Confirm-then-Cancel, and the key they press first lands on the
 *   safe one.
 * - **"`Enter` MUST NOT automatically confirm irreversible actions."** There
 *   is no form and no submit button here, so nothing is implicitly submitted.
 *   `Enter` activates whatever is focused, which is Cancel.
 *
 * `Esc` closes it, which the chapter allows for a Dialog and forbids only for
 * a Blocking Dialog (FB.12) — this is not one.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What confirming will do, in the reader's words. */
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** `destructive` for anything that removes or overwrites (ADR-0004). */
  tone?: "primary" | "destructive";
  /** True while the confirmed action is running. The dialog stays open and
   *  both buttons lock, so a second Enter cannot run it twice. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      // `cancel` is what `Esc` fires. Routed through the same handler as the
      // Cancel button so the parent has one way to learn the answer was no,
      // and `preventDefault` keeps the element's own state in step with the
      // `open` prop that actually controls it.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          onCancel();
        }
      }}
      // The backdrop is the dialog's own box outside its content, so a click
      // that lands on the element itself — never on a child — is a click
      // outside. Dismissible, per CMP-DIALOG-001.
      onClick={(event) => {
        if (event.target === ref.current && !busy) {
          onCancel();
        }
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-0 text-[color:var(--color-text-primary)] backdrop:bg-[color:var(--color-surface-overlay)]/50"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 id={titleId} className="text-h4 font-bold">
          {title}
        </h2>
        <div id={bodyId} className="text-body text-[color:var(--color-text-secondary)]">
          {children}
        </div>

        {/*
          Cancel first in the DOM so it takes the dialog's initial focus, and
          second in the reading order so the action the reader came for still
          reads first. `order` is logical, so the pair swaps with the text
          direction on its own.
        */}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={onCancel} className="order-2">
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "primary"}
            loading={busy}
            onClick={onConfirm}
            className="order-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
