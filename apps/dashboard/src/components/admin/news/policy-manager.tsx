"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/auth/text-field";
import { RESOURCE_DOMAINS, UNCLASSIFIED_DOMAIN_KEY, domainKeyFor, domainOrder } from "@/lib/admin/resource-domains";
import {
  APPROVAL_MODES,
  changesArrangement,
  describeArrangement,
  differsFromSaved,
  hasApprovalErrors,
  requiredApprovals,
  validateApprovalChoice,
  type ApprovalChoice,
  type ApprovalMode,
  type ApprovalSaveRefusal,
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
 *
 * ── Why a running review locks the arrangement ─────────────────────────────
 *
 * Changing who approves replaces this type's steps, and a replaced step is
 * archived — which is the step every running review is waiting at. They would
 * match nobody's queue and could never be decided: a newsroom's work stranded
 * by a settings change that reported success. The server refuses it outright
 * (owner decision 2026-09-21); this screen states the count up front so the
 * administrator reads a locked control rather than composing an edit and
 * having it rejected.
 *
 * The lock is narrow on purpose. Switching approval off strands nothing, and
 * neither does re-saving the same people — both stay available, because a
 * policy most needs correcting exactly while work is moving through it.
 *
 * ── Why it is grouped, and why each row leads with a sentence ──────────────
 *
 * The first build of this screen was a flat list of twelve rows, each one an
 * entity-type identifier over a set of controls. That is the shape of the
 * table behind it, not the shape of the question an administrator arrives
 * with — which is "who signs off on the news", not "what is the value of
 * `workflowRequired` for `articles`".
 *
 * So two things changed and nothing else did. The types are grouped by the
 * product domain they belong to, reusing the map the permission matrix already
 * groups by, so the news sits with public communication and the page types sit
 * together. And every row opens with the arrangement in words — who approves,
 * how many of them, whether in turn — before it offers a single control. The
 * controls are unchanged and still behind the switch; what is new is that the
 * screen can be read without operating it.
 *
 * There is no Figma frame for this screen: it is an internal operating tool,
 * not a page. Its patterns come from the dashboard's own components and from
 * the permission matrix beside it, which answers a question of the same shape
 * over the same vocabulary.
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
  onSave: (entityType: string, choice: ApprovalChoice) => Promise<ApprovalSaveRefusal | null | void>;
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
  // Keyed by type for the same reason the drafts are: one row's refusal must
  // not appear under another row's button.
  const [refusals, setRefusals] = useState<Record<string, ApprovalSaveRefusal>>({});

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

  /**
   * The arrangement in words, from what is stored.
   *
   * Deliberately not from the draft: this line answers "what is the rule
   * today", and a line that changed as the administrator ticked boxes would
   * leave them with no way to see what they are changing away from.
   */
  const policyOf = (entity: GovernableEntity) => {
    if (!entity.enabled) {
      return t("policySummaryOff");
    }

    const { required, total, inTurn, names } = describeArrangement(entity, approvers, locale);
    if (total === 0) {
      // A type that requires review and names nobody stops every publication
      // of that type. Said plainly, because it is the one arrangement that is
      // broken rather than merely strict.
      return t("policySummaryNobody");
    }

    return t(inTurn ? "policySummaryInTurn" : "policySummaryOf", {
      required,
      total,
      names: names.join(t("nameSeparator")),
    });
  };

  const groups = groupByDomain(entities);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`${fieldId}-${group.key}`} className="flex flex-col gap-4">
          <h2
            id={`${fieldId}-${group.key}`}
            className="text-label font-bold text-[color:var(--color-text-secondary)]"
          >
            {group.key === UNCLASSIFIED_DOMAIN_KEY ? t("domainOther") : RESOURCE_DOMAINS[group.key][locale]}
          </h2>

          <ul className="flex list-none flex-col gap-4 p-0">
      {group.entities.map((entity) => {
        const draft = drafts[entity.entityType];
        const errors = validateApprovalChoice(draft);
        const total = new Set(draft.approverIds ?? []).size;
        const running = entity.inFlightReviews;
        // Re-read from the CURRENT draft on every render, so the lock reflects
        // the edit as it stands. Computed once when the row mounted, it would
        // describe an arrangement the administrator has since changed.
        const lockedOut = running > 0 && changesArrangement(entity, draft);
        const blocked = hasApprovalErrors(errors) || lockedOut;
        const refusal = refusals[entity.entityType];
        // Nothing to save on a row nobody has touched, and a row that offers
        // to save nothing is a primary button spent on nothing.
        const dirty = differsFromSaved(entity, draft);

        return (
          <li
            key={entity.entityType}
            className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="text-h4 text-[color:var(--color-text-primary)]">
                  {t(`entity_${entity.entityType}`)}
                </h3>

                {/* The answer before the controls. Built from what is SAVED,
                    not from the draft: this line is what the arrangement is,
                    and the controls below are what it is being changed to. */}
                <p className="text-body-sm text-[color:var(--color-text-secondary)]">
                  {policyOf(entity)}
                </p>
              </div>

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

            {running > 0 ? (
              <div
                className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-3"
                // Announced only once it is actually stopping a save. Present
                // as a live region from the first render, it would interrupt a
                // screen-reader user reading a row they had not yet touched.
                role={lockedOut ? "alert" : undefined}
              >
                <p className="text-label font-medium text-[color:var(--color-text-primary)]">
                  {running === 1 ? t("policyLocked") : t("policyLockedPlural", { count: running })}
                </p>
                <p className="text-caption text-[color:var(--color-text-secondary)]">{t("policyLockedWhy")}</p>
                <p className="text-caption text-[color:var(--color-text-secondary)]">
                  {t("policyLockedStillAllowed")}
                </p>
              </div>
            ) : null}

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

            {dirty || refusal ? (
            <div className="flex flex-col gap-2">
              <div>
                <Button
                  disabled={blocked}
                  loading={saving === entity.entityType}
                  onClick={async () => {
                    setSaving(entity.entityType);
                    setRefusals((current) => {
                      const { [entity.entityType]: cleared, ...rest } = current;
                      void cleared;
                      return rest;
                    });
                    try {
                      const outcome = await onSave(entity.entityType, draft);
                      if (outcome) {
                        setRefusals((current) => ({ ...current, [entity.entityType]: outcome }));
                      }
                    } finally {
                      setSaving(null);
                    }
                  }}
                >
                  {t("save")}
                </Button>
              </div>

              {refusal ? (
                <p role="alert" className="text-caption text-[color:var(--color-semantic-error-text)]">
                  {refusal.code === "reviewsInFlight" ? t("policySaveRefused") : t("policySaveFailed")}
                </p>
              ) : null}
            </div>
            ) : null}
          </li>
        );
      })}
          </ul>
        </section>
      ))}
    </div>
  );
};

interface DomainGroup {
  key: string;
  entities: GovernableEntity[];
}

/**
 * Three governed types the RBAC map cannot place, and where they belong.
 *
 * `resource-domains.ts` maps the resources this platform has PERMISSIONS for,
 * derived from which module declares each `@RequirePermission`. These three are
 * workflow entity types with no permission resource of their own, so that map
 * has nothing to say about them and answers "unclassified" — correctly, by its
 * own rule.
 *
 * Supplied here rather than added there, because adding them would make that
 * file's own description false. Each one is placed by the same mechanical rule
 * that built the map: the API module whose source names it, which for all
 * three is `cms-page-composition`.
 */
const WORKFLOW_ONLY_DOMAIN: Record<string, string> = {
  staticPages: "cms-page-composition",
  externalMediaCoverage: "cms-page-composition",
  publicEvents: "cms-page-composition",
};

/**
 * The governed types, under the product domain each belongs to.
 *
 * `domainKeyFor` is the permission matrix's own map. Reusing it means this
 * screen and the permission screen group the same vocabulary the same way — an
 * administrator who has learned one has learned the other — and a thirteenth
 * governed type that IS a permission resource lands under a heading without a
 * line of code here.
 */
const groupByDomain = (entities: readonly GovernableEntity[]): DomainGroup[] => {
  const byKey = new Map<string, GovernableEntity[]>();

  for (const entity of entities) {
    const mapped = domainKeyFor(entity.entityType);
    const key =
      mapped === UNCLASSIFIED_DOMAIN_KEY
        ? (WORKFLOW_ONLY_DOMAIN[entity.entityType] ?? UNCLASSIFIED_DOMAIN_KEY)
        : mapped;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(entity);
    else byKey.set(key, [entity]);
  }

  return [...byKey.entries()]
    .map(([key, grouped]) => ({ key, entities: grouped }))
    .sort((a, b) => domainOrder(a.key) - domainOrder(b.key));
};
