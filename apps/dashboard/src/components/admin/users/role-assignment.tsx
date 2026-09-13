"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { localized, type RoleResponse, type UserResponse } from "@/lib/api/types";
import { diffSelection, toggleSelection } from "@/lib/admin/permission-matrix";
import { StatusMessage } from "@/components/auth/status-message";
import { useToast } from "@/components/ui/toast";

/** The id of the line saying what is unsaved in one account's roles form.
 *  Exported because the directory describes its refused close button by it. */
export const assignDiffId = (userId: string) => `assign-diff-${userId}`;

/**
 * Which roles one account holds.
 *
 * `PATCH /users/:id/roles` replaces the whole list, so this always sends
 * every role the account should end up with — and the checkboxes are the
 * final list, not a set of individual grants.
 *
 * Only live roles are offered. The API does not verify that a role id exists
 * before storing it, so offering an archived one would silently write a
 * reference that grants nothing; ids the account already carries that no
 * longer resolve are shown in the row above, not here.
 */
export function RoleAssignment({
  user,
  roles,
  locale,
  disabled,
  onDirtyChange,
}: {
  user: UserResponse;
  roles: readonly RoleResponse[];
  locale: "ar" | "en";
  /** True on the signed-in administrator's own row. The API refuses a
   *  self-assignment with a 403; saying so before the click beats letting
   *  the request explain it. */
  disabled: boolean;
  /** Reports whether this form holds ticks nobody has saved yet. The panel it
   *  sits in refuses to close while it does: that panel also holds the status
   *  form, and closing it used to take these ticks with it. */
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("UsersDirectory");
  const router = useRouter();
  const toast = useToast();

  const liveRoleIds = useMemo(() => new Set(roles.map((role) => role._id)), [roles]);
  const original = useMemo(
    // Compared against live roles only, so a stale id does not read as an
    // unsaved change the moment the panel opens.
    () => new Set(user.roleIds.filter((id) => liveRoleIds.has(id))),
    [user.roleIds, liveRoleIds],
  );

  const [selection, setSelection] = useState<Set<string>>(() => new Set(original));
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  // Save stays locked until the refreshed roles arrive. Until then the diff is
  // still measured against the old ones, and would offer to save the same list
  // a second time.
  const [refreshing, startRefresh] = useTransition();

  const diff = diffSelection(original, selection);

  async function save() {
    setSaving(true);
    setErrorKey(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/roles`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleIds: [...selection] }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setErrorKey(`assign_${body?.code ?? "serviceUnavailable"}`);
        setSaving(false);
        return;
      }

      toast.show({
        tone: "success",
        title: t("rolesSavedTitle"),
        // Whose roles: the directory lists many accounts, and the toast
        // outlives the moment it describes.
        description: t("rolesSavedBody", { name: localized(user.name, locale) }),
        source: "api",
        dedupeKey: `user:${user.id}:roles-saved`,
      });
      setSaving(false);
      onDirtyChange(false);
      // The panel stays open — it also holds the status form — so this form
      // settles in place rather than disappearing.
      startRefresh(() => router.refresh());
    } catch {
      setErrorKey("assign_serviceUnavailable");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-label font-bold text-[color:var(--color-text-primary)]">
        {t("assignTitle", { name: localized(user.name, locale) })}
      </p>

      {errorKey ? (
        <StatusMessage tone="error" title={t("assignFailedTitle")}>
          {t(errorKey)}
        </StatusMessage>
      ) : null}

      {disabled ? (
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">
          {t("cannotEditSelf")}
        </p>
      ) : null}

      {roles.length === 0 ? (
        <p className="text-body-sm text-[color:var(--color-text-muted)]">{t("noRolesToAssign")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {roles.map((role) => {
            const checked = selection.has(role._id);
            return (
              <li key={role._id}>
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 transition-colors duration-[var(--motion-duration-fast)] ${
                    checked
                      ? "border-[color:var(--color-brand-primary)] bg-[color:color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-surface-base))]"
                      : "border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-skeleton)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                      const next = toggleSelection(selection, role._id);
                      setSelection(next);
                      onDirtyChange(diffSelection(original, next).changed);
                    }}
                    className="size-[18px] accent-[color:var(--color-brand-primary)] disabled:opacity-[var(--opacity-disabled)]"
                  />
                  <span className="text-label text-[color:var(--color-text-primary)]">
                    {localized(role.name, locale)}
                  </span>
                  {role.isSystemRole ? (
                    <span className="text-caption text-[color:var(--color-text-muted)]">
                      {t("systemRoleShort")}
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p id={assignDiffId(user.id)} aria-live="polite" className="text-caption text-[color:var(--color-text-secondary)]">
          {diff.changed
            ? t("assignDiff", { added: diff.added.length, removed: diff.removed.length })
            : t("assignNoChanges")}
        </p>
        <div className="ms-auto flex gap-2">
          <button
            type="button"
            // Discards this form's own ticks and nothing else. It used to close
            // the whole panel, which closed the status form along with it.
            disabled={disabled || !diff.changed || saving}
            onClick={() => {
              setSelection(new Set(original));
              setErrorKey(null);
              onDirtyChange(false);
            }}
            className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 text-label text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] active:bg-[color:var(--color-surface-skeleton)]"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={disabled || !diff.changed || saving || refreshing}
            onClick={save}
            className="h-10 rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-5 text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--button-disabled-text)] active:bg-[color:var(--button-primary-background-pressed)]"
          >
            {saving ? t("saving") : t("saveRoles")}
          </button>
        </div>
      </div>
    </div>
  );
}
