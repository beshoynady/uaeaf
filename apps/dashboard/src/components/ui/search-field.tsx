"use client";

import { FIELD_INPUT, FIELD_SHELL } from "./interactive";

/**
 * The one search control.
 *
 * There were five, byte-identical apart from the placeholder, across
 * `role-list`, `permission-catalogue-lens`, `page-workbench`, `role-workbench`
 * and `user-directory`. All five removed the focus outline and drew no
 * replacement — a WCAG 2.4.7 failure on the primary filter of four admin
 * screens, repeated because the control was copied rather than shared.
 *
 * The indicator sits on the `<label>` shell via `focus-within:`, not on the
 * input: the input fills the shell edge to edge, so a ring drawn on it would
 * be clipped by the shell's own border radius.
 */
export function SearchField({
  label,
  value,
  onValueChange,
  dir,
  disabled,
  className,
}: {
  /** The accessible name. Rendered visually hidden — every call site wants it
   *  read but not shown — and reused as the placeholder so the field is also
   *  self-describing to sighted users. */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** `"ltr"` where the searched content is Latin regardless of UI language,
   *  such as the permission matrix's resource identifiers. */
  dir?: "ltr" | "rtl";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`${FIELD_SHELL}${className ? ` ${className}` : ""}`}>
      <span className="sr-only">{label}</span>
      <SearchIcon />
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={label}
        dir={dir}
        disabled={disabled}
        className={`${FIELD_INPUT}${dir === "ltr" ? " text-start" : ""}`}
      />
    </label>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="size-[var(--icon-size-xs)] shrink-0 text-[color:var(--color-text-muted)]"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="m17 17-3.5-3.5" />
    </svg>
  );
}
