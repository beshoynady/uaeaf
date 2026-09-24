"use client";

import { useId, useRef } from "react";

export type SearchFieldProps = {
  /**
   * A real label, always. Required by the type because a placeholder is not a
   * label: it disappears the moment someone types, and it is not announced as
   * one. `labelHidden` still renders it for assistive technology.
   */
  label: string;
  /** Hides the label visually where the surrounding composition already says what this is. */
  labelHidden?: boolean;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  /** Accessible name for the clear button, e.g. "مسح البحث". */
  clearLabel: string;
  className?: string;
};

/**
 * A text search with a tricolour edge and a clear button.
 *
 * **`type="text"`, not `type="search"`.** Chromium clears a `type="search"`
 * input on the first Escape press and fires no `cancel` event, so inside a
 * dialog the first Escape wipes the query instead of closing the dialog — and
 * jsdom does not reproduce it, so a test suite stays green while the real
 * browser eats a keystroke. This project measured that behaviour once already.
 * `role="searchbox"` keeps the announced role right without the behaviour.
 *
 * The clear button appears only when there is something to clear, and returns
 * focus to the input afterwards — otherwise focus lands on a button that has
 * just removed itself from the page, and the next Tab starts from the top.
 */
export const SearchField = ({
  label,
  labelHidden = false,
  value,
  onValueChange,
  placeholder,
  clearLabel,
  className,
}: SearchFieldProps) => {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  const clear = () => {
    onValueChange("");
    input.current?.focus();
  };

  return (
    <div className={["brand-search-field", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={id}
        className={labelHidden ? "brand-visually-hidden" : "brand-search-field__label"}
      >
        {label}
      </label>
      {/* Its own neutral plate, so the input and the clear button read this
          ground rather than the section's — the same reason DocumentCard's body
          does it. Chapter 27 §20: a field never sits on a coloured ground. */}
      <div className="brand-search-field__control brand-ring" data-surface="raised">
        <input
          ref={input}
          id={id}
          type="text"
          role="searchbox"
          className="brand-search-field__input"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
        />
        {value === "" ? null : (
          <button
            type="button"
            className="brand-search-field__clear"
            aria-label={clearLabel}
            onClick={clear}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>
    </div>
  );
};
