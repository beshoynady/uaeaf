"use client";

import { useTranslations } from "next-intl";
import { phaseLanes } from "@/lib/admin/seasons/phase-strip";
import type { PhaseDraft } from "@/lib/admin/seasons/season-draft";
import { PHASE_TREATMENT } from "./phase-type-chip";

/**
 * The season's phases drawn across its days, one lane per type (dash-02).
 *
 * A summary of the rows beneath it, not a second way to edit them, so it is
 * hidden from assistive technology: the rows are the accessible source and
 * reading both would say everything twice. Each bar carries its type's name
 * as well as its colour.
 */
export const PhaseStrip = ({ start, end, phases }: { start: string; end: string; phases: readonly PhaseDraft[] }) => {
  const t = useTranslations("Seasons");
  const lanes = phaseLanes(start, end, phases);
  if (lanes.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      data-phase-strip
      className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-2"
    >
      {lanes.map((lane) => (
        <div key={lane.type} className="relative min-h-6">
          {lane.spans.map((span) => (
            <span
              key={span.key}
              data-phase-type={span.type}
              className={`absolute inset-y-0 flex items-center overflow-hidden rounded-[var(--radius-sm)] px-2 text-caption font-medium ${PHASE_TREATMENT[span.type]}`}
              style={{ insetInlineStart: `${span.startPercent}%`, width: `${span.widthPercent}%` }}
            >
              <span className="truncate">{t(`phaseType_${span.type}`)}</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
