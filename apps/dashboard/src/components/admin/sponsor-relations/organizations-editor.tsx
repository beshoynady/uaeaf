"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MediaPicker, type MediaAssetOption } from "@/components/admin/pages/media-picker";
import { SwitchField } from "@/components/admin/homepage-hero/switch-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectField } from "@/components/ui/select-field";
import type { AppLocale } from "@/i18n/routing";
import {
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPES,
  ORGANIZATION_NAME_MAX,
  PARTNERSHIP_TYPES,
  addOrganization,
  adoptCreatedOrganizations,
  isOrganizationsDirty,
  moveOrganization,
  planOrganizations,
  removeOrganization,
  updateOrganization,
  validateOrganizations,
  type FieldError,
  type OrganizationDraft,
  type OrganizationKind,
  type OrganizationsDraft,
} from "@/lib/admin/sponsor-relations/organizations";
import { organizationRequests } from "@/lib/admin/sponsor-relations/relations-save";
import { EditorFrame } from "./editor-frame";
import { DayFields, LogoPlate, NameFields, NameText, RecordList, errorAt, nameLabel, useFieldMessage } from "./relation-parts";
import { focusElement, useRelationEditor } from "./use-relation-editor";

/**
 * The partners and the memberships screens (ADR-0077 D3, ADR-0085): the list in
 * the site's order, the chosen record's fields, and a preview of the homepage
 * section drawn with the site's naming rule.
 *
 * The two screens are one editor: the records are the same logo-and-name card,
 * and only the type list and the in-force field differ.
 */

const TYPES: Record<OrganizationKind, readonly string[]> = { partners: PARTNERSHIP_TYPES, memberships: MEMBERSHIP_TYPES };

export const OrganizationsEditor = ({
  kind,
  initial,
  images: initialImages,
  canReadMedia,
}: {
  kind: OrganizationKind;
  initial: OrganizationsDraft;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
}) => {
  const t = useTranslations("SponsorRelations");
  const locale = useLocale() as AppLocale;
  const message = useFieldMessage();

  const editor = useRelationEditor<OrganizationsDraft>({
    initial,
    isDirty: isOrganizationsDirty,
    adopt: adoptCreatedOrganizations,
    validate: (draft) => validateOrganizations(kind, draft),
    requests: (saved, draft) => organizationRequests(kind, planOrganizations(kind, saved, draft)),
    savedKey: `sponsor-relations:${kind}:saved`,
  });
  const { draft, update, errors } = editor;

  const [selectedKey, setSelectedKey] = useState<string | null>(initial.items[0]?.key ?? null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [library, setLibrary] = useState(initialImages);
  const onUploaded = useCallback((image: MediaAssetOption) => setLibrary((current) => [image, ...current]), []);

  const selectedIndex = draft.items.findIndex((item) => item.key === selectedKey);
  const selected = selectedIndex >= 0 ? draft.items[selectedIndex] : null;
  const logoUrl = (id: string | null) => (id ? (library.find((image) => image.id === id)?.url ?? null) : null);
  // An unnamed record is named by its place, so its summary lines say which one.
  const recordName = (item: OrganizationDraft) =>
    nameLabel(item.nameAr, item.nameEn, locale) ?? t("entryNumber", { number: draft.items.indexOf(item) + 1 });

  const change = (key: string, patch: Partial<OrganizationDraft>) => update((current) => updateOrganization(current, key, patch));

  const add = () => {
    const next = addOrganization(kind, draft);
    update(() => next);
    setSelectedKey(next.items[next.items.length - 1].key);
  };

  const confirmRemove = () => {
    const key = pendingRemove;
    setPendingRemove(null);
    if (!key) return;
    // Read at the press (CLAUDE.md §31): the list may have moved since the
    // question was asked.
    const at = draft.items.findIndex((item) => item.key === key);
    const next = removeOrganization(draft, key);
    update(() => next);
    editor.forgetErrors(`items.${key}.`);
    setSelectedKey(next.items[Math.min(at, next.items.length - 1)]?.key ?? null);
  };

  const summaryItems = errors.map((error: FieldError) => {
    const [, key, field] = error.path.split(".");
    const item = draft.items.find((candidate) => candidate.key === key);
    const target = `${kind}-${key}-${field}`;
    return {
      id: `${error.path}:${error.code}`,
      label: `${item ? `${recordName(item)} · ` : ""}${t(`fields.${field}`)}: ${message(error)}`,
      onGo: () => {
        setSelectedKey(key);
        window.requestAnimationFrame(() => focusElement(target));
      },
    };
  });

  const types = TYPES[kind].map((value) => ({ value, label: t(`${kind}.types.${value}`) }));
  const visible = draft.items.filter((item) => item.isVisible);
  const idPrefix = selected ? `${kind}-${selected.key}` : kind;

  return (
    <EditorFrame
      id={kind}
      title={t(`${kind}.title`)}
      description={t(`${kind}.description`)}
      dirty={editor.dirty}
      saving={editor.saving}
      awaiting={editor.awaiting}
      onSave={() => void editor.save()}
      items={summaryItems}
      failure={editor.failure}
      summaryRef={editor.summary}
      pendingLeave={editor.pendingLeave}
      onLeave={editor.leave}
      onStay={() => editor.setPendingLeave(null)}
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <RecordList
          label={t(`${kind}.listLabel`)}
          records={draft.items.map((item) => ({
            key: item.key,
            ar: item.nameAr,
            en: item.nameEn,
            logoUrl: logoUrl(item.logoId),
            isDemo: item.isDemo,
            isVisible: item.isVisible,
          }))}
          selectedKey={selectedKey}
          locale={locale}
          onSelect={setSelectedKey}
          onMove={(key, delta) => update((current) => moveOrganization(current, key, delta))}
          addLabel={t(`${kind}.add`)}
          onAdd={add}
          empty={t(`${kind}.empty`)}
        />

        {selected ? (
          <section aria-labelledby={`${idPrefix}-heading`} className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-5">
            <h2 id={`${idPrefix}-heading`} className="text-h4 text-[color:var(--color-text-primary)]">
              {selected.nameAr || selected.nameEn ? <NameText ar={selected.nameAr} en={selected.nameEn} locale={locale} /> : t("untitled")}
            </h2>
            <NameFields
              idPrefix={idPrefix}
              ar={selected.nameAr}
              en={selected.nameEn}
              max={ORGANIZATION_NAME_MAX}
              errors={errors}
              pathPrefix={`items.${selected.key}`}
              onChange={(patch) => change(selected.key, patch)}
            />
            <MediaPicker
              label={t("logo")}
              value={selected.logoId ?? ""}
              images={library}
              canRead={canReadMedia}
              disabled={false}
              locale={locale}
              onChange={(id) => change(selected.key, { logoId: id || null })}
              onUploaded={onUploaded}
            />
            <SelectField
              id={`${idPrefix}-type`}
              label={t("type")}
              options={types}
              placeholder={!selected.type}
              required
              value={selected.type}
              onChange={(event) => change(selected.key, { type: event.target.value })}
              error={message(errorAt(errors, `items.${selected.key}.type`))}
            />
            <DayFields
              idPrefix={idPrefix}
              startDay={selected.startDay}
              endDay={selected.endDay}
              errors={errors}
              pathPrefix={`items.${selected.key}`}
              onChange={(patch) => change(selected.key, patch)}
            />
            {kind === "partners" ? (
              <SwitchField id={`${idPrefix}-isActive`} label={t("partners.isActive")} checked={selected.isActive} onChange={(isActive) => change(selected.key, { isActive })} />
            ) : (
              <SelectField
                id={`${idPrefix}-status`}
                label={t("memberships.status")}
                options={MEMBERSHIP_STATUSES.map((value) => ({ value, label: t(`memberships.statuses.${value}`) }))}
                value={selected.status}
                onChange={(event) => change(selected.key, { status: event.target.value })}
              />
            )}
            <SwitchField
              id={`${idPrefix}-isVisible`}
              label={t("isVisible")}
              hint={t("isVisibleHint")}
              checked={selected.isVisible}
              onChange={(isVisible) => change(selected.key, { isVisible })}
            />
            <div>
              <Button variant="destructive" onClick={() => setPendingRemove(selected.key)}>
                {t("remove")}
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      <section aria-labelledby={`${kind}-preview-heading`} className="flex flex-col gap-3">
        <h2 id={`${kind}-preview-heading`} className="text-h4 text-[color:var(--color-text-primary)]">
          {t("preview")}
        </h2>
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("previewHint")}</p>
        {visible.length === 0 ? (
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("previewEmpty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {visible.map((item) => (
              <li key={item.key} className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-3 text-center">
                <LogoPlate url={logoUrl(item.logoId)} size="card" />
                <NameText ar={item.nameAr} en={item.nameEn} locale={locale} className="text-label font-medium text-[color:var(--color-text-primary)]" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={`${t("remove")}: ${(() => {
          const item = draft.items.find((candidate) => candidate.key === pendingRemove);
          return item ? recordName(item) : "";
        })()}`}
        confirmLabel={t("removeConfirm")}
        cancelLabel={t("cancel")}
        tone="destructive"
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      >
        {t("removeBody")}
      </ConfirmDialog>
    </EditorFrame>
  );
};
