"use client";

import { useId } from "react";
import type { ReactNode } from "react";

/**
 * One choice from a small set, drawn as a card the whole of which is the target.
 *
 * -- Still a real radio ------------------------------------------------------
 *
 * The `<input type="radio">` is present and native, inside the `<label>`. It is
 * visually replaced by the ring drawn beside the text, not removed: that is
 * what gives the group arrow-key navigation, a single tab stop, correct
 * announcement as "1 of 3", and form semantics — none of which a `<div>` with
 * `role="radio"` gets without reimplementing all of it, badly.
 *
 * The input keeps a real size and is positioned under the drawn ring rather
 * than being `display: none`; a hidden input cannot receive focus in some
 * browsers, and `sr-only` on a focusable control makes the focus ring vanish.
 * `peer` drives both the ring and the card's own selected state, so the two
 * cannot disagree.
 *
 * -- Why a card and not a row of radios --------------------------------------
 *
 * The approved design draws each option as a card carrying a title and a line
 * of consequence ("changes automatically with every new video"). That line is
 * the reason the pattern exists: it turns three similar words into three
 * decisions someone can actually make.
 */
export const ChoiceCard = <T extends string>({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
  disabled = false,
}: {
  /** Shared across the group — this is what makes them one radio group. */
  name: string;
  value: T;
  checked: boolean;
  onSelect: (value: T) => void;
  title: string;
  description?: string;
  disabled?: boolean;
}) => {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={`group relative flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-4 transition-colors duration-[var(--motion-duration-fast)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-[var(--opacity-disabled)] ${
        checked
          ? "border-[color:var(--color-brand-primary)] bg-[color-mix(in_srgb,var(--color-brand-primary)_6%,transparent)]"
          : "border-[color:var(--color-border-default)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-skeleton)]"
      }`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        // `appearance-none` and zero opacity rather than `hidden`: the control
        // still takes focus and still sits under the ring it drives.
        className="peer absolute size-5 shrink-0 cursor-pointer appearance-none opacity-0"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-full)] border-2 transition-colors duration-[var(--motion-duration-fast)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--a11y-focus-ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[color:var(--a11y-focus-offset)] ${
          checked
            ? "border-[color:var(--color-brand-primary)]"
            : "border-[color:var(--color-border-strong)]"
        }`}
      >
        {checked ? (
          <span className="size-2.5 rounded-[var(--radius-full)] bg-[color:var(--color-brand-primary)]" />
        ) : null}
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body-sm font-semibold text-[color:var(--color-text-primary)]">{title}</span>
        {description ? (
          <span className="text-caption text-[color:var(--color-text-secondary)]">{description}</span>
        ) : null}
      </span>
    </label>
  );
};

/**
 * The cards, in a grid that becomes one column when there is no room.
 *
 * A `<fieldset>` with a `<legend>`, so the question is announced once before
 * the options rather than being a heading the group has no relationship to.
 */
export const ChoiceCardGroup = ({
  legend,
  legendHidden = false,
  columns = 2,
  children,
}: {
  legend: string;
  /**
   * Keeps the legend as the group's accessible name and stops drawing it.
   *
   * For a group that is the whole of its card, where the card's heading
   * already asks the question — printing it twice is noise on screen, and
   * dropping the legend instead would leave the radio group unnamed.
   */
  legendHidden?: boolean;
  columns?: 2 | 3;
  children: ReactNode;
}) => (
  <fieldset className="flex flex-col gap-2 border-0 p-0">
    <legend
      className={
        legendHidden ? "sr-only" : "mb-2 text-label font-bold text-[color:var(--color-text-primary)]"
      }
    >
      {legend}
    </legend>
    <div className={`grid gap-3 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>{children}</div>
  </fieldset>
);
