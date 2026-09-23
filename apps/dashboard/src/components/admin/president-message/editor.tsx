"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { EditorialStatusPanel } from "@/components/admin/editorial/status-panel";
import { EditorialRevisionsPanel } from "@/components/admin/editorial/revisions-panel";
import type { EditorialState } from "@/lib/admin/editorial-state";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import { changedFrom, toDraft, toPatchBody } from "@/lib/admin/president-message";
import type { PresidentMessageDraft, PresidentMessageResponse } from "@/lib/admin/president-message";
import type { AppLocale } from "@/i18n/routing";
import { FormSection } from "@/components/ui/form-section";

/** The registry key this record is addressed by, upstream and in the BFF. */
const ENTITY_TYPE = "presidentMessagePage";
import { HeroSection } from "./hero-section";
import { QuoteSection } from "./quote-section";
import { BodySection } from "./body-section";
import { ClosingSection } from "./closing-section";
import { ValuesSection } from "./values-section";
import { SeoSection } from "./seo-section";

/**
 * The whole message, on one screen, in the order it is printed.
 *
 * One draft held here rather than one per section: two sections read the same
 * `signatoryName`, and a section keeping its own copy would show one of them
 * a stale value. Sections receive their slice and a `onChange` that merges —
 * they hold nothing.
 *
 * Saving sends only the fields that changed (`toPatchBody`). That is not an
 * optimisation: two people may have this screen open on different sections,
 * and a save posting every field would have the second overwrite the first's
 * work with the values their own form was loaded with.
 */
export function PresidentMessageEditor({
  record,
  images,
  canEdit,
  canReadMedia,
  locale,
  editorial,
  fieldLabels,
}: {
  record: PresidentMessageResponse;
  images: readonly MediaAssetOption[];
  /** False for a reviewer who may decide on the message but not rewrite it. */
  canEdit: boolean;
  canReadMedia: boolean;
  locale: AppLocale;
  /** The record's editorial state as the server rendered it; null when the
   *  API refused that read, which costs the panels and not the form. */
  editorial?: EditorialState | null;
  fieldLabels?: Readonly<Record<string, string>>;
}) {
  const t = useTranslations("PresidentMessage");
  const errors = useTranslations("WriteErrors");
  const router = useRouter();
  const toast = useToast();

  // The record as a draft, built once: it is the baseline every keystroke is
  // compared against, and rebuilding it each time would make that comparison
  // deep instead of a reference check.
  const original = useMemo(() => toDraft(record), [record]);
  const [draft, setDraft] = useState<PresidentMessageDraft>(original);
  const [library, setLibrary] = useState<readonly MediaAssetOption[]>(images);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const dirty = changedFrom(original, draft).length > 0;
  const disabled = saving || !canEdit;

  /**
   * The browser's own leave guard.
   *
   * A long form is exactly where a closed tab costs an hour, and this is the
   * only mechanism that catches a closed tab — a router guard cannot. The
   * wording is the browser's; `preventDefault` is what asks for it, and it
   * is registered only while there is something to lose so a clean form
   * never interrupts anyone.
   */
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Some browsers still require the legacy return value to show the
      // prompt at all; the string itself is never displayed.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (patch: Partial<PresidentMessageDraft>) => {
    setFailure(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const onUploaded = (image: MediaAssetOption) => setLibrary((current) => [image, ...current]);

  /**
   * @returns whether the save landed. The version panel asks for a save
   * before a restore, and a restore that went ahead on a failed save would
   * overwrite the very work the save failed to keep.
   */
  async function save(): Promise<boolean> {
    setSaving(true);
    setFailure(null);

    try {
      const response = await fetch(`/api/admin/editorial/${ENTITY_TYPE}/${record._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toPatchBody(record, draft)),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        // Inline, not a toast: ADR-0016 keeps a failure that stopped the task
        // beside the control that failed, where the reader is already looking
        // and can re-read it.
        setFailure(body?.code ?? "serviceUnavailable");
        return false;
      }

      toast.show({
        tone: "success",
        title: t("savedTitle"),
        description: t("savedBody"),
        source: "api",
        dedupeKey: "president-message:saved",
      });
      // Re-reads the record, which is what makes the form clean again: the
      // dirty flag is a comparison against what the server last confirmed.
      router.refresh();
      return true;
    } catch {
      setFailure("serviceUnavailable");
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** Throws the unsaved edits away, back to the record as last read from the
   *  server. Offered only by the version panel's guard, which is the one
   *  place discarding is the lesser loss. */
  function discard(): void {
    setFailure(null);
    setDraft(original);
  }

  const imageProps = { images: library, canReadMedia, locale, onUploaded };
  const shared = { draft, onChange: change, disabled };

  const panels =
    editorial || canEdit ? (
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        {editorial ? (
          <EditorialStatusPanel
            entityType={ENTITY_TYPE}
            entityId={record._id}
            state={editorial}
            fieldLabels={fieldLabels}
          />
        ) : null}

        <EditorialRevisionsPanel
          entityType={ENTITY_TYPE}
          entityId={record._id}
          // Two gates, both from the server: the Update permission this screen
          // was opened with, and whether a review in progress has handed the
          // draft to someone else.
          canRestore={canEdit && (editorial?.canEdit ?? true)}
          hasUnsavedChanges={dirty}
          onSaveFirst={save}
          onDiscard={discard}
          fieldLabels={fieldLabels}
        />
      </div>
    ) : null;

  return (
    /*
      Two columns from `lg` (1024px) up, one below — the same breakpoint and
      the same stacking the signed-in shell uses for its own sidebar, so the
      screen folds once rather than twice.

      The layout lives here rather than in the page because the draft does:
      the version panel's guard needs `dirty`, and its two ways past that
      guard are this component's own `save` and `discard`. Lifting those into
      the server page is not possible, and duplicating them would give the
      screen two ideas of what "unsaved" means.

      Explicit grid placement rather than source order plus `order-*`: the
      panels come first in the document because below `lg` they are the top
      bar, and CSS `order` would move them visually without moving them for
      the keyboard — the mismatch WCAG 2.4.3 is about. `col-start-2` follows
      the writing direction on its own, so no RTL special case.
    */
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {panels ? <div className="lg:col-start-2 lg:row-start-1">{panels}</div> : null}

      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-3">
        {/* `role="status"`: whether there is unsaved work is a standing fact
            the reader returns to, and it changes without them asking. */}
        <p
          role="status"
          className="text-label text-[color:var(--color-text-secondary)]"
          data-dirty={dirty}
        >
          {dirty ? t("unsaved") : t("allSaved")}
        </p>

        {canEdit ? (
          <Button onClick={() => void save()} loading={saving} disabled={!dirty}>
            {saving ? t("saving") : t("save")}
          </Button>
        ) : (
          <p className="text-label text-[color:var(--color-text-muted)]">{t("readOnly")}</p>
        )}
      </div>

      {failure ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] px-4 py-3 text-body font-medium text-[color:var(--color-text-primary)]"
        >
          {t("saveFailed")} {errors(failure)}
        </p>
      ) : null}

      <FormSection number={1} title={t("sectionHero")}>
        <HeroSection {...shared} {...imageProps} />
      </FormSection>

      <FormSection number={2} title={t("sectionQuote")}>
        <QuoteSection {...shared} />
      </FormSection>

      <FormSection number={3} title={t("sectionBody")}>
        <BodySection {...shared} />
      </FormSection>

      <FormSection number={4} title={t("sectionClosing")}>
        <ClosingSection {...shared} />
      </FormSection>

      <FormSection number={5} title={t("sectionValues")}>
        <ValuesSection {...shared} />
      </FormSection>

      <FormSection number={6} title={t("sectionSeo")}>
        <SeoSection {...shared} {...imageProps} />
      </FormSection>
      </div>
    </div>
  );
}
