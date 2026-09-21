"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/admin/articles";

/**
 * What is waiting on the person reading the screen, and nothing else.
 *
 * ── Why the queue is the server's ──────────────────────────────────────────
 *
 * The rows come from `GET /workflow-instances/pending-mine`, which reads the
 * caller's identity from their token. Neither this component nor the page
 * above it filters: a reviewer's worklist assembled in the browser is a
 * worklist whose correctness depends on the browser, and the same endpoint
 * refuses to take a user id precisely so that nobody can ask for someone
 * else's.
 *
 * ── Two refusals, not one ──────────────────────────────────────────────────
 *
 * A reviewer who wants changes and a reviewer who refuses an item are doing
 * different things, and the engine cannot tell them apart — both leave the
 * article in draft and both restart the review. So the difference is recorded
 * as intent, through `revisionRequested`, and the two buttons call one route
 * with different values rather than pretending to be two mechanisms.
 *
 * Both demand a reason. A refusal with no reason gives the author nothing to
 * act on, which makes the review a gate rather than a conversation.
 */

export interface ReviewItem {
  /** The workflow instance — what a decision is taken on. */
  instanceId: string;
  article: Article;
  /** What the currently published version says, for comparison. Null where
   *  the article has never been published. */
  publishedTitle: { ar: string; en: string } | null;
  submittedAt: string | null;
}

export type ReviewDecision = "approve" | "reject" | "requestChanges";

export const ReviewQueue = ({
  items,
  locale,
  onDecide,
}: {
  items: readonly ReviewItem[];
  locale: "ar" | "en";
  /** Performs the decision. The screen above owns the request so this stays
   *  testable without a network. */
  onDecide: (instanceId: string, decision: ReviewDecision, reason: string) => Promise<void>;
}) => {
  const t = useTranslations("Newsroom");
  const format = useFormatter();

  const [prompting, setPrompting] = useState<{ instanceId: string; decision: ReviewDecision } | null>(null);
  const [reason, setReason] = useState("");
  const [showReasonError, setShowReasonError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (items.length === 0) {
    return (
      <p className="text-body text-[color:var(--color-text-secondary)]">{t("reviewEmpty")}</p>
    );
  }

  const close = () => {
    setPrompting(null);
    setReason("");
    setShowReasonError(false);
  };

  const confirm = async () => {
    if (!prompting) return;

    // Checked here, at the press that performs the decision, reading the
    // reason as it stands now — not at the press that opened the dialog.
    const needsReason = prompting.decision !== "approve";
    if (needsReason && reason.trim().length === 0) {
      setShowReasonError(true);
      return;
    }

    setBusy(true);
    try {
      await onDecide(prompting.instanceId, prompting.decision, reason.trim());
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ul className="flex list-none flex-col gap-4 p-0">
        {items.map((item) => (
          <li
            key={item.instanceId}
            className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-5"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-h4 text-balance text-[color:var(--color-text-primary)]">
                <Link href={`/news/${item.article._id}`} className="underline underline-offset-4">
                  {item.article.title[locale]}
                </Link>
              </h3>
              <p className="text-caption text-[color:var(--color-text-secondary)]">
                {t(`category_${item.article.category}`)}
                {item.submittedAt ? (
                  <> · {format.dateTime(new Date(item.submittedAt), { dateStyle: "long" })}</>
                ) : null}
              </p>
            </div>

            {/* What the reviewer is deciding is a CHANGE, so both sides are
                shown. Comparing against the currently published version rather
                than the last saved draft: the question is what will differ for
                a reader, not what differs from a draft nobody saw. */}
            <dl className="grid gap-3 text-body-sm sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-caption text-[color:var(--color-text-secondary)]">
                  {t("comparePrevious")}
                </dt>
                <dd className="m-0 text-[color:var(--color-text-secondary)]">
                  {item.publishedTitle ? item.publishedTitle[locale] : t("compareNone")}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-caption text-[color:var(--color-text-secondary)]">
                  {t("compareProposed")}
                </dt>
                <dd className="m-0 font-medium text-[color:var(--color-text-primary)]">
                  {item.article.title[locale]}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => setPrompting({ instanceId: item.instanceId, decision: "approve" })}>
                {t("reviewApprove")}
              </Button>
              <Button variant="secondary" onClick={() => setPrompting({ instanceId: item.instanceId, decision: "requestChanges" })}>
                {t("reviewRequestChanges")}
              </Button>
              <Button variant="secondary" onClick={() => setPrompting({ instanceId: item.instanceId, decision: "reject" })}>
                {t("reviewReject")}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {prompting ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(prompting.decision === "approve" ? "reviewApprove" : prompting.decision === "reject" ? "reviewReject" : "reviewRequestChanges")}
          className="mt-6 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] p-5"
        >
          {prompting.decision !== "approve" ? (
            <label className="flex flex-col gap-2">
              <span className="text-label font-medium text-[color:var(--color-text-secondary)]">
                {t("reasonLabel")}
              </span>
              <textarea
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setShowReasonError(false);
                }}
                rows={3}
                aria-invalid={showReasonError || undefined}
                aria-describedby={showReasonError ? "review-reason-error" : undefined}
                className="rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-base)] p-3 text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--a11y-focus-ring)]"
              />
              {showReasonError ? (
                <span id="review-reason-error" role="alert" className="text-caption text-[color:var(--color-semantic-error-text)]">
                  {t("reasonRequired")}
                </span>
              ) : null}
            </label>
          ) : null}

          <div className="flex gap-3">
            <Button onClick={() => void confirm()} loading={busy}>
              {t("confirm")}
            </Button>
            <Button variant="secondary" onClick={close} disabled={busy}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
};
