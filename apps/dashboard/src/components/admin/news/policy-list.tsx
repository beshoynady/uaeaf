"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@uaeaf/brand-ui";
import { SelectField } from "@/components/ui/select-field";
import { SELECTABLE_ROW } from "@/components/ui/interactive";
import { UiIcon } from "@/lib/icons/ui-icons";
import {
  describeArrangement,
  needsAttention,
  type ApproverOption,
  type GovernableEntity,
} from "@/lib/admin/approval-policies";

/** The governed types under one product domain, with the domain's name. */
export interface PolicyGroup {
  key: string;
  label: string;
  entities: GovernableEntity[];
}

/**
 * The master half of the policy screen: every type, grouped, one row each.
 *
 * A row answers at a glance what the detail spells out: whether review is
 * required, the arrangement in a few words, and whether anything is wrong.
 * All of it from what is SAVED — the unsaved edit is marked, not previewed.
 * Nothing here is carried by colour alone: every state is also a word.
 *
 * Below lg there is no room for a list beside the detail, so the same choice
 * becomes one select above it — the compact form Chapter 8 L3 §N.6 gives
 * context navigation on small screens.
 */
export const PolicyList = ({
  groups,
  pickerGroups,
  approvers,
  locale,
  selected,
  dirty,
  onSelect,
}: {
  /** The groups as the current filter leaves them. */
  groups: readonly PolicyGroup[];
  /** Every group, for the small-screen select: it must always hold the
   *  policy on show, whatever the filter hides. */
  pickerGroups: readonly PolicyGroup[];
  approvers: readonly ApproverOption[];
  locale: "ar" | "en";
  selected: string;
  dirty: ReadonlySet<string>;
  onSelect: (entityType: string) => void;
}) => {
  const t = useTranslations("Newsroom");
  const id = useId();

  const meta = (entity: GovernableEntity) => {
    if (!entity.enabled) return t("rowMetaDirect");
    const { required, total, inTurn } = describeArrangement(entity, approvers, locale);
    if (total === 0) return t("rowMetaNobody");
    if (inTurn) return t("rowMetaInTurn", { total });
    if (entity.mode === "ALL") return t("rowMetaAll", { total });
    return t("rowMetaThreshold", { required, total });
  };

  const visible = groups.filter((group) => group.entities.length > 0);

  return (
    <>
      <div className="lg:hidden">
        <SelectField
          id={`${id}-picker`}
          label={t("policyPicker")}
          value={selected}
          onChange={(event) => onSelect(event.target.value)}
          options={pickerGroups.flatMap((group) =>
            group.entities.map((entity) => ({
              value: entity.entityType,
              label: t("policyPickerOption", { group: group.label, name: t(`entity_${entity.entityType}`) }),
            })),
          )}
        />
      </div>

      <section
        aria-labelledby={`${id}-title`}
        className="hidden flex-col gap-4 rounded-[var(--card-radius)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4 lg:flex"
      >
        <div className="flex flex-col gap-1">
          {/* `SectionHeading` for the group (settings recipe). The id moves to
              a span inside the heading so `aria-labelledby` on the section
              still resolves to the same words. `!mb-0`: the card spaces its
              own rows. */}
          <SectionHeading
            className="!mb-0"
            title={
              <span id={`${id}-title`} className="text-label font-bold">
                {t("policyListTitle")}
              </span>
            }
          />
          <p className="text-caption text-[color:var(--color-text-muted)]">{t("policyListHint")}</p>
        </div>

        {visible.length === 0 ? (
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("filterEmpty")}</p>
        ) : null}

        {visible.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <h3 className="text-caption font-bold text-[color:var(--color-text-secondary)]">
              {group.label} <span className="font-medium text-[color:var(--color-text-muted)]">({group.entities.length})</span>
            </h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {group.entities.map((entity) => {
                const current = entity.entityType === selected;
                const attention = needsAttention(entity, approvers);
                return (
                  <li key={entity.entityType}>
                    {/* `aria-current`, not `aria-pressed`: this is the one item
                        of the set on show, not a toggle that stays on. */}
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => onSelect(entity.entityType)}
                      className={`${SELECTABLE_ROW} flex flex-col gap-1 aria-[current=true]:bg-[color:var(--color-surface-sunken)]`}
                    >
                      <span className="flex w-full items-start justify-between gap-2">
                        <span className="text-body-sm font-medium text-[color:var(--color-text-primary)]">
                          {t(`entity_${entity.entityType}`)}
                        </span>
                        <span
                          className={`shrink-0 rounded-[var(--radius-full)] border px-2 text-caption ${
                            entity.enabled
                              ? "border-[color:var(--color-brand-primary)] text-[color:var(--color-text-primary)]"
                              : "border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)]"
                          }`}
                        >
                          {entity.enabled ? t("statusRequired") : t("statusDirect")}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-[color:var(--color-text-secondary)]">
                        <span>{meta(entity)}</span>
                        {attention ? (
                          <span className="inline-flex items-center gap-1 font-medium text-[color:var(--color-semantic-error-text)]">
                            <UiIcon name="circle-alert" className="size-[var(--icon-size-xs)] shrink-0" />
                            {t("rowAttention")}
                          </span>
                        ) : null}
                        {entity.inFlightReviews > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <UiIcon name="lock" className="size-[var(--icon-size-xs)] shrink-0" />
                            {t("rowLocked")}
                          </span>
                        ) : null}
                        {dirty.has(entity.entityType) ? (
                          <span className="font-medium text-[color:var(--color-text-primary)]">{t("rowUnsaved")}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
};
