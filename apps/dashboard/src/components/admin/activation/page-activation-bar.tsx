"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

/**
 * Whether a page is being served, and the control that changes it.
 *
 * Written for the About screen and generalised to every page screen by
 * ADR-0102 §D2. What it does is unchanged; what changed is that there is one of
 * it.
 *
 * ── Why this is not part of the form ──────────────────────────────────────
 *
 * Saving the draft and switching the page on are different acts with different
 * grants. Taking a live page down cannot wait for an approval; putting one up
 * happens after the words were approved. So this sends its own request, takes
 * effect at once, and is gated on `<entity>:Publish` — not on the Update grant
 * that lets someone rewrite the page.
 *
 * ── Why it is absent, not disabled, without the grant ─────────────────────
 *
 * A disabled control is an invitation to find out why. An editor without the
 * publish grant is not a lesser publisher; publishing is simply not their job,
 * and the bar tells them the page's state without offering them a lever.
 *
 * ── Why there is a dialog ─────────────────────────────────────────────────
 *
 * The effect is immediate and it is visible to the public. A misplaced click on
 * a one-press switch takes a federation page off the internet, and nothing on
 * the screen would have asked. The dialog says which of the two things is about
 * to happen, in terms of what a visitor will see, and names the page — one bar
 * now serves sixteen of them.
 */
export const PageActivationBar = ({
  entity,
  pageName,
  recordId,
  isActive,
  canPublish,
  saved = true,
}: {
  /** The key in `ACTIVATABLE_PAGES`. Also the `resourceType` upstream. */
  entity: string;
  /** The page's own name, for the dialog. The bar is shared; the question is
   *  not. */
  pageName: string;
  /** `null` for a singleton page — there is one row and the route takes no id.
   *  The row's id for a workflow-governed one. */
  recordId: string | null;
  isActive: boolean;
  /** `<entity>:Publish`. Without it the bar states the page's condition and
   *  offers no control. */
  canPublish: boolean;
  /** False before the page has ever been saved. There is no row to switch, so
   *  the control would 404 and read as a broken screen. */
  saved?: boolean;
}) => {
  const t = useTranslations("Activation");
  const errors = useTranslations("WriteErrors");
  const router = useRouter();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const turningOn = !isActive;

  const apply = async () => {
    setBusy(true);
    try {
      // The whole request is inside the try, not just the parsing: a dropped
      // connection rejects here, and without a catch it surfaced as an
      // unhandled rejection with the dialog left spinning. The editor is told
      // the same way an upstream refusal tells them.
      const response = await fetch(`/api/admin/page-activation/${entity}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        // Read here, at the moment the request is made, rather than captured
        // when the dialog opened (CLAUDE.md §31). The id is omitted for a
        // singleton page: upstream refuses the whole body over one unexpected
        // key.
        body: JSON.stringify(
          recordId === null ? { isActive: !isActive } : { recordId, isActive: !isActive },
        ),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        toast.show({
          tone: "error",
          source: "api",
          title: t("failed"),
          description: errors(body.code ?? "serviceUnavailable"),
        });
        return;
      }

      setAsking(false);
      toast.show({
        tone: "success",
        source: "api",
        title: turningOn ? t("nowLive") : t("nowOff"),
        dedupeKey: `${entity}:active`,
      });
      router.refresh();
    } catch {
      toast.show({
        tone: "error",
        source: "api",
        title: t("failed"),
        description: errors("serviceUnavailable"),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      data-entity={entity}
      className={`flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] border px-4 py-3.5 ${
        isActive
          ? "border-[color:var(--color-semantic-success)] bg-[color-mix(in_srgb,var(--color-semantic-success)_10%,transparent)]"
          : "border-[color:var(--color-semantic-error)] bg-[color-mix(in_srgb,var(--color-semantic-error)_10%,transparent)]"
      }`}
    >
      {isActive ? <EyeIcon /> : <EyeOffIcon />}

      <div className="flex min-w-0 grow flex-col gap-0.5">
        <span
          className={`text-body font-bold ${
            isActive ? "text-[color:var(--color-semantic-success-text)]" : "text-[color:var(--color-semantic-error-text)]"
          }`}
        >
          {isActive ? t("onTitle") : t("offTitle")}
        </span>
        <span className="text-label text-[color:var(--color-text-secondary)]">
          {isActive ? t("onNote") : t("offNote")}
        </span>
      </div>

      {!saved ? (
        <span className="text-label text-[color:var(--color-text-muted)]">{t("notSavedYet")}</span>
      ) : canPublish ? (
        <Button variant={turningOn ? "primary" : "secondary"} onClick={() => setAsking(true)}>
          {turningOn ? t("turnOn") : t("turnOff")}
        </Button>
      ) : (
        <span className="text-label text-[color:var(--color-text-muted)]">{t("needsPublishGrant")}</span>
      )}

      <ConfirmDialog
        open={asking}
        busy={busy}
        title={turningOn ? t("confirmOnTitle", { page: pageName }) : t("confirmOffTitle", { page: pageName })}
        confirmLabel={turningOn ? t("turnOnConfirm") : t("turnOffConfirm")}
        cancelLabel={t("cancel")}
        tone={turningOn ? "primary" : "destructive"}
        onConfirm={apply}
        onCancel={() => setAsking(false)}
      >
        {turningOn ? t("confirmOnBody") : t("confirmOffBody")}
      </ConfirmDialog>
    </div>
  );
};

const EyeIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="shrink-0 text-[color:var(--color-semantic-success-text)]"
  >
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="shrink-0 text-[color:var(--color-semantic-error-text)]"
  >
    <path d="M17.94 17.94A10 10 0 0 1 2 12s4-7 10-7a9.7 9.7 0 0 1 5 1.4M22 12s-1.2 2.1-3.4 4M1 1l22 22" />
  </svg>
);
