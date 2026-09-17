"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { StripBreakpoint } from "@uaeaf/content/sponsors";
import { SwitchField } from "@/components/admin/homepage-hero/switch-field";
import { SelectField } from "@/components/ui/select-field";
import type { AppLocale } from "@/i18n/routing";
import { stripRequests } from "@/lib/admin/sponsor-relations/relations-save";
import type { SponsorRecord, SponsorshipRecord } from "@/lib/admin/sponsor-relations/sponsors";
import { isStripDirty, previewStrip, validateStrip, type StripDraft } from "@/lib/admin/sponsor-relations/strip-settings";
import { EditorFrame } from "./editor-frame";
import { NameText, errorAt, nameLabel, useFieldMessage } from "./relation-parts";
import { focusElement, useRelationEditor } from "./use-relation-editor";

/**
 * The sponsor strip's settings screen (ADR-0077 D5, ADR-0085 D7): one set of
 * settings for the whole strip under the homepage hero, and a preview that
 * answers with the site's own functions which sponsor is pinned, in what order
 * the rest follow, and from which width the row stands still.
 */

/** The width each breakpoint starts at (`--breakpoint-*`, Chapter 5 §5.1). */
const BREAKPOINT_PX: Record<Exclude<StripBreakpoint, "base">, number> = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };

const CHOICE =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-skeleton)] has-[:checked]:border-[color:var(--color-brand-primary)]";

const keepAdoption = (draft: StripDraft) => draft;

export const StripEditor = ({
  initial,
  sponsors,
  sponsorships,
  bannerSponsorshipId,
  now: nowIso,
}: {
  initial: StripDraft;
  sponsors: readonly SponsorRecord[];
  sponsorships: readonly SponsorshipRecord[];
  bannerSponsorshipId: string | null;
  /** The server's clock at render, so the preview agrees with the site. */
  now: string;
}) => {
  const t = useTranslations("SponsorRelations");
  const locale = useLocale() as AppLocale;
  const message = useFieldMessage();
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const editor = useRelationEditor<StripDraft>({
    initial,
    isDirty: isStripDirty,
    adopt: keepAdoption,
    validate: validateStrip,
    requests: stripRequests,
    savedKey: "sponsor-relations:strip:saved",
  });
  const { draft, update, errors } = editor;
  const change = (patch: Partial<StripDraft>) => update((current) => ({ ...current, ...patch }));

  const names = new Map(sponsors.map((sponsor) => [sponsor._id, sponsor.name]));
  // What the strip can show: stored, shown and not cancelled or archived. The
  // window is the preview's business, so a sponsorship starting next month can
  // be chosen now.
  const choices = [...sponsorships]
    .filter((item) => item.isVisible && item.status === "Active" && names.has(String(item.sponsorId)))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const toggle = (id: string, checked: boolean) =>
    update((current) => {
      const chosen = new Set(current.sponsorshipIds);
      if (checked) chosen.add(id);
      else chosen.delete(id);
      // Kept in the sponsors list's order, which is what "manual" order means.
      return { ...current, sponsorshipIds: choices.map((item) => item._id).filter((candidate) => chosen.has(candidate)) };
    });

  const preview = previewStrip(draft, sponsors, sponsorships, bannerSponsorshipId, now);
  const rowLine =
    preview.rowFrom === null ? t("strip.rowNever") : preview.rowFrom === "base" ? t("strip.rowAlways") : t("strip.rowFrom", { width: BREAKPOINT_PX[preview.rowFrom] });

  const summaryItems = errors.map((error) => ({
    id: `${error.path}:${error.code}`,
    label: `${t("fields.sponsorshipIds")}: ${message(error)}`,
    onGo: () => focusElement("strip-sponsorshipIds"),
  }));

  const select = <K extends keyof StripDraft>(key: K, label: string, values: readonly string[], group: string) => (
    <SelectField
      id={`strip-${String(key)}`}
      label={label}
      options={values.map((value) => ({ value, label: t(`strip.${group}.${value}`) }))}
      value={String(draft[key])}
      onChange={(event) => change({ [key]: event.target.value } as Partial<StripDraft>)}
    />
  );

  const chosenError = message(errorAt(errors, "strip.sponsorshipIds"));

  return (
    <EditorFrame
      id="strip"
      title={t("strip.title")}
      description={t("strip.description")}
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
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="strip-settings-heading" className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-5">
          <h2 id="strip-settings-heading" className="sr-only">
            {t("strip.title")}
          </h2>
          <SwitchField id="strip-isVisible" label={t("strip.isVisible")} checked={draft.isVisible} onChange={(isVisible) => change({ isVisible })} />
          <div className="flex flex-col gap-2">
            {select("displayMode", t("strip.displayMode"), ["logo", "logoName", "logoNameScope"], "modes")}
            {preview.phoneFallsBack ? (
              <p role="note" className="rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-warning)] px-3 py-2 text-caption text-[color:var(--color-text-primary)]">
                {t("strip.phoneFallback")}
              </p>
            ) : null}
          </div>
          {select("selection", t("strip.selection"), ["allActive", "manual"], "selections")}
          {draft.selection === "manual" ? (
            <fieldset id="strip-sponsorshipIds" aria-describedby={chosenError ? "strip-sponsorshipIds-error" : undefined} className="flex flex-col gap-2">
              <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">{t("strip.chosen")}</legend>
              <ul className="flex flex-col gap-2">
                {choices.map((item) => {
                  const name = names.get(String(item.sponsorId))!;
                  return (
                    <li key={item._id}>
                      <label className={CHOICE}>
                        <input
                          type="checkbox"
                          checked={draft.sponsorshipIds.includes(item._id)}
                          onChange={(event) => toggle(item._id, event.target.checked)}
                          className="size-[18px] accent-[color:var(--color-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
                        />
                        <span className="text-label text-[color:var(--color-text-primary)]">
                          {nameLabel(name.ar ?? "", name.en ?? "", locale) ? <NameText ar={name.ar ?? ""} en={name.en ?? ""} locale={locale} /> : null}
                        </span>
                        <span className="text-caption text-[color:var(--color-text-secondary)]">{t(`sponsors.tiers.${item.tier}`)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {chosenError ? (
                <p id="strip-sponsorshipIds-error" className="text-caption font-medium text-[color:var(--color-text-primary)]">
                  {chosenError}
                </p>
              ) : null}
            </fieldset>
          ) : null}
          {select("order", t("strip.order"), ["tier", "manual"], "orders")}
          <SwitchField id="strip-pinTopTier" label={t("strip.pinTopTier")} checked={draft.pinTopTier} onChange={(pinTopTier) => change({ pinTopTier })} />
          {select("speed", t("strip.speed"), ["slow", "medium", "fast"], "speeds")}
        </section>

        <section aria-labelledby="strip-preview-heading" className="flex flex-col gap-3 xl:sticky xl:top-40">
          <h2 id="strip-preview-heading" className="text-h4 text-[color:var(--color-text-primary)]">
            {t("preview")}
          </h2>
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("previewHint")}</p>
          {!draft.isVisible ? (
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("strip.hidden")}</p>
          ) : !preview.pinned && preview.others.length === 0 ? (
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("previewEmpty")}</p>
          ) : (
            <>
              <ol className="flex flex-col gap-2">
                {[...(preview.pinned ? [preview.pinned] : []), ...preview.others].map((item, index) => (
                  <li
                    key={item.id}
                    className={`flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-[color:var(--color-surface-raised)] px-3 py-2 text-label text-[color:var(--color-text-primary)] ${
                      preview.pinned && index === 0 ? "border-2 border-[color:var(--color-brand-primary)]" : "border border-[color:var(--color-border-default)]"
                    }`}
                  >
                    <NameText ar={item.name.ar ?? ""} en={item.name.en ?? ""} locale={locale} />
                    {preview.pinned && index === 0 ? <span className="text-caption font-bold text-[color:var(--color-text-secondary)]">{t("strip.previewPinned")}</span> : null}
                  </li>
                ))}
              </ol>
              <p className="text-body-sm text-[color:var(--color-text-primary)]">{rowLine}</p>
            </>
          )}
        </section>
      </div>
    </EditorFrame>
  );
};
