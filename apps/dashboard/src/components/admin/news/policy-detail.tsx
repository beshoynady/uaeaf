"use client";

import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@uaeaf/brand-ui";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/auth/text-field";
import { BUTTON_ICON, TOGGLE_SEGMENT } from "@/components/ui/interactive";
import { ApprovalFlow } from "@/components/admin/approval-flow";
import { SwitchField } from "@/components/ui/switch-field";
import { UiIcon } from "@/lib/icons/ui-icons";
import {
  APPROVAL_MODES,
  changesArrangement,
  describeArrangement,
  hasApprovalErrors,
  isDeadlocked,
  moveApprover,
  requiredApprovals,
  validateApprovalChoice,
  type ApprovalChoice,
  type ApprovalSaveRefusal,
  type ApproverOption,
  type GovernableEntity,
} from "@/lib/admin/approval-policies";

/**
 * One policy's settings: the detail half of the policy screen.
 *
 * ── The saved sentence and the path ────────────────────────────────────────
 *
 * The line under the title is built from what is SAVED — it answers "what is
 * the rule today", and a line that moved with the controls would leave the
 * administrator no way to see what they are changing away from. The path
 * diagram is the opposite on purpose: it follows the draft, and its caption
 * says which of the two it is showing ("current path" / "path after saving").
 *
 * ── Why a running review locks the arrangement ─────────────────────────────
 *
 * Changing who approves replaces this type's steps, and a replaced step is
 * archived — which is the step every running review is waiting at. They would
 * match nobody's queue and could never be decided. The server refuses it
 * outright (owner decision 2026-09-21); this states the count up front so the
 * administrator reads a locked control rather than composing an edit and
 * having it rejected. Switching approval off strands nothing, and neither does
 * re-saving the same people, so both stay available.
 *
 * ── Why the sequential order is a numbered list ────────────────────────────
 *
 * Under SEQUENTIAL the order IS the policy: the same three people in two
 * orders are two arrangements. So the approvers become a numbered list with
 * each position printed, and two buttons move a person through it. Buttons
 * rather than dragging: no drag-and-drop library is installed and adding one
 * needs approval (owner constraint 2026-09-21), and two buttons work from a
 * keyboard without a custom key handler.
 *
 * ── Why the deadlock is refused before the save ────────────────────────────
 *
 * "Requires approval, names nobody" stops every publication of that type. The
 * API refuses it as `unsatisfiablePolicy`; this says so at the control, so the
 * administrator who caused it reads it rather than an editor weeks later.
 */
export const PolicyDetail = ({
  entity,
  draft,
  approvers,
  locale,
  groupLabel,
  dirty,
  saving,
  refusal,
  onChange,
  onSave,
  onDiscard,
  footer,
}: {
  entity: GovernableEntity;
  draft: ApprovalChoice;
  approvers: readonly ApproverOption[];
  locale: "ar" | "en";
  groupLabel: string;
  dirty: boolean;
  saving: boolean;
  refusal: ApprovalSaveRefusal | undefined;
  onChange: (patch: Partial<ApprovalChoice>) => void;
  onSave: () => void;
  onDiscard: () => void;
  /** The group action, drawn under the save and kept apart from it. */
  footer: ReactNode;
}) => {
  const t = useTranslations("Newsroom");
  const id = useId();
  const title = t(`entity_${entity.entityType}`);

  const errors = validateApprovalChoice(draft);
  const running = entity.inFlightReviews;
  // Re-read from the CURRENT draft on every render, so the lock reflects the
  // edit as it stands rather than the arrangement on mount.
  const lockedOut = running > 0 && changesArrangement(entity, draft);
  const deadlocked = isDeadlocked(draft);
  const blocked = hasApprovalErrors(errors) || lockedOut || deadlocked;

  const nameOf = (approver: ApproverOption) => approver.name[locale] || approver.email;

  // The chosen approvers in the draft's own order, which under SEQUENTIAL is
  // the arrangement itself. An id whose account is gone keeps its place under
  // its id, because that is a thing the administrator must see.
  const chosen = (draft.approverIds ?? []).map(
    (approverId) =>
      approvers.find((candidate) => candidate.id === approverId) ?? {
        id: approverId,
        name: { ar: approverId, en: approverId },
        email: approverId,
      },
  );
  const total = new Set(draft.approverIds ?? []).size;
  const threshold = draft.threshold ?? 1;
  const remaining = approvers.filter((approver) => !(draft.approverIds ?? []).includes(approver.id));

  const addApprover = (approverId: string) =>
    onChange({ approverIds: [...(draft.approverIds ?? []), approverId] });
  const removeApprover = (approverId: string) =>
    onChange({ approverIds: (draft.approverIds ?? []).filter((held) => held !== approverId) });

  /** What is saved, in words. */
  const savedSentence = () => {
    if (!entity.enabled) return t("policySummaryOff");
    const arrangement = describeArrangement(entity, approvers, locale);
    // Requiring review and naming nobody is the one arrangement that is
    // broken rather than merely strict.
    if (arrangement.total === 0) return t("policySummaryNobody");
    return t(arrangement.inTurn ? "policySummaryInTurn" : "policySummaryOf", {
      required: arrangement.required,
      total: arrangement.total,
      names: arrangement.names.join(t("nameSeparator")),
    });
  };

  /** The people between writing and publication, as the draft stands. */
  const stages = (): string[] => {
    if (!draft.enabled) return [];
    if (total === 0) return [t("flowNobody")];
    if (draft.mode === "SEQUENTIAL") return chosen.map(nameOf);
    if (draft.mode === "ALL") return [t("flowAll", { total })];
    return [t("flowThreshold", { required: requiredApprovals(draft), total })];
  };

  const addPicker =
    remaining.length > 0 ? (
      <div className="max-w-sm">
        <SelectField
          id={`${id}-add`}
          label={t("policyAddApprover")}
          value=""
          placeholder
          onChange={(event) => {
            if (event.target.value) addApprover(event.target.value);
          }}
          options={remaining.map((approver) => ({ value: approver.id, label: nameOf(approver) }))}
        />
      </div>
    ) : null;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-6 rounded-[var(--card-radius)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-caption text-[color:var(--color-text-muted)]">{groupLabel}</p>
          {/* `SectionHeading` (settings recipe); the id sits on a span inside
              the heading so the section's `aria-labelledby` still names it. */}
          <SectionHeading
            className="!mb-0"
            title={
              <span id={`${id}-title`} className="text-h4 font-bold">
                {title}
              </span>
            }
          />
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{savedSentence()}</p>
        </div>

        {/* The dashboard's one switch, in a form that is saved later. ADR-0091
            allows that under three conditions this screen meets: it turns review
            on or off as a whole, the unsaved state shows at once (the row
            marker, "path after saving"), and the save names the policy. */}
        <div className="shrink-0">
          <SwitchField
            id={`${id}-enabled`}
            label={t("policyEnabled")}
            checked={draft.enabled}
            onChange={(enabled) => onChange({ enabled })}
          />
        </div>
      </div>

      {deadlocked ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-error)] p-3 text-caption text-[color:var(--color-text-primary)]"
        >
          {t("policyDeadlocked")}
        </p>
      ) : null}

      {running > 0 ? (
        <div
          className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-3"
          // Announced only once it is actually stopping a save. Live from the
          // first render, it would interrupt a reader who has touched nothing.
          role={lockedOut ? "alert" : undefined}
        >
          <p className="text-label font-medium text-[color:var(--color-text-primary)]">
            {running === 1 ? t("policyLocked") : t("policyLockedPlural", { count: running })}
          </p>
          <p className="text-caption text-[color:var(--color-text-secondary)]">{t("policyLockedWhy")}</p>
          <p className="text-caption text-[color:var(--color-text-secondary)]">{t("policyLockedStillAllowed")}</p>
        </div>
      ) : null}

      <ApprovalFlow
        caption={dirty ? t("flowAfterSave") : t("flowCurrent")}
        start={t("flowStart")}
        stages={stages()}
        end={draft.enabled ? t("flowPublish") : t("flowPublishDirect")}
      />

      {draft.enabled ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p id={`${id}-mode`} className="text-label font-medium text-[color:var(--color-text-secondary)]">
              {t("policyMode")}
            </p>
            <div
              role="group"
              aria-labelledby={`${id}-mode`}
              className="inline-flex flex-wrap gap-1 self-start rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-1"
            >
              {APPROVAL_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={draft.mode === mode}
                  onClick={() => onChange({ mode })}
                  className={TOGGLE_SEGMENT}
                >
                  {t(`mode_${mode}`)}
                </button>
              ))}
            </div>
          </div>

          {draft.mode === "SEQUENTIAL" ? (
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend id={`${id}-order`} className="text-label font-medium text-[color:var(--color-text-secondary)]">
                {t("policyOrder")}
              </legend>
              <p className="text-caption text-[color:var(--color-text-secondary)]">{t("policyOrderHint")}</p>

              {/* An ordered list, so a screen reader says the position before
                  the name rather than leaving it to be inferred from a number
                  drawn beside it. */}
              {chosen.length > 0 ? (
                <ol aria-labelledby={`${id}-order`} className="m-0 flex list-none flex-col gap-2 p-0">
                  {chosen.map((approver, index) => (
                    <li
                      key={approver.id}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] ps-2"
                    >
                      <span
                        aria-hidden
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[color:var(--color-brand-primary)] text-label font-bold text-[color:var(--color-text-on-brand)]"
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 text-body-sm text-[color:var(--color-text-primary)]">
                        {t("policyOrderPosition", { position: index + 1, total: chosen.length, name: nameOf(approver) })}
                      </span>

                      {/* Each button names the person it moves: a column of
                          identical "up" buttons tells a screen-reader user
                          which of them they are on, which is none of them. */}
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={t("policyMoveUp", { name: nameOf(approver) })}
                        onClick={() => onChange({ approverIds: moveApprover(draft.approverIds ?? [], index, -1) })}
                        className={BUTTON_ICON}
                      >
                        <UiIcon name="arrow-up" />
                      </button>
                      <button
                        type="button"
                        disabled={index === chosen.length - 1}
                        aria-label={t("policyMoveDown", { name: nameOf(approver) })}
                        onClick={() => onChange({ approverIds: moveApprover(draft.approverIds ?? [], index, 1) })}
                        className={BUTTON_ICON}
                      >
                        <UiIcon name="arrow-down" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("policyRemoveApprover", { name: nameOf(approver) })}
                        onClick={() => removeApprover(approver.id)}
                        className={BUTTON_ICON}
                      >
                        <UiIcon name="x" />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : null}
              {addPicker}
            </fieldset>
          ) : (
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">
                {t("policyApprovers")}
              </legend>
              {chosen.length > 0 ? (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {chosen.map((approver) => (
                    <li
                      key={approver.id}
                      className="inline-flex items-center rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] ps-3"
                    >
                      <span className="text-body-sm text-[color:var(--color-text-primary)]">{nameOf(approver)}</span>
                      <button
                        type="button"
                        aria-label={t("policyRemoveApprover", { name: nameOf(approver) })}
                        onClick={() => removeApprover(approver.id)}
                        className={BUTTON_ICON}
                      >
                        <UiIcon name="x" className="size-[var(--icon-size-xs)] shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {/* No message here. "Choose at least one approver" and the
                  deadlock notice above fire on exactly the same condition, and
                  two alerts saying one thing make a reader look for a second
                  problem. The notice is the one kept. */}
              {addPicker}
            </fieldset>
          )}

          {draft.mode === "ALL" ? (
            <p className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-3 text-body-sm text-[color:var(--color-text-secondary)]">
              {t("policyAllExplained", { total })}
            </p>
          ) : null}

          {draft.mode === "THRESHOLD" ? (
            <div className="flex flex-col gap-2">
              {/* The field stays: it is the spinbutton the keyboard and a
                  screen reader already know. The two buttons are the pointer's
                  way to the same value, bounded so they cannot ask for more
                  approvals than there are approvers. */}
              <div className="flex items-start gap-2">
                <Button
                  variant="secondary"
                  aria-label={t("policyThresholdDown")}
                  disabled={threshold <= 1}
                  onClick={() => onChange({ threshold: threshold - 1 })}
                >
                  <UiIcon name="minus" />
                </Button>
                <div className="w-32">
                  <TextField
                    id={`${id}-threshold`}
                    label={t("policyThreshold")}
                    type="number"
                    min={1}
                    max={Math.max(total, 1)}
                    value={threshold}
                    onChange={(event) => onChange({ threshold: Number(event.target.value) })}
                    // The field owns the message and the `aria-describedby`
                    // that points at it.
                    error={errors.threshold ? t("errorThreshold") : null}
                  />
                </div>
                <Button
                  variant="secondary"
                  aria-label={t("policyThresholdUp")}
                  disabled={threshold >= total}
                  onClick={() => onChange({ threshold: threshold + 1 })}
                >
                  <UiIcon name="plus" />
                </Button>
              </div>
              <p className="text-caption text-[color:var(--color-text-secondary)]">
                {t("policySummary", { required: requiredApprovals(draft), total })}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("policyOffExplained")}</p>
      )}

      <div className="flex flex-col gap-4 border-t border-[color:var(--color-border-default)] pt-4">
        {refusal ? (
          <p role="alert" className="text-caption text-[color:var(--color-semantic-error-text)]">
            {refusal.code === "reviewsInFlight" ? t("policySaveRefused") : t("policySaveFailed")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty ? (
            <Button variant="secondary" onClick={onDiscard}>
              {t("policyDiscard")}
            </Button>
          ) : null}
          {/* Named after the policy it saves: the group action below writes
              to other policies, and the two must not read as one button. */}
          <Button disabled={!dirty || blocked} loading={saving} onClick={onSave}>
            {t("policySave", { name: title })}
          </Button>
        </div>

        {footer}
      </div>
    </section>
  );
};
