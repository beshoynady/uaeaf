"use client";

import { useTranslations } from "next-intl";
import { FOCUS_RING } from "@/components/ui/interactive";
import type { AboutSectionKey, Notice } from "@/lib/admin/about-readiness";

/**
 * What stands between the draft and the reviewer, at three levels.
 *
 * The levels differ by what the editor is expected to do, and the panel says
 * so rather than making them guess:
 *
 * - **required** — the submission is closed until it is fixed. One thing
 *   qualifies: a field written in one language and not the other.
 * - **warning** — publishable. An empty picture slot prints an
 *   identity-coloured surface, which is a design, not a failure.
 * - **info** — nothing to fix. An undated milestone is being withheld exactly
 *   as intended; the line exists so its absence is never a surprise.
 *
 * Every line is a link to the section it names. A notice an editor cannot act
 * from is a complaint, and one that makes them hunt for the field is a slower
 * complaint.
 */
export const ReadinessPanel = ({
  notices,
  onGoTo,
}: {
  notices: readonly Notice[];
  onGoTo: (section: AboutSectionKey) => void;
}) => {
  const t = useTranslations("AboutFederation");

  if (notices.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-semantic-success)] bg-[color-mix(in_srgb,var(--color-semantic-success)_10%,transparent)] px-4 py-3">
        <CheckIcon />
        <p className="text-label font-semibold text-[color:var(--color-semantic-success-text)]">{t("beforeSubmit.clear")}</p>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="about-readiness-title"
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-semantic-warning)] bg-[color-mix(in_srgb,var(--color-semantic-warning)_10%,transparent)] p-4"
    >
      <h3 id="about-readiness-title" className="text-label font-bold text-[color:var(--color-semantic-warning-text)]">
        {t("beforeSubmit.title", { count: notices.length })}
      </h3>

      <ul className="flex flex-col gap-2">
        {notices.map((notice, index) => (
          <li key={`${notice.section}-${notice.kind}-${index}`}>
            <button
              type="button"
              className={`flex w-full items-start gap-2.5 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-3 py-2.5 text-start hover:border-[color:var(--color-border-strong)] active:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-sunken)] ${FOCUS_RING}`}
              onClick={() => onGoTo(notice.section)}
            >
              <LevelBadge level={notice.level} />
              <span className="text-label leading-relaxed">
                {t(`beforeSubmit.${notice.kind}`, {
                  section: t(`section.${notice.section}`),
                  count: notice.count,
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

const LEVEL_TONES = {
  required: "bg-[color-mix(in_srgb,var(--color-semantic-error)_10%,transparent)] text-[color:var(--color-semantic-error-text)]",
  warning: "bg-[color-mix(in_srgb,var(--color-semantic-warning)_10%,transparent)] text-[color:var(--color-semantic-warning-text)]",
  info: "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]",
} as const;

const LevelBadge = ({ level }: { level: Notice["level"] }) => {
  const t = useTranslations("AboutFederation");

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-caption font-bold ${LEVEL_TONES[level]}`}
    >
      {t(`beforeSubmit.level.${level}`)}
    </span>
  );
};

const CheckIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    aria-hidden="true"
    className="shrink-0 text-[color:var(--color-semantic-success-text)]"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
