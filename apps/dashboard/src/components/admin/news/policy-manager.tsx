"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TOGGLE_SEGMENT } from "@/components/ui/interactive";
import { StatTiles, type StatTile } from "@/components/admin/stat-tiles";
import { RESOURCE_DOMAINS, UNCLASSIFIED_DOMAIN_KEY, domainKeyFor, domainOrder } from "@/lib/admin/resource-domains";
import {
  POLICY_FILTERS,
  changesArrangement,
  differsFromSaved,
  matchesFilter,
  policyStats,
  savedChoice,
  type ApprovalChoice,
  type ApprovalSaveRefusal,
  type ApproverOption,
  type GovernableEntity,
  type PolicyFilter,
} from "@/lib/admin/approval-policies";
import { PolicyList, type PolicyGroup } from "./policy-list";
import { PolicyDetail } from "./policy-detail";

/**
 * Turning review on or off for any content type, from one screen.
 *
 * ── Why one screen and not one per type ────────────────────────────────────
 *
 * Configuring a review used to mean three API calls in the right order, with
 * no screen for any of them. That is why eleven of the twelve governed types
 * had no policy at all and publishing them failed closed with a message about
 * configuration nobody could perform. Everything here is driven by the list
 * the server sends, so a new governed type appears on this screen without a
 * line of code being written for it.
 *
 * ── Why a list beside a detail ─────────────────────────────────────────────
 *
 * Every type's controls stacked one under another put the settings of the
 * type an administrator came for a long scroll away, among twelve others they
 * did not. So the types are a compact list, grouped by product domain, and the
 * chosen one's settings sit beside it — both on screen together, nothing to
 * scroll past to reach a control. The grouping reuses the permission matrix's
 * own map, so the two screens group the same vocabulary the same way.
 *
 * Each type keeps its own draft, so moving through the list loses nothing: a
 * change made to one type is still there when the administrator comes back to
 * it, and the list marks it unsaved until then.
 *
 * ── Why saving and applying to the group are two actions ───────────────────
 *
 * Saving writes the one policy on show. Applying copies that policy's SAVED
 * arrangement to the other types in its group — other people's policies,
 * overwritten at once. They are separate buttons with separate names, and the
 * second waits until the first has nothing pending, so there is never a doubt
 * about which version is being copied.
 *
 * There is no Figma frame for this screen: it is an internal operating tool.
 * Its patterns come from the dashboard's own components (PENDING FIGMA
 * BACK-SYNC).
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

  const labelOf = (key: string) =>
    key === UNCLASSIFIED_DOMAIN_KEY ? t("domainOther") : RESOURCE_DOMAINS[key][locale];
  const groups = groupByDomain(entities).map((group) => ({ ...group, label: labelOf(group.key) }));

  // Keyed by entity type: several arrangements are edited before any of them
  // is saved, and a single shared draft would make one overwrite another.
  const [drafts, setDrafts] = useState<Record<string, ApprovalChoice>>(() =>
    Object.fromEntries(entities.map((entity) => [entity.entityType, savedChoice(entity)])),
  );
  const [selected, setSelected] = useState(() => groups[0]?.entities[0]?.entityType ?? "");
  const [filter, setFilter] = useState<PolicyFilter>("all");
  const [saving, setSaving] = useState<string | null>(null);
  // Keyed by type for the same reason the drafts are: one policy's refusal
  // must not appear under another's button.
  const [refusals, setRefusals] = useState<Record<string, ApprovalSaveRefusal>>({});
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{ groupKey: string; results: ApplyResult[] } | null>(null);

  // A type the server added after this screen mounted has no draft yet.
  const draftOf = (entity: GovernableEntity) => drafts[entity.entityType] ?? savedChoice(entity);
  const dirty = new Set(
    entities.filter((entity) => differsFromSaved(entity, draftOf(entity))).map((entity) => entity.entityType),
  );

  const clearRefusal = (entityType: string) =>
    setRefusals((current) => {
      const { [entityType]: cleared, ...rest } = current;
      void cleared;
      return rest;
    });

  const current = entities.find((entity) => entity.entityType === selected);
  const currentGroup = groups.find((group) => group.entities.some((entity) => entity.entityType === selected));
  const name = (entityType: string) => t(`entity_${entityType}`);

  const save = async (entity: GovernableEntity) => {
    setSaving(entity.entityType);
    clearRefusal(entity.entityType);
    try {
      const outcome = await onSave(entity.entityType, draftOf(entity));
      if (outcome) {
        setRefusals((held) => ({ ...held, [entity.entityType]: outcome }));
      }
    } finally {
      setSaving(null);
    }
  };

  /**
   * What applying the chosen policy to its group would do to each sibling.
   *
   * Computed from the props as they are at the moment it is asked — when the
   * button is drawn, and again when the confirmation is pressed (CLAUDE.md
   * §31), never from a copy taken when the dialog opened.
   */
  const planFor = (source: GovernableEntity, group: PolicyGroup) => {
    const copy = savedChoice(source);
    return group.entities
      .filter((sibling) => sibling.entityType !== source.entityType)
      .map((sibling) => ({
        sibling,
        step: !differsFromSaved(sibling, copy)
          ? ("unchanged" as const)
          : sibling.inFlightReviews > 0 && changesArrangement(sibling, copy)
            ? ("skipped" as const)
            : ("change" as const),
      }));
  };

  const applyToGroup = async () => {
    if (!current || !currentGroup) return;
    const copy = savedChoice(current);
    const plan = planFor(current, currentGroup);
    const results: ApplyResult[] = [];
    setApplying(true);
    try {
      // One at a time: there is no endpoint that writes several policies, so
      // this is not atomic, and each outcome is reported on its own.
      for (const { sibling, step } of plan) {
        if (step === "unchanged") continue;
        if (step === "skipped") {
          results.push({ entityType: sibling.entityType, outcome: "skipped" });
          continue;
        }
        try {
          const refusal = await onSave(sibling.entityType, copy);
          if (refusal) {
            results.push({
              entityType: sibling.entityType,
              outcome: refusal.code === "reviewsInFlight" ? "refused" : "failed",
            });
          } else {
            results.push({ entityType: sibling.entityType, outcome: "applied" });
            // Its draft becomes what was just stored, so it does not read as
            // an unsaved change against the arrangement it now has.
            setDrafts((held) => ({ ...held, [sibling.entityType]: { ...copy, approverIds: [...(copy.approverIds ?? [])] } }));
            clearRefusal(sibling.entityType);
          }
        } catch {
          results.push({ entityType: sibling.entityType, outcome: "failed" });
        }
      }
    } finally {
      setApplying(false);
      setConfirming(false);
      setApplied({ groupKey: currentGroup.key, results });
    }
  };

  const stats = policyStats(entities, approvers);
  const tiles: StatTile[] = [
    {
      key: "required",
      label: t("statRequired"),
      value: stats.required,
      note: t("statRequiredNote", { total: stats.total }),
    },
    {
      key: "inReview",
      label: t("statInReview"),
      value: stats.inReview,
      note: t("statInReviewNote"),
      tone: stats.inReview > 0 ? "attention" : "neutral",
    },
    {
      key: "attention",
      label: t("statAttention"),
      value: stats.attention,
      note: t("statAttentionNote"),
      tone: stats.attention > 0 ? "critical" : "neutral",
    },
  ];

  const filtered = groups.map((group) => ({
    ...group,
    entities: group.entities.filter((entity) => matchesFilter(entity, filter, approvers)),
  }));

  const groupAction = () => {
    if (!current || !currentGroup) return null;
    const plan = planFor(current, currentGroup);
    const alone = plan.length === 0;
    const pending = dirty.has(current.entityType);
    const nothing = !alone && plan.every(({ step }) => step !== "change");
    const hint = alone
      ? t("groupApplyAlone")
      : pending
        ? t("groupApplyNeedsSave", { name: name(current.entityType) })
        : nothing
          ? t("groupApplyNothing")
          : t("groupApplyHint", { name: name(current.entityType), group: currentGroup.label });
    const results = applied?.groupKey === currentGroup.key ? applied.results : [];

    return (
      <div className="flex flex-col rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-[color:var(--color-text-secondary)]">{hint}</p>
          <Button
            variant="secondary"
            disabled={alone || pending || nothing || applying}
            onClick={() => setConfirming(true)}
            className="shrink-0"
          >
            {t("groupApplyButton")}
          </Button>
        </div>
        {/* Present and displayed before it has anything to say: a live region
            that appears together with its text is often not announced. Empty,
            it has no height. */}
        <div role="status">
          {results.length > 0 ? (
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-caption font-medium text-[color:var(--color-text-primary)]">{t("groupApplyResults")}</p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {results.map((result) => (
                  <li key={result.entityType} className="text-caption text-[color:var(--color-text-secondary)]">
                    {t(`groupApplyResult_${result.outcome}`, { name: name(result.entityType) })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const confirmBody = () => {
    if (!current || !currentGroup) return null;
    const plan = planFor(current, currentGroup);
    const names = (step: string) =>
      plan
        .filter((entry) => entry.step === step)
        .map((entry) => name(entry.sibling.entityType))
        .join(t("nameSeparator"));
    const overwritten = plan
      .filter((entry) => entry.step === "change" && dirty.has(entry.sibling.entityType))
      .map((entry) => name(entry.sibling.entityType))
      .join(t("nameSeparator"));
    return (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {names("change") ? <li>{t("groupApplyWillChange", { names: names("change") })}</li> : null}
        {names("skipped") ? <li>{t("groupApplySkipped", { names: names("skipped") })}</li> : null}
        {names("unchanged") ? <li>{t("groupApplyUnchanged", { names: names("unchanged") })}</li> : null}
        {overwritten ? <li>{t("groupApplyDiscardsDrafts", { names: overwritten })}</li> : null}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <StatTiles tiles={tiles} caption={t("statsCaption")} />

      <div
        role="group"
        aria-label={t("filtersLabel")}
        className="inline-flex flex-wrap gap-1 self-start rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-1"
      >
        {POLICY_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={TOGGLE_SEGMENT}
          >
            {t(`filter_${option}`, {
              count: entities.filter((entity) => matchesFilter(entity, option, approvers)).length,
            })}
          </button>
        ))}
      </div>

      {/* Chapter 5 §5.2: twelve columns from lg, gutter 24px, 32px from xl. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-8">
        <div className="lg:col-span-4 xl:col-span-3">
          <PolicyList
            groups={filtered}
            pickerGroups={groups}
            approvers={approvers}
            locale={locale}
            selected={selected}
            dirty={dirty}
            onSelect={setSelected}
          />
        </div>

        <div className="min-w-0 lg:col-span-8 xl:col-span-9">
          {current && currentGroup ? (
            <PolicyDetail
              // Remounted per type, so the ids inside it and anything the
              // browser holds for its fields belong to one policy only.
              key={current.entityType}
              entity={current}
              draft={draftOf(current)}
              approvers={approvers}
              locale={locale}
              groupLabel={currentGroup.label}
              dirty={dirty.has(current.entityType)}
              saving={saving === current.entityType}
              refusal={refusals[current.entityType]}
              onChange={(patch) =>
                setDrafts((held) => ({ ...held, [current.entityType]: { ...draftOf(current), ...patch } }))
              }
              onSave={() => void save(current)}
              onDiscard={() => {
                setDrafts((held) => ({ ...held, [current.entityType]: savedChoice(current) }));
                clearRefusal(current.entityType);
              }}
              footer={groupAction()}
            />
          ) : null}
        </div>
      </div>

      {current && currentGroup ? (
        <ConfirmDialog
          open={confirming}
          title={t("groupApplyConfirmTitle", { name: name(current.entityType), group: currentGroup.label })}
          confirmLabel={t("groupApplyConfirm")}
          cancelLabel={t("groupApplyCancel")}
          // It overwrites other policies' approvers (PT-CONFIRMATION-001).
          tone="destructive"
          busy={applying}
          onConfirm={() => void applyToGroup()}
          onCancel={() => setConfirming(false)}
        >
          {confirmBody()}
        </ConfirmDialog>
      ) : null}
    </div>
  );
};

interface ApplyResult {
  entityType: string;
  outcome: "applied" | "skipped" | "refused" | "failed";
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
 * administrator who has learned one has learned the other — and a new governed
 * type that IS a permission resource lands under a heading without a line of
 * code here.
 */
const groupByDomain = (entities: readonly GovernableEntity[]): { key: string; entities: GovernableEntity[] }[] => {
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
