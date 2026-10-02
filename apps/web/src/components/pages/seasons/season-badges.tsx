import { useTranslations } from "next-intl";
import type { SeasonPhase } from "@/lib/seasons/types";
import type { AppLocale } from "@/i18n/routing";
import { PhaseSwatch } from "./phase-swatch";

const PILL =
  "inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[color:var(--surface-border)] bg-[color:var(--surface-raised)] px-3 py-1 text-body-sm font-bold text-[color:var(--surface-text)]";

/**
 * "Current season" and the phase or phases running today, as the hero and the
 * archive's featured card both carry them. Read from the surface they sit on,
 * so they need no knowledge of the ground. Nothing at all when neither applies.
 */
export const SeasonBadges = ({
  isCurrent,
  phases,
  locale,
}: {
  isCurrent: boolean;
  /** The phases running today (`currentPhases`), possibly overlapping. */
  phases: readonly SeasonPhase[];
  locale: AppLocale;
}) => {
  const t = useTranslations("Seasons.badges");
  if (!isCurrent && phases.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {isCurrent ? (
        <li className={PILL}>
          <span aria-hidden="true" className="size-2 rounded-[var(--radius-full)] bg-[color:var(--surface-accent,var(--surface-text))]" />
          {t("current")}
        </li>
      ) : null}
      {phases.map((phase) => (
        <li key={`${phase.type}-${phase.from}`} className={PILL}>
          <PhaseSwatch type={phase.type} />
          {t("phase", { name: phase.name[locale] })}
        </li>
      ))}
    </ul>
  );
};
