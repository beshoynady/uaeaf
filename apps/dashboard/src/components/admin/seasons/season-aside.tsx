"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/ui/settings-card";
import { SwitchField } from "@/components/ui/switch-field";
import { StatusBadge } from "@/components/admin/videos/video-preview-card";
import { localized } from "@/lib/api/types";
import { currentPhaseOf } from "@/lib/admin/seasons/list-filters";
import { formatSeasonDay } from "@/lib/admin/seasons/season-dates";
import type { EditorialState, EditorialStateAction } from "@/lib/admin/editorial-state";
import type { AdminSeason, PublishMode } from "@/lib/admin/seasons/types";

/**
 * The two cards beside the season form (dash-02): where the season stands,
 * and whether and how it reaches the public site.
 */

/**
 * Whether this is the current season, and the phase it is in today.
 *
 * Read-only: the current season is changed from the list, where the season
 * that loses the mark is visible beside the one that gains it — changing it
 * from inside one season's form would move a mark the editor cannot see.
 */
export const SeasonStatusCard = ({ record, locale, now }: { record: AdminSeason; locale: "ar" | "en"; now: Date }) => {
  const t = useTranslations("Seasons");
  const phase = currentPhaseOf(record, now);

  return (
    <SettingsCard as="h3" title={t("statusCardTitle")}>
      <div className="flex flex-col gap-3 text-body-sm text-[color:var(--color-text-primary)]">
        {record.isCurrent ? <StatusBadge status="published" label={t("badge_current")} /> : null}
        <p>
          <span className="text-[color:var(--color-text-secondary)]">{t("statusCurrentPhase")} </span>
          {phase ? phase.name[locale] || phase.name.ar : t("statusNoPhase")}
        </p>
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("statusCurrentHint")}</p>
      </div>
    </SettingsCard>
  );
};

/** The three steps this card can take, in the order it offers them. */
export type SeasonStep = "publishApproved" | "publish" | "submit";
const STEPS: readonly SeasonStep[] = ["publishApproved", "publish", "submit"];

/**
 * Which step the card offers, and whether it is held back for readiness.
 *
 * -- The server decides ---------------------------------------------------------
 *
 * With the editorial state (`GET /seasons/:id/editorial-state`) the answer is
 * the server's own list of what THIS reader may do now: publishing directly,
 * sending for approval, or putting an approved review live. Nothing is
 * re-derived here, so the card and the API cannot disagree. An action the
 * reader could take once the season is ready (`blockedByReadiness`) is drawn
 * disabled with its reason — today, for a season, always the banner.
 *
 * -- Without it ---------------------------------------------------------------
 *
 * When the state could not be read the card falls back to the policy and the
 * reader's grants (ADR-0125): "send for approval" under a policy that requires
 * review, "publish" otherwise, and never "publish approved", which needs the
 * server to say an approval is standing. The API's refusal still names the
 * other door if the fallback guessed wrong.
 */
export const stepOf = (
  editorial: EditorialState | null,
  fallback: { state: AdminSeason["publicationState"]; publishMode: PublishMode; canUpdate: boolean; canPublish: boolean },
): { step: SeasonStep; blocked: boolean } | null => {
  if (editorial) {
    const offered = (action: EditorialStateAction) => editorial.availableActions.includes(action);
    const ready = STEPS.find((step) => offered(step));
    if (ready) return { step: ready, blocked: false };
    const held = STEPS.find((step) => editorial.blockedByReadiness.includes(step));
    return held ? { step: held, blocked: true } : null;
  }
  if (fallback.state === "Live") return null;
  if (fallback.publishMode === "approval") return fallback.canUpdate ? { step: "submit", blocked: false } : null;
  return fallback.canPublish ? { step: "publish", blocked: false } : null;
};

/**
 * Visibility, the approval policy, the state, and the one step the reader may
 * take next.
 *
 * Every step acts on the saved season — publishing sends the version the
 * editor opened, submitting and publishing an approval freeze what is stored —
 * so the form refuses each at the press while there are unsaved changes.
 */
export const SeasonPublishingCard = ({
  record,
  editorial,
  isVisible,
  onVisibleChange,
  publishMode,
  canUpdate,
  canPublish,
  busy,
  locale,
  onStep,
}: {
  record: AdminSeason | null;
  editorial: EditorialState | null;
  isVisible: boolean;
  onVisibleChange: (visible: boolean) => void;
  publishMode: PublishMode;
  canUpdate: boolean;
  canPublish: boolean;
  busy: boolean;
  locale: "ar" | "en";
  onStep: (step: SeasonStep) => void;
}) => {
  const t = useTranslations("Seasons");
  const state = record?.publicationState ?? "Draft";
  const next = record ? stepOf(editorial, { state, publishMode, canUpdate, canPublish }) : null;

  const action = (() => {
    if (!record) return <p className="text-caption text-[color:var(--color-text-muted)]">{t("publishAfterCreate")}</p>;
    if (!next) {
      if (state === "Live") return null;
      return <p className="text-caption text-[color:var(--color-text-muted)]">{t("noStepAvailable")}</p>;
    }
    const hintId = `season-step-${next.step}-hint`;
    return (
      <div className="flex flex-col gap-2">
        <Button
          loading={busy}
          disabled={next.blocked}
          aria-describedby={hintId}
          onClick={() => onStep(next.step)}
        >
          {t(`step_${next.step}`)}
        </Button>
        <p id={hintId} className="text-caption text-[color:var(--color-text-muted)]">
          {next.blocked ? t("stepBlockedByBanner") : t(`stepHint_${next.step}`)}
        </p>
      </div>
    );
  })();

  const publishedBy = editorial?.publishedBy?.name ? localized(editorial.publishedBy.name, locale) : null;

  return (
    <SettingsCard as="h3" title={t("publishingCardTitle")}>
      <SwitchField
        id="season-visible"
        label={t("visibleLabel")}
        checked={isVisible}
        disabled={!canUpdate}
        onChange={onVisibleChange}
        hint={t("visibleHint")}
      />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
        <dt className="text-[color:var(--color-text-secondary)]">{t("policyLabel")}</dt>
        <dd className="text-[color:var(--color-text-primary)]">{t(`policy_${publishMode}`)}</dd>
        <dt className="text-[color:var(--color-text-secondary)]">{t("stateLabel")}</dt>
        <dd className="text-[color:var(--color-text-primary)]">{t(`state_${state}`)}</dd>
        {editorial?.publishedAt ? (
          <>
            <dt className="text-[color:var(--color-text-secondary)]">{t("publishedLabel")}</dt>
            <dd className="text-[color:var(--color-text-primary)]">
              {publishedBy
                ? t("publishedOnBy", { date: formatSeasonDay(editorial.publishedAt, locale), name: publishedBy })
                : formatSeasonDay(editorial.publishedAt, locale)}
            </dd>
          </>
        ) : null}
      </dl>
      {action}
    </SettingsCard>
  );
};
