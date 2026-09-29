"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * The second press before something that cannot be taken back, drawn in place.
 *
 * Not `ConfirmDialog`: the album and season screens carry no overlays of any
 * kind (owner brief for the albums module — "no drawer, no popup, for
 * anything" — and the seasons list follows the same screens). The question
 * appears where the action was asked for, and the rest of the screen stays
 * readable beside it, which matters most when the thing being deleted is a
 * selection the editor wants to check before confirming.
 *
 * In `ui/` because two unrelated screens use it. `tone` says what kind of
 * irreversible step is being confirmed: `destructive` for a removal, and
 * `primary` for a step that replaces something without destroying it —
 * making a different season current moves a public redirect, and a red
 * button would call that a deletion.
 *
 * The two rules `ConfirmDialog` keeps, kept here too:
 *
 * - **Nothing is confirmed by a default focus.** Focus moves to Cancel when the
 *   strip appears, so an Enter that was meant for the button that opened it
 *   lands on the safe choice.
 * - **The strip announces itself.** `role="alert"`, because it appeared without
 *   a navigation and a screen-reader user would otherwise not know a question
 *   is waiting.
 */
export const InlineConfirm = ({
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
  tone = "destructive",
  onConfirm,
  onCancel,
}: {
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  tone?: "destructive" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const cancelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cancelRef.current?.querySelector("button")?.focus();
  }, []);

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border ${
        tone === "destructive"
          ? "border-[color:var(--color-semantic-error)]"
          : "border-[color:var(--color-brand-primary)]"
      } bg-[color:var(--color-surface-raised)] px-4 py-3`}
    >
      <p className="text-body-sm font-medium text-[color:var(--color-text-primary)]">{message}</p>
      <div className="flex flex-wrap items-center gap-2">
        {/* Cancel first in the DOM so it takes focus, drawn second with
            `order` so the reading order is confirm-then-cancel. */}
        <div ref={cancelRef} className="order-2">
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
        <div className="order-1">
          <Button variant={tone} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
