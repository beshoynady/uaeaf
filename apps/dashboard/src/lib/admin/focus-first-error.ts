"use client";

/**
 * Sends the author to the first field the save is waiting on.
 *
 * ── Why the button stays enabled ───────────────────────────────────────────
 *
 * A disabled save button is a dead end: it states that something is wrong and
 * refuses to say what, and it cannot be focused, so a screen-reader user
 * tabbing to it finds nothing at all. Keeping it live and answering the press
 * with "here is the field" turns the same refusal into a direction.
 *
 * ── Why the section is opened first ────────────────────────────────────────
 *
 * The form's parts are `<details>`, and a collapsed one has its inputs in the
 * DOM but not laid out. Calling `focus()` on a field inside a closed drawer
 * moves focus somewhere invisible — the page looks unchanged and the keyboard
 * is now somewhere the author cannot see. So the drawer is opened, then the
 * field is focused.
 *
 * `scrollIntoView` is `smooth` unless the reader asked for less motion, which
 * is the one place this decision can be made for every caller at once.
 */
export const focusFirstError = (fieldId: string): void => {
  const field = document.getElementById(fieldId);
  if (!field) {
    return;
  }

  // Opened before focusing: a field inside a closed drawer can take focus
  // while being invisible, which strands the keyboard off-screen.
  field.closest("details")?.setAttribute("open", "");

  // Focus first, and never behind anything that can throw. Moving the
  // keyboard to the field is the whole point; bringing it into view is a
  // nicety, and `scrollIntoView` and `matchMedia` are both absent in some
  // environments — putting them first meant the focus never happened at all.
  field.focus({ preventScroll: true });

  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  field.scrollIntoView?.({ behavior: still ? "auto" : "smooth", block: "center" });
};
