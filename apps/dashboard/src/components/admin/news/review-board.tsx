"use client";

import { useRouter } from "@/i18n/navigation";
import { ReviewQueue, type ReviewDecision, type ReviewItem } from "./review-queue";

/**
 * The review queue, wired to the API.
 *
 * Kept apart from `ReviewQueue` so that component stays testable without a
 * network: the queue owns what a reviewer sees and when a decision is allowed,
 * and this owns only how the decision travels.
 *
 * All three decisions go through the one generic editorial handler. A refusal
 * and a request for changes call the SAME upstream action with a different
 * `revisionRequested` — because the engine treats them identically, and
 * pretending they are two mechanisms would be a lie told in the URL.
 */
export const ReviewBoard = ({
  items,
  locale,
}: {
  items: readonly ReviewItem[];
  locale: "ar" | "en";
}) => {
  const router = useRouter();

  const decide = async (instanceId: string, decision: ReviewDecision, reason: string) => {
    const action = decision === "approve" ? "approve" : "reject";
    const body =
      decision === "approve" ? {} : { reason, revisionRequested: decision === "requestChanges" };

    const response = await fetch(`/api/admin/editorial/articles/${instanceId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      // Re-read rather than splice the row out locally: a decision can change
      // more than the row it was taken on — a parallel step may now be
      // satisfied, and the next reviewer's queue is the server's answer.
      router.refresh();
    }
  };

  return <ReviewQueue items={items} locale={locale} onDecide={decide} />;
};
