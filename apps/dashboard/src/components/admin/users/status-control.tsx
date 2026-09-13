"use client";

import { SelectField } from "@/components/ui/select-field";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { localized, type UserResponse } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { AppLocale } from "@/i18n/routing";

const STATUSES: ReadonlyArray<UserResponse["accountStatus"]> = [
  "Active",
  "Suspended",
  "Deactivated",
];

/** Only the states that end sessions are asked about, and the confirming
 *  button names that act rather than its category. */
const CONFIRM_ACTION: Record<Exclude<UserResponse["accountStatus"], "Active">, string> = {
  Suspended: "statusConfirmSuspend",
  Deactivated: "statusConfirmDeactivate",
};

/**
 * Changes one account's state.
 *
 * Deliberately a choose-then-apply control rather than a select that writes on
 * change. Suspending or deactivating an account signs that person out of every
 * session they have, on every device, at once.
 *
 * So that change is asked about before it is sent, in the same `ConfirmDialog`
 * the publish action uses, worded the way archiving a role is: what happens,
 * to whom, and that it happens immediately. Its button says "Suspend account"
 * or "Deactivate account", as "Archive role" does, because a button reading
 * "Change status" reads the same in front of either. Reactivating ends nothing and
 * applies without a dialog — a confirmation in front of a harmless change
 * teaches the reader to click through the one in front of a harmful one.
 *
 * The consequence is stated three times, and none of them is redundant: the
 * line under the control predicts it while the choice can still change, the
 * dialog asks, and the toast confirms it happened.
 *
 * It does not close the panel it sits in. That panel also holds the roles
 * form, and closing it on success threw away any role ticks not yet saved.
 *
 * Disabled on the signed-in administrator's own row: the API refuses it
 * (403, "You cannot change the status of your own account."), for the same
 * reason it refuses self role-assignment — `users:Update` is a general
 * permission and locking yourself out, or quietly restoring your own
 * suspended account, is not what it is for.
 */
export function StatusControl({
  user,
  locale,
  disabled,
}: {
  user: UserResponse;
  /** Which half of the stored name the confirmation and result say out loud. */
  locale: AppLocale;
  disabled: boolean;
}) {
  const t = useTranslations("UsersDirectory");
  const statuses = useTranslations("AccountStatus");
  const router = useRouter();
  const toast = useToast();

  const [target, setTarget] = useState<UserResponse["accountStatus"]>(user.accountStatus);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  // Apply stays locked until the refreshed account arrives. Until then
  // `changed` is still measured against the old status, and would offer to
  // apply the same change a second time.
  const [refreshing, startRefresh] = useTransition();

  const changed = target !== user.accountStatus;
  const endsSessions = changed && target !== "Active";
  const name = localized(user.name, locale);

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
        return;
      }

      toast.show({
        tone: "success",
        title: t("statusChangedTitle"),
        // The dialog asked whether sessions should end; this says they did.
        description: t(endsSessions ? "statusChangedEndedSessions" : "statusChangedBody", {
          name,
          status: statuses(target),
        }),
        source: "api",
        dedupeKey: `user:${user.id}:status-changed`,
      });
      startRefresh(() => router.refresh());
    } catch {
      setErrorKey("status_serviceUnavailable");
    } finally {
      // The dialog closes whatever the outcome. A refusal is shown inline,
      // beside the control that was refused, where it can be re-read.
      setSaving(false);
      setConfirming(false);
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
        {/* The label was `sr-only`, which left a sighted reader an unnamed
            dropdown sitting beside an "apply" button — the one control on
            this panel that ends someone's sessions. The notched label names
            it inside its own box, so it costs the row no height. */}
        <SelectField
          id="account-status"
          label={t("statusTitle")}
          value={target}
          disabled={disabled || saving}
          onChange={(event) => setTarget(event.target.value as UserResponse["accountStatus"])}
          options={STATUSES.map((status) => ({ value: status, label: statuses(status) }))}
          className="min-w-[200px]"
        />

        {/* `Button`, with its loading state: the most consequential control on
            the four admin screens used to swap its label for "saving" while
            it worked, and stood at 40px against Protocol §14's 44px target. */}
        <Button
          loading={saving}
          disabled={!changed || disabled || refreshing}
          onClick={() => {
            if (endsSessions) {
              setConfirming(true);
              return;
            }
            void save();
          }}
        >
          {t("applyStatus")}
        </Button>
      </div>

      <p aria-live="polite" className="text-caption text-[color:var(--color-text-secondary)]">
        {disabled
          ? t("cannotEditOwnStatus")
          : endsSessions
            ? t("statusEndsSessions")
            : t("statusNoChange")}
      </p>

      <ConfirmDialog
        open={confirming}
        tone="destructive"
        busy={saving}
        title={t("statusConfirmTitle", { name, status: statuses(target) })}
        // Mounted while closed; it never opens on "Active", which ends nothing.
        confirmLabel={target === "Active" ? "" : t(CONFIRM_ACTION[target])}
        cancelLabel={t("cancel")}
        onConfirm={() => void save()}
        onCancel={() => setConfirming(false)}
      >
        {t("statusConfirmBody", { active: statuses("Active") })}
      </ConfirmDialog>
    </div>
  );
}
