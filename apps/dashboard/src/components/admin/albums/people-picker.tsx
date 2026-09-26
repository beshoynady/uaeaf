"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { SearchField } from "@/components/ui/search-field";
import { BUTTON_ICON, SELECTABLE_ROW } from "@/components/ui/interactive";
import { UiIcon } from "@/lib/icons/ui-icons";
import type { PeopleKind, PersonOption } from "@/lib/admin/albums/types";

/**
 * Who appears in the album: athletes, or clubs. Several of each.
 *
 * -- A search with its results in the page, not a dropdown ----------------
 *
 * The results are a plain list of toggle buttons drawn under the field, not a
 * floating listbox. A combobox popup needs a roving active descendant, arrow
 * keys, an Escape that closes without clearing, and a scroll container that
 * does not clip — each a place to get keyboard access wrong. A list of
 * `aria-pressed` buttons is operable with Tab and Space and announces its own
 * state, and it cannot cover the fields beneath it.
 *
 * -- Async, and only the last answer counts --------------------------------
 *
 * Each keystroke (after a short pause) asks the route handler, which searches
 * the API's public list. Answers can arrive out of order on a slow link, so
 * each request is aborted when the next one starts: a stale answer for "مح"
 * must never replace the one for "محمد".
 */

/** Long enough that typing a name is one request, short enough that the list
 *  keeps up with a reader who pauses. */
const SEARCH_PAUSE_MS = 250;

type SearchState = "idle" | "searching" | "done" | "failed";

export const PeoplePicker = ({
  kind,
  label,
  selected,
  onChange,
  locale,
  disabled = false,
}: {
  kind: PeopleKind;
  label: string;
  selected: readonly PersonOption[];
  onChange: (next: PersonOption[]) => void;
  locale: "ar" | "en";
  disabled?: boolean;
}) => {
  const t = useTranslations("Albums");
  const listId = useId();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PersonOption[]>([]);
  const [state, setState] = useState<SearchState>("idle");

  useEffect(() => {
    if (term.trim() === "") {
      setResults([]);
      setState("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState("searching");
      try {
        const response = await fetch(`/api/admin/albums/people?kind=${kind}&q=${encodeURIComponent(term.trim())}`, {
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => null)) as { items?: PersonOption[] } | null;
        if (!response.ok || !Array.isArray(body?.items)) {
          setState("failed");
          return;
        }
        setResults(body.items);
        setState("done");
      } catch {
        // An abort is the next keystroke taking over, not a failure.
        if (!controller.signal.aborted) setState("failed");
      }
    }, SEARCH_PAUSE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, kind]);

  const nameOf = (person: PersonOption) => person.name[locale] || person.name.ar || person.name.en || t("unnamedPerson");
  const chosen = new Set(selected.map((person) => person.id));

  const toggle = (person: PersonOption) =>
    onChange(chosen.has(person.id) ? selected.filter((entry) => entry.id !== person.id) : [...selected, person]);

  return (
    <fieldset className="flex min-w-0 flex-col gap-3 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 text-label font-bold text-[color:var(--color-text-primary)]">{label}</legend>

      {/* What is already chosen, each removable in one press. */}
      {selected.length > 0 ? (
        <ul aria-label={t("chosenLabel", { label })} className="flex flex-wrap gap-2">
          {selected.map((person) => (
            <li
              key={person.id}
              className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[color:var(--color-surface-sunken)] ps-3 text-body-sm text-[color:var(--color-text-primary)]"
            >
              <span>{nameOf(person)}</span>
              <button
                type="button"
                aria-label={t("removePerson", { name: nameOf(person) })}
                onClick={() => toggle(person)}
                className={BUTTON_ICON}
              >
                <UiIcon name="x" className="size-[var(--icon-size-xs)]" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("noneChosen")}</p>
      )}

      <SearchField label={t("searchPeople", { label })} value={term} onValueChange={setTerm} disabled={disabled} />

      {/* Announced politely, so a screen-reader user hears the result count
          without the list stealing focus. */}
      <p role="status" className="text-caption text-[color:var(--color-text-secondary)]">
        {state === "searching"
          ? t("searching")
          : state === "failed"
            ? t("searchFailed")
            : state === "done"
              ? t("searchResults", { count: results.length })
              : ""}
      </p>

      {results.length > 0 ? (
        <ul id={listId} aria-label={t("resultsLabel", { label })} className="flex flex-col gap-2">
          {results.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                aria-pressed={chosen.has(person.id)}
                onClick={() => toggle(person)}
                className={`${SELECTABLE_ROW} flex items-center justify-between gap-3`}
              >
                <span className="text-body-sm text-[color:var(--color-text-primary)]">{nameOf(person)}</span>
                <span className="text-caption text-[color:var(--color-text-secondary)]">
                  {chosen.has(person.id) ? t("chosen") : t("choose")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
};
