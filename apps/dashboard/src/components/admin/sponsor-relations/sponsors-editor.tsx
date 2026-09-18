"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { sponsorshipState } from "@uaeaf/content/sponsors";
import { MediaPicker, type MediaAssetOption } from "@/components/admin/pages/media-picker";
import { SwitchField } from "@/components/admin/homepage-hero/switch-field";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectField } from "@/components/ui/select-field";
import type { AppLocale } from "@/i18n/routing";
import { dubaiDayEndIso, dubaiDayStartIso } from "@/lib/admin/sponsor-relations/dubai-day";
import { ORGANIZATION_NAME_MAX } from "@/lib/admin/sponsor-relations/organizations";
import { sponsorRequests } from "@/lib/admin/sponsor-relations/relations-save";
import {
  SCOPE_LABEL_MAX,
  SPONSORSHIP_STATUSES,
  SPONSORSHIP_TARGET_TYPES,
  SPONSORSHIP_TIERS,
  addSponsor,
  addSponsorship,
  adoptCreatedSponsors,
  isSponsorsDirty,
  moveSponsor,
  planSponsors,
  previewShowcase,
  removeSponsor,
  removeSponsorship,
  updateSection,
  updateSponsor,
  updateSponsorship,
  validateSponsors,
  type SponsorDraft,
  type SponsorsDraft,
  type SponsorshipDraft,
} from "@/lib/admin/sponsor-relations/sponsors";
import { EditorFrame } from "./editor-frame";
import { DayFields, LogoPlate, NameFields, NameText, RecordList, errorAt, nameLabel, useFieldMessage } from "./relation-parts";
import { focusElement, useRelationEditor } from "./use-relation-editor";

/** The card's plate draws a logo at 120 CSS px, and nothing is ever drawn
 *  above half its source (ADR-0086 D4) — so a mark needs 240px on its
 *  shorter side to fill that plate without being scaled down. Below it the
 *  picker says so; it never refuses the upload. */
const LOGO_MIN_SOURCE_PX = 240;

/**
 * The sponsors screen (ADR-0077 D1–D2, ADR-0085): each sponsor with its
 * sponsorships beneath it, the SPONSORS section's banner preference and call to
 * action, and a preview of what the homepage shows now, drawn with the site's
 * own rule (`selectShowcase`: the banner is the highest tier running).
 */

type PendingRemove = { sponsorKey: string; key: string | null } | null;

const SECTION_CARD = "flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-5";

const graphemes = (text: string): number => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.trim())].length;

export const SponsorsEditor = ({
  initial,
  images: initialImages,
  canReadMedia,
  now: nowIso,
}: {
  initial: SponsorsDraft;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  /** The server's clock at render, so the states agree on both sides. */
  now: string;
}) => {
  const t = useTranslations("SponsorRelations");
  const locale = useLocale() as AppLocale;
  const message = useFieldMessage();
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const editor = useRelationEditor<SponsorsDraft>({
    initial,
    isDirty: isSponsorsDirty,
    adopt: adoptCreatedSponsors,
    validate: validateSponsors,
    requests: (saved, draft) => sponsorRequests(planSponsors(saved, draft)),
    savedKey: "sponsor-relations:sponsors:saved",
  });
  const { draft, saved, update, errors } = editor;

  const [selectedKey, setSelectedKey] = useState<string | null>(initial.sponsors[0]?.key ?? null);
  const [pendingRemove, setPendingRemove] = useState<PendingRemove>(null);
  const [library, setLibrary] = useState(initialImages);
  const onUploaded = useCallback((image: MediaAssetOption) => setLibrary((current) => [image, ...current]), []);

  const selected = draft.sponsors.find((sponsor) => sponsor.key === selectedKey) ?? null;
  const logoUrl = (id: string | null) => (id ? (library.find((image) => image.id === id)?.url ?? null) : null);
  // An unnamed sponsor is named by its place, so its summary lines say which one.
  const sponsorName = (sponsor: SponsorDraft) =>
    nameLabel(sponsor.nameAr, sponsor.nameEn, locale) ?? t("entryNumber", { number: draft.sponsors.indexOf(sponsor) + 1 });
  const ownerOf = (sponsorshipKey: string) => draft.sponsors.find((sponsor) => sponsor.sponsorships.some((item) => item.key === sponsorshipKey));

  const add = () => {
    const next = addSponsor(draft);
    update(() => next);
    setSelectedKey(next.sponsors[next.sponsors.length - 1].key);
  };

  const confirmRemove = () => {
    const pending = pendingRemove;
    setPendingRemove(null);
    if (!pending) return;
    // Read at the press (CLAUDE.md §31): the list may have changed since the
    // question was asked.
    if (pending.key) {
      const key = pending.key;
      update((current) => {
        const next = removeSponsorship(current, pending.sponsorKey, key);
        // A preference for a removed sponsorship would point at nothing.
        return current.section.bannerSponsorshipId === key ? updateSection(next, { bannerSponsorshipId: null }) : next;
      });
      editor.forgetErrors(`sponsorships.${key}.`);
      return;
    }
    const at = draft.sponsors.findIndex((sponsor) => sponsor.key === pending.sponsorKey);
    const removed = draft.sponsors[at];
    update((current) => {
      const next = removeSponsor(current, pending.sponsorKey);
      const preferred = removed?.sponsorships.some((item) => item.key === current.section.bannerSponsorshipId);
      return preferred ? updateSection(next, { bannerSponsorshipId: null }) : next;
    });
    editor.forgetErrors(`sponsors.${pending.sponsorKey}.`);
    removed?.sponsorships.forEach((item) => editor.forgetErrors(`sponsorships.${item.key}.`));
    const rest = draft.sponsors.filter((sponsor) => sponsor.key !== pending.sponsorKey);
    setSelectedKey(rest[Math.min(at, rest.length - 1)]?.key ?? null);
  };

  const fieldLabel = (field: string) => (t.has(`fields.${field}`) ? t(`fields.${field}`) : field);

  const summaryItems = errors.map((error) => {
    const [group, key, field] = error.path.split(".");
    const text = `${fieldLabel(group === "section" ? key : field)}: ${message(error)}`;
    const id = `${error.path}:${error.code}`;
    if (group === "section") {
      return { id, label: `${t("sponsors.section")} · ${text}`, onGo: () => focusElement(`section-${key}`) };
    }
    const owner = group === "sponsors" ? draft.sponsors.find((sponsor) => sponsor.key === key) : ownerOf(key);
    return {
      id,
      label: `${owner ? `${sponsorName(owner)} · ` : ""}${text}`,
      onGo: () => {
        if (owner) setSelectedKey(owner.key);
        window.requestAnimationFrame(() => focusElement(`${group}-${key}-${field}`));
      },
    };
  });

  const preview = useMemo(() => previewShowcase(draft, now), [draft, now]);
  // Only a stored sponsorship can be named by the section: a new one has no id
  // until it is saved.
  const bannerOptions = saved.sponsors.flatMap((sponsor) =>
    sponsor.sponsorships
      .filter((item) => item.id)
      .map((item) => ({ value: item.id!, label: `${nameLabel(sponsor.nameAr, sponsor.nameEn, locale) ?? ""} · ${t(`sponsors.tiers.${item.tier}`)}` })),
  );

  const stateOf = (item: SponsorshipDraft) => {
    const startDate = dubaiDayStartIso(item.startDay);
    if (!startDate) return null;
    return sponsorshipState({ startDate, endDate: item.endDay ? dubaiDayEndIso(item.endDay) : null, status: item.status as "Active" }, now);
  };

  const sponsorshipFields = (sponsor: SponsorDraft, item: SponsorshipDraft, number: number) => {
    const prefix = `sponsorships-${item.key}`;
    const path = `sponsorships.${item.key}`;
    const change = (patch: Partial<SponsorshipDraft>) => update((current) => updateSponsorship(current, sponsor.key, item.key, patch));
    const state = stateOf(item);
    return (
      <fieldset key={item.key} className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] p-4">
        <legend className="flex flex-wrap items-center gap-2 px-1 text-label font-bold text-[color:var(--color-text-primary)]">
          {t("sponsors.sponsorshipNumber", { number })}
          {/* A space in the text, so the group's name reads as two words; the
              flex gap only separates them on screen. */}
          {state ? " " : null}
          {state ?<span className="text-caption font-medium text-[color:var(--color-text-secondary)]">· {t(`sponsors.state.${state}`)}</span> : null}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id={`${prefix}-tier`}
            label={t("sponsors.tier")}
            options={SPONSORSHIP_TIERS.map((value) => ({ value, label: t(`sponsors.tiers.${value}`) }))}
            value={item.tier}
            onChange={(event) => change({ tier: event.target.value })}
            error={message(errorAt(errors, `${path}.tier`))}
          />
          <SelectField
            id={`${prefix}-targetType`}
            label={t("sponsors.targetType")}
            options={SPONSORSHIP_TARGET_TYPES.map((value) => ({ value, label: t(`sponsors.targets.${value}`) }))}
            value={item.targetType}
            onChange={(event) => change({ targetType: event.target.value })}
            hint={t("sponsors.targetHint")}
          />
        </div>
        <DayFields idPrefix={prefix} startDay={item.startDay} endDay={item.endDay} errors={errors} pathPrefix={path} onChange={change} />
        <SelectField
          id={`${prefix}-status`}
          label={t("sponsors.status")}
          options={SPONSORSHIP_STATUSES.map((value) => ({ value, label: t(`sponsors.statuses.${value}`) }))}
          value={item.status}
          onChange={(event) => change({ status: event.target.value })}
          hint={t("sponsors.statusHint")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={`${prefix}-scopeAr`}
            label={t("sponsors.scopeAr")}
            dir="rtl"
            lang="ar"
            value={item.scopeAr}
            onChange={(event) => change({ scopeAr: event.target.value })}
            hint={`${t("sponsors.scopeHint")} ${t("characters", { count: graphemes(item.scopeAr), max: SCOPE_LABEL_MAX })}`}
            error={message(errorAt(errors, `${path}.scopeAr`))}
          />
          <TextField
            id={`${prefix}-scopeEn`}
            label={t("sponsors.scopeEn")}
            dir="ltr"
            lang="en"
            value={item.scopeEn}
            onChange={(event) => change({ scopeEn: event.target.value })}
            hint={t("characters", { count: graphemes(item.scopeEn), max: SCOPE_LABEL_MAX })}
            error={message(errorAt(errors, `${path}.scopeEn`))}
          />
        </div>
        <SwitchField id={`${prefix}-isFeatured`} label={t("sponsors.isFeatured")} hint={t("sponsors.isFeaturedHint")} checked={item.isFeatured} onChange={(isFeatured) => change({ isFeatured })} />
        <SwitchField id={`${prefix}-isVisible`} label={t("isVisible")} hint={t("isVisibleHint")} checked={item.isVisible} onChange={(isVisible) => change({ isVisible })} />
        <div>
          <Button variant="secondary" onClick={() => setPendingRemove({ sponsorKey: sponsor.key, key: item.key })}>
            {t("remove")}
          </Button>
        </div>
      </fieldset>
    );
  };

  const pendingTitle = (() => {
    if (!pendingRemove) return "";
    return pendingRemove.key ? t("sponsors.removeSponsorshipTitle") : t("sponsors.removeSponsorTitle");
  })();

  const previewName = (item: { sponsorName: { ar: string | null; en: string | null } }) => (
    <NameText ar={item.sponsorName.ar ?? ""} en={item.sponsorName.en ?? ""} locale={locale} />
  );

  return (
    <EditorFrame
      id="sponsors"
      title={t("sponsors.title")}
      description={t("sponsors.description")}
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
          label={t("sponsors.listLabel")}
          records={draft.sponsors.map((sponsor) => ({
            key: sponsor.key,
            ar: sponsor.nameAr,
            en: sponsor.nameEn,
            logoUrl: logoUrl(sponsor.logoId),
            isDemo: sponsor.isDemo,
            isVisible: sponsor.sponsorships.some((item) => item.isVisible),
            meta: [...new Set(sponsor.sponsorships.map((item) => t(`sponsors.tiers.${item.tier}`)))].join(" · ") || undefined,
          }))}
          selectedKey={selectedKey}
          locale={locale}
          onSelect={setSelectedKey}
          onMove={(key, delta) => update((current) => moveSponsor(current, key, delta))}
          addLabel={t("sponsors.add")}
          onAdd={add}
          empty={t("sponsors.empty")}
        />

        {selected ? (
          <section aria-labelledby={`sponsors-${selected.key}-heading`} className={SECTION_CARD}>
            <h2 id={`sponsors-${selected.key}-heading`} className="text-h4 text-[color:var(--color-text-primary)]">
              {selected.nameAr || selected.nameEn ? <NameText ar={selected.nameAr} en={selected.nameEn} locale={locale} /> : t("untitled")}
            </h2>
            <NameFields
              idPrefix={`sponsors-${selected.key}`}
              ar={selected.nameAr}
              en={selected.nameEn}
              max={ORGANIZATION_NAME_MAX}
              errors={errors}
              pathPrefix={`sponsors.${selected.key}`}
              onChange={(patch) => update((current) => updateSponsor(current, selected.key, patch))}
            />
            <div id={`sponsors-${selected.key}-logoId`} role="group" aria-describedby={errorAt(errors, `sponsors.${selected.key}.logoId`) ? `sponsors-${selected.key}-logoId-error` : undefined} className="flex flex-col gap-2">
              <MediaPicker
                label={t("logo")}
                value={selected.logoId ?? ""}
                images={library}
                canRead={canReadMedia}
                disabled={false}
                locale={locale}
                minSourcePx={LOGO_MIN_SOURCE_PX}
                onChange={(id) => update((current) => updateSponsor(current, selected.key, { logoId: id || null }))}
                onUploaded={onUploaded}
              />
              {errorAt(errors, `sponsors.${selected.key}.logoId`) ? (
                <p id={`sponsors-${selected.key}-logoId-error`} className="text-caption font-medium text-[color:var(--color-text-primary)]">
                  {message(errorAt(errors, `sponsors.${selected.key}.logoId`))}
                </p>
              ) : null}
            </div>
            <TextField
              id={`sponsors-${selected.key}-website`}
              type="url"
              label={t("sponsors.website")}
              value={selected.website}
              onChange={(event) => update((current) => updateSponsor(current, selected.key, { website: event.target.value }))}
              hint={t("sponsors.websiteHint")}
              error={message(errorAt(errors, `sponsors.${selected.key}.website`))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id={`sponsors-${selected.key}-categoryAr`}
                label={t("sponsors.categoryAr")}
                dir="rtl"
                lang="ar"
                value={selected.categoryAr}
                onChange={(event) => update((current) => updateSponsor(current, selected.key, { categoryAr: event.target.value }))}
                hint={t("sponsors.categoryHint")}
                error={message(errorAt(errors, `sponsors.${selected.key}.categoryAr`))}
              />
              <TextField
                id={`sponsors-${selected.key}-categoryEn`}
                label={t("sponsors.categoryEn")}
                dir="ltr"
                lang="en"
                value={selected.categoryEn}
                onChange={(event) => update((current) => updateSponsor(current, selected.key, { categoryEn: event.target.value }))}
                error={message(errorAt(errors, `sponsors.${selected.key}.categoryEn`))}
              />
            </div>

            <section aria-labelledby={`sponsors-${selected.key}-ships`} className="flex flex-col gap-4">
              <h3 id={`sponsors-${selected.key}-ships`} className="text-label font-bold text-[color:var(--color-text-primary)]">
                {t("sponsors.sponsorships")}
              </h3>
              {selected.sponsorships.length === 0 ? <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("sponsors.noSponsorships")}</p> : null}
              {selected.sponsorships.map((item, index) => sponsorshipFields(selected, item, index + 1))}
              <div>
                <Button variant="secondary" onClick={() => update((current) => addSponsorship(current, selected.key))}>
                  {t("sponsors.addSponsorship")}
                </Button>
              </div>
            </section>

            <div>
              <Button variant="destructive" onClick={() => setPendingRemove({ sponsorKey: selected.key, key: null })}>
                {t("remove")}
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      <section aria-labelledby="sponsors-section-heading" className={SECTION_CARD}>
        <h2 id="sponsors-section-heading" className="text-h4 text-[color:var(--color-text-primary)]">
          {t("sponsors.section")}
        </h2>
        {draft.section.id ? (
          <>
            <div id="section-bannerSponsorshipId">
              <SelectField
                id="sponsors-banner"
                label={t("sponsors.banner")}
                options={[{ value: "", label: t("sponsors.bannerNone") }, ...bannerOptions]}
                value={draft.section.bannerSponsorshipId ?? ""}
                onChange={(event) => update((current) => updateSection(current, { bannerSponsorshipId: event.target.value || null }))}
                hint={t("sponsors.bannerHint")}
                error={message(errorAt(errors, "section.bannerSponsorshipId"))}
              />
            </div>
            <div id="section-ctaText" className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="sponsors-ctaTextAr"
                label={t("sponsors.ctaTextAr")}
                dir="rtl"
                lang="ar"
                value={draft.section.ctaTextAr}
                onChange={(event) => update((current) => updateSection(current, { ctaTextAr: event.target.value }))}
                hint={t("sponsors.ctaHint")}
                error={message(errorAt(errors, "section.ctaText"))}
              />
              <TextField
                id="sponsors-ctaTextEn"
                label={t("sponsors.ctaTextEn")}
                dir="ltr"
                lang="en"
                value={draft.section.ctaTextEn}
                onChange={(event) => update((current) => updateSection(current, { ctaTextEn: event.target.value }))}
                error={message(errorAt(errors, "section.ctaText"))}
              />
            </div>
            <div id="section-ctaUrl">
              <TextField
                id="sponsors-ctaUrl"
                label={t("sponsors.ctaUrl")}
                value={draft.section.ctaUrl}
                onChange={(event) => update((current) => updateSection(current, { ctaUrl: event.target.value }))}
                error={message(errorAt(errors, "section.ctaUrl"))}
              />
            </div>
          </>
        ) : (
          <p role="status" className="text-body-sm text-[color:var(--color-text-secondary)]">
            {t("sponsors.sectionMissing")}
          </p>
        )}
      </section>

      <section aria-labelledby="sponsors-preview-heading" className="flex flex-col gap-4">
        <h2 id="sponsors-preview-heading" className="text-h4 text-[color:var(--color-text-primary)]">
          {t("preview")}
        </h2>
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("previewHint")}</p>
        {!preview.banner && preview.grid.length === 0 ? <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("previewEmpty")}</p> : null}
        {preview.banner ? (
          <section aria-labelledby="sponsors-preview-banner" className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] p-4">
            <h3 id="sponsors-preview-banner" className="text-caption font-bold text-[color:var(--color-text-secondary)]">
              {t("sponsors.previewBanner")}
            </h3>
            <div className="flex items-center gap-4">
              <span className="w-24 shrink-0">
                <LogoPlate url={logoUrl(ownerOf(preview.banner.key)?.logoId ?? null)} size="card" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-caption text-[color:var(--color-text-secondary)]">{t(`sponsors.tiers.${preview.banner.tier}`)}</span>
                <span className="text-h4 text-[color:var(--color-text-primary)]">{previewName(preview.banner)}</span>
              </span>
            </div>
          </section>
        ) : null}
        {preview.grid.length > 0 ? (
          <section aria-labelledby="sponsors-preview-grid" className="flex flex-col gap-2">
            <h3 id="sponsors-preview-grid" className="text-caption font-bold text-[color:var(--color-text-secondary)]">
              {t("sponsors.previewGrid")}
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {preview.grid.map((item) => {
                const owner = ownerOf(item.key);
                return (
                  <li
                    key={item.key}
                    className={`flex flex-col items-center gap-2 rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] p-3 text-center ${item.isFeatured ? "border-2 border-[color:var(--color-brand-primary)]" : "border border-[color:var(--color-border-default)]"}`}
                  >
                    <LogoPlate url={logoUrl(owner?.logoId ?? null)} size="card" />
                    <span className="text-label font-medium text-[color:var(--color-text-primary)]">{previewName(item)}</span>
                    <span className="text-caption text-[color:var(--color-text-secondary)]">{t(`sponsors.tiers.${item.tier}`)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </section>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={pendingTitle}
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
