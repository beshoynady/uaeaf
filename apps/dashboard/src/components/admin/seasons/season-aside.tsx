"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/ui/settings-card";
import { SwitchField } from "@/components/ui/switch-field";
import { StatusBadge } from "@/components/admin/videos/video-preview-card";
import { currentPhaseOf } from "@/lib/admin/seasons/list-filters";
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

/**
 * Visibility, the approval policy, and the publish step.
 *
 * -- Which door ---------------------------------------------------------------
 *
 * The type's approval policy decides (ADR-0125). Under a direct policy — or
 * none, which the API publishes by permission — the step is "publish", behind
 * `seasons:Publish`. Under a policy that requires review the step is "send for
 * approval" (`POST :id/submit`), behind `seasons:Update`: submitting is an
 * author's act. When the policy cannot be read the screen claims nothing and
 * offers "publish"; the API's own refusal is what the editor then reads, and
 * it names the other door.
 *
 * -- Both steps act on what is saved ----------------------------------------
 *
 * Publishing sends the version the editor opened (`updatedAt`); submitting
 * freezes the saved record into a revision. With unsaved changes on the form
 * either would act on something other than what is on screen, so the form
 * refuses both at the press and says to save first.
 */
export const SeasonPublishingCard = ({
  record,
  isVisible,
  onVisibleChange,
  publishMode,
  canUpdate,
  canPublish,
  busy,
  onPublish,
  onSubmit,
}: {
  record: AdminSeason | null;
  isVisible: boolean;
  onVisibleChange: (visible: boolean) => void;
  publishMode: PublishMode;
  canUpdate: boolean;
  canPublish: boolean;
  busy: boolean;
  onPublish: () => void;
  onSubmit: () => void;
}) => {
  const t = useTranslations("Seasons");
  const state = record?.publicationState ?? "Draft";

  const action = (() => {
    if (!record) return <p className="text-caption text-[color:var(--color-text-muted)]">{t("publishAfterCreate")}</p>;
    if (state === "Published") return null;
    if (publishMode === "approval") {
      if (!canUpdate) return <p className="text-caption text-[color:var(--color-text-muted)]">{t("submitNeedsGrant")}</p>;
      return (
        <div className="flex flex-col gap-2">
          <Button loading={busy} aria-describedby="season-approval-hint" onClick={onSubmit}>
            {t("sendForApproval")}
          </Button>
          <p id="season-approval-hint" className="text-caption text-[color:var(--color-text-muted)]">
            {t("sendForApprovalHint")}
          </p>
        </div>
      );
    }
    if (!canPublish) return <p className="text-caption text-[color:var(--color-text-muted)]">{t("publishNeedsGrant")}</p>;
    return (
      <Button loading={busy} onClick={onPublish}>
        {t("publish")}
      </Button>
    );
  })();

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
      </dl>
      {action}
    </SettingsCard>
  );
};
