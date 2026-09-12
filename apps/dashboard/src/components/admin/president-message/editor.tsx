"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import { changedFrom, toDraft, toPatchBody } from "@/lib/admin/president-message";
import type { PresidentMessageDraft, PresidentMessageResponse } from "@/lib/admin/president-message";
import type { AppLocale } from "@/i18n/routing";
import { EditorSection } from "./section";
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
}: {
  record: PresidentMessageResponse;
  images: readonly MediaAssetOption[];
  /** False for a reviewer who may decide on the message but not rewrite it. */
  canEdit: boolean;
  canReadMedia: boolean;
  locale: AppLocale;
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

  async function save() {
    setSaving(true);
    setFailure(null);

    try {
      const response = await fetch(`/api/admin/editorial/presidentMessagePage/${record._id}`, {
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
        return;
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
    } catch {
      setFailure("serviceUnavailable");
    } finally {
      setSaving(false);
    }
  }

  const imageProps = { images: library, canReadMedia, locale, onUploaded };
  const shared = { draft, onChange: change, disabled };

  return (
    <div className="flex flex-col gap-4">
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
          <Button onClick={save} loading={saving} disabled={!dirty}>
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

      <EditorSection number={1} title={t("sectionHero")}>
        <HeroSection {...shared} {...imageProps} />
      </EditorSection>

      <EditorSection number={2} title={t("sectionQuote")}>
        <QuoteSection {...shared} />
      </EditorSection>

      <EditorSection number={3} title={t("sectionBody")}>
        <BodySection {...shared} />
      </EditorSection>

      <EditorSection number={4} title={t("sectionClosing")}>
        <ClosingSection {...shared} />
      </EditorSection>

      <EditorSection number={5} title={t("sectionValues")}>
        <ValuesSection {...shared} />
      </EditorSection>

      <EditorSection number={6} title={t("sectionSeo")}>
        <SeoSection {...shared} {...imageProps} />
      </EditorSection>
    </div>
  );
}
