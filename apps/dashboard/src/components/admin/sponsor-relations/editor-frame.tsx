"use client";

import type { ReactNode, RefObject } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Failure } from "./use-relation-editor";

export interface SummaryItem {
  id: string;
  label: string;
  onGo: () => void;
}

const LINK =
  "underline underline-offset-4 hover:text-[color:var(--color-brand-primary)] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]";

/**
 * The frame the sponsors, partners, memberships and strip screens share: where
 * this is, whether it is saved, the one Save, the list of what could not be
 * saved, and the question asked before leaving with unsaved work.
 *
 * The same top bar and summary as the hero screen, so an editor meets one way
 * of saving across the homepage's screens.
 */
export const EditorFrame = ({
  id,
  title,
  description,
  dirty,
  saving,
  awaiting,
  onSave,
  items,
  failure,
  summaryRef,
  pendingLeave,
  onLeave,
  onStay,
  children,
}: {
  id: string;
  title: string;
  description: string;
  dirty: boolean;
  saving: boolean;
  awaiting: boolean;
  onSave: () => void;
  items: readonly SummaryItem[];
  failure: Failure;
  summaryRef: RefObject<HTMLDivElement | null>;
  pendingLeave: string | null;
  onLeave: () => void;
  onStay: () => void;
  children: ReactNode;
}) => {
  const t = useTranslations("SponsorRelations");
  const writeErrors = useTranslations("WriteErrors");
  const status = saving ? t("saving") : dirty ? t("unsaved") : t("saved");

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-20 -mx-6 flex flex-col gap-3 border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <nav aria-label={t("trail")}>
            <ol className="flex items-center gap-2 text-caption text-[color:var(--color-text-secondary)]">
              <li>{t("trailHome")}</li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-[color:var(--color-text-primary)]">
                {title}
              </li>
            </ol>
          </nav>
          <h1 className="text-h3 text-[color:var(--color-text-primary)]">{title}</h1>
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            aria-live="polite"
            data-save-state={saving ? "saving" : dirty ? "unsaved" : "saved"}
            className="inline-flex items-center gap-2 text-label text-[color:var(--color-text-secondary)]"
          >
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${dirty ? "border-2 border-[color:var(--color-brand-primary)]" : "bg-[color:var(--color-semantic-success)]"}`}
            />
            {status}
          </span>
          <Button onClick={onSave} disabled={!dirty || awaiting} loading={saving} title={!dirty ? t("noChanges") : undefined}>
            {t("save")}
          </Button>
        </div>
      </div>

      {items.length > 0 || failure ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="region"
          aria-labelledby={`${id}-summary-title`}
          className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-error)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)]"
        >
          <h2 id={`${id}-summary-title`} className="text-label font-bold text-[color:var(--color-text-primary)]">
            {failure?.partial ? t("summaryPartial") : t("summaryTitle")}
          </h2>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-body-sm text-[color:var(--color-text-primary)]">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    item.onGo();
                  }}
                  className={LINK}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {failure && items.length === 0 ? <li>{writeErrors(failure.code)}</li> : null}
          </ul>
        </div>
      ) : null}

      <div data-relation-editor-body="" inert={saving || undefined} className="flex flex-col gap-6">
        {children}
      </div>

      <ConfirmDialog
        open={pendingLeave !== null}
        title={t("leaveTitle")}
        confirmLabel={t("leaveConfirm")}
        cancelLabel={t("leaveCancel")}
        tone="destructive"
        onConfirm={onLeave}
        onCancel={onStay}
      >
        {t("leaveBody")}
      </ConfirmDialog>
    </div>
  );
};
