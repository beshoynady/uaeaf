"use client";

import { useTranslations } from "next-intl";
import type { SeasonPhaseType } from "@/lib/admin/seasons/types";

/**
 * One treatment per phase type, from the identity palette (owner decision).
 *
 * Red is deliberately absent: the colour-hierarchy governance (ADR-0050)
 * holds red to alert and live states, and routine chrome would spend it.
 * Every pair below is text on its own ground, AA or better in every theme,
 * because the four tokens are primitives no theme redefines:
 *
 * | type          | ink on ground | ratio   |
 * |---------------|---------------|---------|
 * | preparation   | warm-900/200  | 12.23:1 |
 * | domestic      | white/green-700 | 9.40:1 |
 * | international | white/black   | 21.00:1 |
 * | rest          | warm-700/50   | 8.65:1  |
 *
 * Colour is never the only difference: every chip carries the type's name.
 */
export const PHASE_TREATMENT: Record<SeasonPhaseType, string> = {
  preparation: "bg-[color:var(--color-neutral-warm-200)] text-[color:var(--color-neutral-warm-900)]",
  domestic: "bg-[color:var(--color-green-700)] text-[color:var(--color-text-on-brand)]",
  international: "bg-[color:var(--color-brand-black)] text-[color:var(--color-white)]",
  rest: "border border-dashed border-[color:var(--color-neutral-warm-400)] bg-[color:var(--color-neutral-warm-50)] text-[color:var(--color-neutral-warm-700)]",
};

/** The type's name on the type's treatment. */
export const PhaseTypeChip = ({ type }: { type: SeasonPhaseType }) => {
  const t = useTranslations("Seasons");
  return (
    <span
      data-phase-type={type}
      className={`inline-flex min-h-6 items-center rounded-[var(--radius-full)] px-2.5 text-caption font-medium ${PHASE_TREATMENT[type]}`}
    >
      {t(`phaseType_${type}`)}
    </span>
  );
};
