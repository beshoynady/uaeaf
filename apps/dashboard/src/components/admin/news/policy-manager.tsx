"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/auth/text-field";
import {
  APPROVAL_MODES,
  hasApprovalErrors,
  requiredApprovals,
  validateApprovalChoice,
  type ApprovalChoice,
  type ApprovalMode,
  type ApproverOption,
  type GovernableEntity,
} from "@/lib/admin/approval-policies";

/**
 * Turning review on or off for any content type, from one screen.
 *
 * ── Why one screen and not one per type ────────────────────────────────────
 *
 * Configuring a review used to mean three API calls in the right order, with
 * no screen for any of them. That is why eleven of the twelve governed types
 * had no policy at all and publishing them failed closed with a message about
 * configuration nobody could perform. Everything here is driven by the list
 * the server sends, so a thirteenth governed type appears on this screen
 * without a line of code being written for it.
 *
 * ── Why the consequence is printed ─────────────────────────────────────────
 *
 * "3 of 5" and "each in turn" are what the administrator is actually choosing
 * between, and neither is legible from a mode name. The summary is computed
 * from the same function the validator uses, so the number shown is the number
 * that would be saved.
 */
export const PolicyManager = ({
  entities,
  approvers,
  locale,
  onSave,
}: {
  entities: readonly GovernableEntity[];
  approvers: readonly ApproverOption[];
  locale: "ar" | "en";
  onSave: (entityType: string, choice: ApprovalChoice) => Promise<void>;
}) => {
  const t = useTranslations("Newsroom");
  const fieldId = useId();

  // Keyed by entity type: the screen edits several arrangements before saving
  // any of them, and a single shared draft would make the second row overwrite
  // the first.
  const [drafts, setDrafts] = useState<Record<string, ApprovalChoice>>(() =>
    Object.fromEntries(
      entities.map((entity) => [
        entity.entityType,
        {
          enabled: entity.enabled,
          mode: entity.mode ?? "THRESHOLD",
          approverIds: entity.approverIds,
          threshold: entity.threshold,
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState<string | null>(null);

  const update = (entityType: string, patch: Partial<ApprovalChoice>) =>
    setDrafts((current) => ({ ...current, [entityType]: { ...current[entityType], ...patch } }));

  const toggleApprover = (entityType: string, approverId: string) =>
    setDrafts((current) => {
      const held = current[entityType].approverIds ?? [];
      return {
        ...current,
        [entityType]: {
          ...current[entityType],
          approverIds: held.includes(approverId)
            ? held.filter((id) => id !== approverId)
            : [...held, approverId],
        },
      };
    });

  return (
    <ul className="flex list-none flex-col gap-4 p-0">
      {entities.map((entity) => {
        const draft = drafts[entity.entityType];
        const errors = validateApprovalChoice(draft);
        const blocked = hasApprovalErrors(errors);
        const total = new Set(draft.approverIds ?? []).size;

        return (
          <li
            key={entity.entityType}
            className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-h4 text-[color:var(--color-text-primary)]">
                {t(`entity_${entity.entityType}`)}
              </h3>
              <label className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--a11y-focus-ring)]"
                  checked={draft.enabled}
                  onChange={(event) => update(entity.entityType, { enabled: event.target.checked })}
                />
                {t("policyEnabled")}
              </label>
            </div>

            {draft.enabled ? (
              <>
                <SelectField
                  id={`${fieldId}-${entity.entityType}-mode`}
                  label={t("policyMode")}
                  value={draft.mode}
                  onChange={(event) =>
                    update(entity.entityType, { mode: event.target.value as ApprovalMode })
                  }
                  options={APPROVAL_MODES.map((mode) => ({ value: mode, label: t(`mode_${mode}`) }))}
                />

                <fieldset className="flex flex-col gap-2 border-0 p-0">
                  <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">
                    {t("policyApprovers")}
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {approvers.map((approver) => (
                      <label key={approver.id} className="flex items-center gap-2 text-body-sm">
                        <input
                          type="checkbox"
                          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--a11y-focus-ring)]"
                          checked={(draft.approverIds ?? []).includes(approver.id)}
                          onChange={() => toggleApprover(entity.entityType, approver.id)}
                        />
                        {approver.name[locale] || approver.email}
                      </label>
                    ))}
                  </div>
                  {errors.approvers ? (
                    <span role="alert" className="text-caption text-[color:var(--color-semantic-error-text)]">
                      {t("errorApprovers")}
                    </span>
                  ) : null}
                </fieldset>

                {draft.mode === "THRESHOLD" ? (
                  <TextField
                    id={`${fieldId}-${entity.entityType}-threshold`}
                    label={t("policyThreshold")}
                    type="number"
                    min={1}
                    value={draft.threshold ?? 1}
                    onChange={(event) =>
                      update(entity.entityType, { threshold: Number(event.target.value) })
                    }
                    // The field owns the message and the `aria-describedby`
                    // that points at it — passing `error` rather than drawing
                    // a span keeps the association the shared field makes.
                    error={errors.threshold ? t("errorThreshold") : null}
                  />
                ) : null}

                <p className="text-caption text-[color:var(--color-text-secondary)]">
                  {t("policySummary", { required: requiredApprovals(draft), total })}
                </p>
              </>
            ) : null}

            <div>
              <Button
                disabled={blocked}
                loading={saving === entity.entityType}
                onClick={async () => {
                  setSaving(entity.entityType);
                  try {
                    await onSave(entity.entityType, draft);
                  } finally {
                    setSaving(null);
                  }
                }}
              >
                {t("save")}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
