"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { EditorialStatusPanel } from "@/components/admin/editorial/status-panel";
import { EditorialRevisionsPanel } from "@/components/admin/editorial/revisions-panel";
import type { EditorialState } from "@/lib/admin/editorial-state";

/** What the shell hands the sections it frames. */
export interface EditorShellState {
  /** True while saving, and for a reader who may not edit. */
  disabled: boolean;
  /** Called on every edit, so a failure message never outlives the input
   *  that answered it. */
  clearFailure: () => void;
}

/**
 * The frame every workflow-governed page editor shares (ADR-0070): the save
 * bar, the browser's leave guard, the inline save failure, and the status and
 * version panels beside the form.
 *
 * Built from the President's Message screen, which keeps its own copy for
 * now. The draft stays with the page's editor, which knows its fields; the
 * shell knows only whether it is dirty, how to turn it into a request body,
 * and how to throw it away.
 *
 * - Saving sends only what changed (`body`), and re-reads the record, which is
 *   what makes the form clean again.
 * - A failure is shown beside the control that failed, not as a toast
 *   (ADR-0016); success is a toast.
 * - `save` returns whether it landed: the version panel's restore goes ahead
 *   only on `true` (CLAUDE.md §31).
 * - Two columns from `lg`, one below, by explicit grid placement so the
 *   keyboard order is the visual order (WCAG 2.4.3).
 */
export const EditorShell = ({
  entityType,
  entityId,
  dirty,
  body,
  onDiscard,
  canEdit,
  editorial,
  fieldLabels,
  children,
}: {
  /** The registry key, upstream and in the BFF. */
  entityType: string;
  entityId: string;
  dirty: boolean;
  body: () => Record<string, unknown>;
  onDiscard: () => void;
  /** False for a reviewer who may decide on the page but not rewrite it. */
  canEdit: boolean;
  /** Null when the API refused that read, which costs the panels and not the form. */
  editorial?: EditorialState | null;
  fieldLabels?: Readonly<Record<string, string>>;
  children: (state: EditorShellState) => ReactNode;
}) => {
  const t = useTranslations("EditorialEditor");
  const errors = useTranslations("WriteErrors");
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // The browser's own leave guard. Shared with the create screen, which had
  // none at all and lost a whole draft to a closed tab.
  useUnsavedGuard(dirty);

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setFailure(null);

    try {
      const response = await fetch(`/api/admin/editorial/${entityType}/${entityId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body()),
      });

      if (!response.ok) {
        const answer = (await response.json().catch(() => null)) as { code?: string } | null;
        setFailure(answer?.code ?? "serviceUnavailable");
        return false;
      }

      toast.show({
        tone: "success",
        title: t("savedTitle"),
        description: t("savedBody"),
        source: "api",
        dedupeKey: `${entityType}:saved`,
      });
      router.refresh();
      return true;
    } catch {
      setFailure("serviceUnavailable");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setFailure(null);
    onDiscard();
  };

  const panels =
    editorial || canEdit ? (
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        {editorial ? (
          <EditorialStatusPanel entityType={entityType} entityId={entityId} state={editorial} fieldLabels={fieldLabels} />
        ) : null}

        <EditorialRevisionsPanel
          entityType={entityType}
          entityId={entityId}
          canRestore={canEdit && (editorial?.canEdit ?? true)}
          hasUnsavedChanges={dirty}
          onSaveFirst={save}
          onDiscard={discard}
          fieldLabels={fieldLabels}
        />
      </div>
    ) : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {panels ? <div className="lg:col-start-2 lg:row-start-1">{panels}</div> : null}

      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <StickyFormActions statusProps={{ "data-dirty": dirty }} status={dirty ? t("unsaved") : t("allSaved")}>
          {canEdit ? (
          // Saving writes the draft; publishing is a decision taken in the
          // status panel, and that is the screen's one primary action
          // (Chapter 12 §12.15, editor recipe). So Save is the companion.
            <Button variant="secondary" onClick={() => void save()} loading={saving} disabled={!dirty}>
              {saving ? t("saving") : t("save")}
            </Button>
          ) : (
            <p className="text-label text-[color:var(--color-text-muted)]">{t("readOnly")}</p>
          )}
        </StickyFormActions>

        {failure ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] px-4 py-3 text-body font-medium text-[color:var(--color-text-primary)]"
          >
            {t("saveFailed")} {errors(failure)}
          </p>
        ) : null}

        {children({ disabled: saving || !canEdit, clearFailure: () => setFailure(null) })}
      </div>
    </div>
  );
};
