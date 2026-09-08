"use client";

import { useTranslations } from "next-intl";
import { MIN_PASSWORD_LENGTH, type PasswordAssessment } from "@/lib/auth/password-strength";

/**
 * Four segments and a word, above one hard requirement.
 *
 * The split matters: the *requirement* (twelve characters) is the only thing
 * that decides whether the API accepts the password, and it is stated as a
 * checkable rule. The *rating* is advice — the API enforces no complexity
 * rule at all, so a meter that looked like a gate would be lying about who
 * is refusing what.
 *
 * The four tones reuse the semantic families rather than a bespoke red-to-
 * green ramp, which is what keeps "weak" here the same red as an error
 * elsewhere in the product. Chapter 6 §6.2: never colour alone — the word
 * ("weak", "strong") carries the same information as the fill.
 */
const TONE: Record<string, string> = {
  weak: "var(--color-semantic-error)",
  fair: "var(--color-semantic-warning)",
  good: "var(--color-semantic-info)",
  strong: "var(--color-semantic-success)",
};

export function PasswordStrengthMeter({
  assessment,
  length,
}: {
  assessment: PasswordAssessment;
  length: number;
}) {
  const t = useTranslations("ResetPassword");
  const tone = TONE[assessment.strength] ?? "var(--color-border-default)";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              style={{ background: segment <= assessment.score ? tone : "var(--color-surface-skeleton)" }}
              className="h-1 flex-1 rounded-[var(--radius-full)] transition-[background-color] duration-[var(--motion-duration-base)]"
            />
          ))}
        </div>
        {/* The word, not the fill, is what has to be legible — three of the
            four tones fall below 4.5:1 at this size on a light surface (see
            status-message.tsx for the measurements and the token conflict
            behind them). Colour stays on the segments, which are redundant
            with it. */}
        <span className="w-16 shrink-0 text-caption font-medium text-[color:var(--color-text-primary)]">
          {t(`strength_${assessment.strength}`)}
        </span>
      </div>

      <p
        // The rule, not the rating, is what gets announced as it flips —
        // it is the only one that can block the submit.
        aria-live="polite"
        className="text-caption text-[color:var(--color-text-muted)]"
      >
        <span aria-hidden="true" className="me-1 font-medium text-[color:var(--color-text-secondary)]">
          {assessment.meetsMinimum ? "✓" : "○"}
        </span>
        {assessment.meetsMinimum
          ? t("minimumMet")
          : t("minimumRule", { count: MIN_PASSWORD_LENGTH, typed: length })}
      </p>
    </div>
  );
}
