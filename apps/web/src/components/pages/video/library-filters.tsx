"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PlatformChipMark } from "./platform-badge";
import { VIDEO_CATEGORIES, VIDEO_PLATFORMS } from "@/lib/video/types";
import { rangeIsPossible } from "@uaeaf/content/time-range";
import { VIDEO_PERIODS, activeFilterCount } from "@/lib/video/library-query";
import type { LibraryQuery, VideoPeriod } from "@/lib/video/library-query";
import type { AssociationOption } from "@/lib/video/association-options";
import { FOCUS } from "@/components/ui/interactive";
import { Button, BRAND_FOCUSABLE } from "@uaeaf/brand-ui";

/**
 * The library's filter panel: a popover on a wide screen, a bottom sheet on a
 * narrow one.
 *
 * -- Why one component for both -------------------------------------------
 *
 * They hold the same controls, write the same address and close the same way.
 * Two components would be two places to remember that the season select is
 * hidden while nothing can fill it, and one of them would eventually not.
 * The difference is entirely CSS: anchored and auto-width above `sm`,
 * stuck to the bottom edge and full-width below it.
 *
 * -- Draft, then apply -----------------------------------------------------
 *
 * The panel edits a draft and writes the address once, on Apply. Navigating on
 * every tick would refetch the list four times while someone sets four
 * filters, and each refetch would re-render the panel under their hand.
 * The tabs and the search field outside the panel navigate immediately,
 * because each of those is one decision that is already complete.
 *
 * -- The link field --------------------------------------------------------
 *
 * The championship / event control is built and wired, and it renders NOTHING
 * while `associations` is empty -- which is always, today: no championship or
 * event entity exists. A select with no options is a dead affordance, and one
 * offering invented names would let a reader filter by something that is not
 * there. The day the entity ships, the adapter returns rows and this appears.
 */

export const LibraryFilters = ({
  query,
  seasons,
  associations,
  onApply,
  onClear,
}: {
  query: LibraryQuery;
  /** Season labels the library actually holds. Empty means the control is not
   *  drawn: "all seasons" as the only option is not a choice. */
  seasons: readonly string[];
  associations: readonly AssociationOption[];
  onApply: (change: Partial<LibraryQuery>) => void;
  onClear: () => void;
}) => {
  const t = useTranslations("VideoSystem");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const ids = { season: useId(), period: useId(), from: useId(), to: useId(), link: useId(), panel: useId() };

  // The draft is the address, whenever the address changes under it: a reader
  // pressing Back should find the panel showing the filters they went back to.
  useEffect(() => setDraft(query), [query]);

  // Escape closes and returns focus to the trigger, which is where the reader
  // was before they opened it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || trigger.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const set = <K extends keyof LibraryQuery>(key: K, value: LibraryQuery[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // The address would carry an impossible range that `readLibraryQuery` then
  // drops, so the reader would see an unfiltered list and two empty date
  // fields when they reopened the panel — their input gone with no word said.
  const rangeIsUsable =
    draft.period !== "custom" || rangeIsPossible(draft.range.from, draft.range.to);

  const apply = () => {
    if (!rangeIsUsable) return;
    setOpen(false);
    onApply({
      platform: draft.platform,
      category: draft.category,
      season: draft.season,
      association: draft.association,
      period: draft.period,
      range: draft.period === "custom" ? draft.range : {},
    });
  };

  /*
   * The kit's chip, driven by `aria-pressed` rather than by two class strings.
   *
   * `.brand-filter-chip` carries the resting edge, the hover tint, the selected
   * plate and the focus indicator — the four things this function used to
   * assemble from `vs-ghost vs-edge` and an inline style. The edge it draws is
   * `--surface-border` at 6.44:1 on ink, where `.vs-edge` drew
   * `--surface-divider` at 2.94:1 and failed WCAG 1.4.11.
   */
  // `brand-ring` is not optional: `.brand-filter-chip` paints its edge through
  // that shared masked band, so the chip has no edge at all without it.
  const chip = () => "brand-filter-chip brand-ring";

  /*
   * The select keeps a hand-written class: the kit publishes no select, and a
   * native `<select>` is the right control for a one-of-many filter on a touch
   * screen. Only two things changed — the fill is the published token, and the
   * edge moved from `--surface-divider` (2.94:1) to `--surface-border`
   * (6.44:1), which is the floor WCAG 1.4.11 sets for a control's boundary.
   *
   * DESIGN SYSTEM GAP, recorded: the kit has no select control.
   */
  const field =
    `vs-fill-strong min-h-11 w-full rounded-[var(--radius-full)] px-4 text-body-sm ${BRAND_FOCUSABLE}`;
  const fieldStyle = {
    color: "var(--surface-text)",
    border: "var(--border-width-default) solid var(--surface-border)",
  };

  // The same function the empty state's "clear filters" is gated on. Two
  // counts that disagree put a badge of 0 next to a button offering to clear
  // something — which is what a locally written expression here produced.
  const count = activeFilterCount(query);

  return (
    <div className="relative">
      <Button
        ref={trigger}
        variant="secondary"
        aria-expanded={open}
        aria-controls={ids.panel}
        onClick={() => setOpen((was) => !was)}
      >
        {count > 0 ? (
          <span
            className="inline-flex size-5 items-center justify-center rounded-full text-[0.6875rem] font-bold"
            style={{ background: "var(--surface-btn-primary-bg)", color: "var(--surface-btn-primary-ink)" }}
          >
            {count}
          </span>
        ) : null}
        {t("filters")}
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M4 7h16M7 12h10M10 17h4" />
        </svg>
      </Button>

      {open ? (
        <div
          ref={panel}
          id={ids.panel}
          role="group"
          aria-label={t("filtersTitle")}
          /* Below `sm` it is a sheet against the bottom edge; above it, a
             popover under the trigger.
             
             Anchored by its `end`, not its `start`. The trigger is the last
             control in a row justified to the end, so its outer edge is
             already the page edge: a panel anchored at `start-0` hangs
             OUTWARD from there and leaves the viewport. Measured in Arabic at
             1440 — the panel ran from x=-186 to x=166 and gave the document a
             horizontal scrollbar. `end-0` opens it inward, which is on-screen
             in both directions because the trigger is at the outer edge in
             both. The `max-w` is the backstop for any width where 22rem plus
             the page gutter would still not fit. */
          className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col gap-5 overflow-y-auto p-5 sm:absolute sm:inset-auto sm:top-full sm:end-0 sm:mt-2 sm:max-h-none sm:w-[22rem] sm:max-w-[calc(100vw-2rem)]"
          style={{
            border: "1px solid var(--surface-divider)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 24px 60px -20px color-mix(in srgb, var(--color-surface-overlay) 70%, transparent)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-h5 font-bold" style={{ color: "var(--surface-text)" }}>
              {t("filtersTitle")}
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
              aria-label={t("filtersClose")}
              className={`inline-flex size-11 items-center justify-center rounded-full ${FOCUS}`}
              style={{ color: "var(--surface-text-muted)" }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-caption font-bold" style={{ color: "var(--surface-text-muted)" }}>
              {t("filterPlatform")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {VIDEO_PLATFORMS.map((platform) => {
                const selected = draft.platform === platform;
                return (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => set("platform", selected ? undefined : platform)}
                    className={chip()}
                  >
                    {t(`platform_${platform}`)}
                    <PlatformChipMark platform={platform} size={18} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-caption font-bold" style={{ color: "var(--surface-text-muted)" }}>
              {t("filterCategory")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {VIDEO_CATEGORIES.map((category) => {
                const selected = draft.category === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => set("category", selected ? undefined : category)}
                    className={chip()}
                  >
                    {t(`category_${category}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Drawn only when the library actually spans more than one season. */}
          {seasons.length > 1 ? (
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.season} className="text-caption font-bold" style={{ color: "var(--surface-text-muted)" }}>
                {t("filterSeason")}
              </label>
              <select
                id={ids.season}
                value={draft.season ?? ""}
                onChange={(event) => set("season", event.target.value || undefined)}
                className={field}
                style={fieldStyle}
              >
                <option value="">{t("filterSeasonAll")}</option>
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Nothing at all while the adapter is empty -- see the file header. */}
          {associations.length > 0 ? (
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.link} className="text-caption font-bold" style={{ color: "var(--surface-text-muted)" }}>
                {t("filterAssociation")}
              </label>
              <select
                id={ids.link}
                value={draft.association ?? ""}
                onChange={(event) => set("association", event.target.value || undefined)}
                className={field}
                style={fieldStyle}
              >
                <option value="">{t("filterAssociationAll")}</option>
                {associations.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.period} className="text-caption font-bold" style={{ color: "var(--surface-text-muted)" }}>
              {t("filterPeriod")}
            </label>
            <select
              id={ids.period}
              value={draft.period}
              onChange={(event) => set("period", event.target.value as VideoPeriod)}
              className={field}
              style={fieldStyle}
            >
              {VIDEO_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {t(`period_${period}`)}
                </option>
              ))}
            </select>
          </div>

          {/* The two date fields exist only while "custom" is chosen: a pair of
              empty date inputs under every other period is two controls that
              do nothing. */}
          {draft.period === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor={ids.from} className="text-caption" style={{ color: "var(--surface-text-muted)" }}>
                  {t("filterFrom")}
                </label>
                <input
                  id={ids.from}
                  type="date"
                  value={draft.range.from ?? ""}
                  onChange={(event) => set("range", { ...draft.range, from: event.target.value || undefined })}
                  className={field}
                  style={fieldStyle}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor={ids.to} className="text-caption" style={{ color: "var(--surface-text-muted)" }}>
                  {t("filterTo")}
                </label>
                <input
                  id={ids.to}
                  type="date"
                  value={draft.range.to ?? ""}
                  onChange={(event) => set("range", { ...draft.range, to: event.target.value || undefined })}
                  className={field}
                  style={fieldStyle}
                />
              </div>
              {rangeIsUsable ? null : (
                <p role="status" className="col-span-2 text-caption" style={{ color: "var(--color-semantic-error-text)" }}>
                  {t("rangeBackwards")}
                </p>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onClear();
              }}
              className={`inline-flex min-h-11 items-center px-2 text-body-sm underline-offset-4 hover:underline ${FOCUS}`}
              style={{ color: "var(--surface-text-muted)" }}
            >
              {t("clearAll")}
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!rangeIsUsable}
              className={`inline-flex min-h-11 items-center rounded-[var(--radius-full)] px-6 text-body-sm font-bold transition-[filter] duration-[var(--motion-duration-fast)] hover:brightness-110 ${FOCUS} disabled:opacity-45`}
              style={{ background: "var(--surface-btn-primary-bg)", color: "var(--surface-btn-primary-ink)" }}
            >
              {t("apply")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
