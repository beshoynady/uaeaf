"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserResponse } from "@/lib/api/types";

const STATUSES: ReadonlyArray<UserResponse["accountStatus"]> = [
  "Active",
  "Suspended",
  "Deactivated",
];

/**
 * Changes one account's state.
 *
 * Deliberately a confirm-then-apply control rather than a select that writes
 * on change. Suspending an account signs that person out of every session
 * they have, immediately — a consequence worth one deliberate click, and one
 * the confirmation names before it happens rather than after.
 *
 * Disabled on the signed-in administrator's own row: the API refuses it
 * (403, "You cannot change the status of your own account."), for the same
 * reason it refuses self role-assignment — `users:Update` is a general
 * permission and locking yourself out, or quietly restoring your own
 * suspended account, is not what it is for.
 */
export function StatusControl({
  user,
  disabled,
  onDone,
}: {
  user: UserResponse;
  disabled: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("UsersDirectory");
  const statuses = useTranslations("AccountStatus");
  const router = useRouter();

  const [target, setTarget] = useState<UserResponse["accountStatus"]>(user.accountStatus);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const changed = target !== user.accountStatus;
  const endsSessions = changed && target !== "Active";

  async function save() {
    setSaving(true);
    setErrorKey(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountStatus: target }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setErrorKey(`status_${body?.code ?? "serviceUnavailable"}`);
        setSaving(false);
        return;
      }

      router.refresh();
      onDone();
    } catch {
      setErrorKey("status_serviceUnavailable");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-label font-bold text-[color:var(--color-text-primary)]">
        {t("statusTitle")}
      </p>

      {errorKey ? (
        <p role="alert" className="text-caption font-medium text-[color:var(--color-semantic-error)]">
          {t(errorKey)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="sr-only">{t("statusTitle")}</span>
          <select
            value={target}
            disabled={disabled || saving}
            onChange={(event) => setTarget(event.target.value as UserResponse["accountStatus"])}
            className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-3 text-label text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)]"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {statuses(status)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!changed || disabled || saving}
          onClick={save}
          className="h-10 rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-4 text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--button-disabled-text)] active:bg-[color:var(--button-primary-background-pressed)]"
        >
          {saving ? t("saving") : t("applyStatus")}
        </button>
      </div>

      <p aria-live="polite" className="text-caption text-[color:var(--color-text-secondary)]">
        {disabled
          ? t("cannotEditOwnStatus")
          : endsSessions
            ? t("statusEndsSessions")
            : t("statusNoChange")}
      </p>
    </div>
  );
}
