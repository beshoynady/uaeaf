"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/auth/text-field";
import { TIME_RANGE_PRESETS, activePreset, presetRange, rangeIsPossible } from "@uaeaf/content/time-range";
import type { TimeRange } from "@uaeaf/content/time-range";

/**
 * Narrowing the newsroom's own list to a stretch of time.
 *
 * ── Why the same logic as the public filter ────────────────────────────────
 *
 * `@uaeaf/content/time-range` decides what "this week" covers, for both
 * screens. An editor narrowing their list to "this month" and a visitor
 * narrowing the public feed to "this month" have to be looking at the same
 * days, or the editor cannot tell what the public sees — and two copies of
 * that arithmetic drift.
 *
 * ── Why the controls are this app's own ────────────────────────────────────
 *
 * `field-standard.spec.tsx` scans this application's source and requires every
 * control to be one of its shared field components. A control shipped from the
 * package would not be scanned — which is worse than a second presentation
 * layer, because it would bypass a contract rather than satisfy it. So the
 * vocabulary and the boundaries are shared and the buttons are ours.
 *
 * ── Why it filters what is already loaded ──────────────────────────────────
 *
 * The list's other controls do (`article-list.tsx`): a newsroom's page of rows
 * is small, and a round trip per press would make the filter feel broken on
 * the connection this is most likely used over.
 */
export const NewsTimeFilter = ({
  range,
  onChange,
}: {
  range: TimeRange;
  onChange: (range: TimeRange) => void;
}) => {
  const t = useTranslations("Newsroom");
  const fieldId = useId();
  const active = activePreset(range);
  const filtered = Boolean(range.from || range.to);
  const impossible = !rangeIsPossible(range.from, range.to);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-label font-medium text-[color:var(--color-text-secondary)]">
          {t("timeFilterLabel")}
        </span>

        {/* Wrapped, never clipped: five labels do not fit one row beside the
            other filters, and a clipped row hides a control an editor is
            looking for. */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filtered ? "secondary" : "primary"}
            aria-pressed={!filtered}
            onClick={() => onChange({})}
          >
            {t("timeAll")}
          </Button>

          {TIME_RANGE_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={active === preset ? "primary" : "secondary"}
              // `aria-pressed` rather than the variant alone: which button is
              // filled is not information a screen reader can see.
              aria-pressed={active === preset}
              onClick={() => onChange(presetRange(preset))}
            >
              {t(`time_${preset}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {(["from", "to"] as const).map((bound) => (
          <TextField
            key={bound}
            id={`${fieldId}-${bound}`}
            label={t(`time_${bound}`)}
            type="date"
            value={range[bound] ?? ""}
            onChange={(event) => onChange({ ...range, [bound]: event.target.value || undefined })}
            // The message sits on the second bound, which is the one the editor
            // just moved into an impossible position.
            error={impossible && bound === "to" ? t("errorRange") : null}
          />
        ))}
      </div>
    </div>
  );
};
