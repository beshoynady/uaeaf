"use client";

import { Button } from "@/components/ui/button";
import { UiIcon } from "@/lib/icons/ui-icons";

/**
 * Adding and removing a row, for the two row editors of the season form — the
 * phases and the key dates. One pair of controls rather than two copies: the
 * same words, the same icon and the same disabled rule, in both places.
 */
export const AddRowButton = ({ label, disabled, onAdd }: { label: string; disabled: boolean; onAdd: () => void }) => (
  <div>
    <Button variant="secondary" disabled={disabled} onClick={onAdd}>
      <span className="inline-flex items-center gap-1.5">
        <UiIcon name="plus" className="size-[var(--icon-size-xs)]" />
        {label}
      </span>
    </Button>
  </div>
);

/** Named for the row it removes — "Remove phase 2" — because a column of
 *  identical "Remove" buttons tells a screen-reader user nothing about which
 *  row each one takes away. */
export const RemoveRowButton = ({
  label,
  disabled,
  onRemove,
}: {
  label: string;
  disabled: boolean;
  onRemove: () => void;
}) => (
  <Button variant="icon" aria-label={label} title={label} disabled={disabled} onClick={onRemove}>
    <UiIcon name="x" className="size-[var(--icon-size-sm)]" />
  </Button>
);

/** A row's closing line: its problem, when there is one, and its remove
 *  control at the inline end. The problem is announced as it appears, since
 *  it appears only after a save press. */
export const RowFooter = ({
  error,
  removeLabel,
  disabled,
  onRemove,
}: {
  error: string | null;
  removeLabel: string;
  disabled: boolean;
  onRemove: () => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    {error ? (
      <p role="alert" className="text-caption font-medium text-[color:var(--color-text-primary)]">
        {error}
      </p>
    ) : (
      <span />
    )}
    <RemoveRowButton label={removeLabel} disabled={disabled} onRemove={onRemove} />
  </div>
);
