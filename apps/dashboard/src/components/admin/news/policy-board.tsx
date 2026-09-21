"use client";

import { useRouter } from "@/i18n/navigation";
import { PolicyManager } from "./policy-manager";
import type { ApprovalChoice, ApproverOption, GovernableEntity } from "@/lib/admin/approval-policies";

/**
 * The policy screen, wired to the API.
 *
 * Separated from `PolicyManager` for the same reason the review board is:
 * the manager owns which arrangements are valid and what they mean, and this
 * owns only how one travels.
 *
 * The entity type goes in the body rather than the path. Upstream it is a path
 * segment, and repeating that here would give the browser one more place to
 * choose which record its body reaches.
 */
export const PolicyBoard = ({
  entities,
  approvers,
  locale,
}: {
  entities: readonly GovernableEntity[];
  approvers: readonly ApproverOption[];
  locale: "ar" | "en";
}) => {
  const router = useRouter();

  const save = async (entityType: string, choice: ApprovalChoice) => {
    const response = await fetch("/api/admin/approval-policies", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, ...choice }),
    });

    if (response.ok) {
      // The server reads the arrangement back from what it actually stored —
      // including the mode, which it derives from the steps rather than from
      // the label sent. Re-reading is how the screen shows what was saved
      // rather than what was asked for.
      router.refresh();
    }
  };

  return <PolicyManager entities={entities} approvers={approvers} locale={locale} onSave={save} />;
};
