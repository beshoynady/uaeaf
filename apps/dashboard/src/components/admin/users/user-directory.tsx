"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { localized, type RoleResponse, type UserResponse } from "@/lib/api/types";
import { StatusMessage } from "@/components/auth/status-message";
import { RoleAssignment } from "./role-assignment";
import { StatusControl } from "./status-control";
import { CreateUserForm, type PersonOption } from "./create-user-form";
import type { AppLocale } from "@/i18n/routing";
import { SearchField } from "@/components/ui/search-field";

type StatusFilter = "all" | "Active" | "Suspended" | "Deactivated";

/**
 * The account directory.
 *
 * A table, not a card grid: these are records an administrator compares —
 * who has access, as what, and when they last used it — and comparison is
 * what a table is for.
 *
 * Roles are shown by name rather than as a count. The count answered "does
 * this person have access at all", which the status column already answers;
 * the name answers the question someone actually opens this screen with,
 * which is "what can this person do".
 *
 * Role editing is an inline panel under the row, not a modal. The row stays
 * visible while its roles change, and there is no focus trap to get wrong.
 */
export function UserDirectory({
  users,
  roles,
  actorUserId,
  canAssign,
  canCreate,
  people,
  locale,
}: {
  users: readonly UserResponse[];
  /** Live roles only. A user may carry the id of an archived role — the API
   *  never clears it on deletion — so anything not in this list is shown as
   *  a stale reference rather than silently dropped. */
  roles: readonly RoleResponse[];
  actorUserId: string | null;
  canAssign: boolean;
  /** `users:Create` is a separate grant from `users:Update`; an account that
   *  may re-assign roles cannot necessarily open new accounts. */
  canCreate: boolean;
  /** `null` when `federationPersonnel:Read` is not held — the form then omits
   *  the picker with a reason rather than showing an empty one. */
  people: readonly PersonOption[] | null;
  locale: AppLocale;
}) {
  const t = useTranslations("UsersDirectory");
  const statuses = useTranslations("AccountStatus");
  const common = useTranslations("Common");
  const format = useFormatter();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [roleId, setRoleId] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const roleById = useMemo(
    () => new Map(roles.map((role) => [role._id, role])),
    [roles],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (status !== "all" && user.accountStatus !== status) return false;
      if (roleId === "none" && user.roleIds.length > 0) return false;
      if (roleId !== "all" && roleId !== "none" && !user.roleIds.includes(roleId)) return false;
      if (needle.length === 0) return true;
      return (
        user.email.toLowerCase().includes(needle) ||
        user.name.ar.toLowerCase().includes(needle) ||
        user.name.en.toLowerCase().includes(needle)
      );
    });
  }, [users, query, status, roleId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          label={t("search")}
          value={query}
          onValueChange={setQuery}
        />

        <Select
          label={t("filterStatus")}
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
          options={[
            { value: "all", label: t("allStatuses") },
            { value: "Active", label: statuses("Active") },
            { value: "Suspended", label: statuses("Suspended") },
            { value: "Deactivated", label: statuses("Deactivated") },
          ]}
        />

        <Select
          label={t("filterRole")}
          value={roleId}
          onChange={setRoleId}
          options={[
            { value: "all", label: t("allRoles") },
            { value: "none", label: t("withoutRole") },
            ...roles.map((role) => ({ value: role._id, label: localized(role.name, locale) })),
          ]}
        />

        <p className="text-caption tabular-nums text-[color:var(--color-text-muted)]">
          {t("showing", { shown: visible.length, total: users.length })}
        </p>

        {canCreate ? (
          <button
            type="button"
            onClick={() => setCreating((open) => !open)}
            aria-expanded={creating}
            className="h-10 whitespace-nowrap rounded-[var(--radius-md)] border border-[color:var(--color-brand-primary)] px-4 text-label font-medium text-[color:var(--color-brand-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-surface-base))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
          >
            {creating ? t("closeEditor") : t("newUser")}
          </button>
        ) : null}
      </div>

      {creating ? (
        <CreateUserForm
          roles={roles}
          people={people}
          locale={locale}
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-6 py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">
          {t("noMatches")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[color:var(--card-background)]">
          <table className="w-full min-w-[760px] border-collapse">
            <caption className="sr-only">{t("caption")}</caption>
            <thead>
              <tr className="border-b border-[color:var(--color-border-default)]">
                {["name", "email", "roles", "status", "lastLogin"].map((key) => (
                  <th
                    key={key}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-start text-caption font-bold text-[color:var(--color-text-secondary)]"
                  >
                    {t(`column_${key}`)}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{t("column_actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => {
                const isSelf = actorUserId !== null && user.id === actorUserId;
                const open = editing === user.id;
                return (
                  <RowGroup key={user.id}>
                    <tr className="border-b border-[color:var(--color-border-default)] align-middle">
                      <th scope="row" className="px-4 py-3 text-start">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-body-sm font-medium text-[color:var(--color-text-primary)]">
                            {localized(user.name, locale)}
                          </span>
                          {isSelf ? (
                            <span className="rounded-[var(--radius-full)] border border-[color:var(--color-border-default)] px-2 text-caption font-normal text-[color:var(--color-text-secondary)]">
                              {t("you")}
                            </span>
                          ) : null}
                        </span>
                      </th>
                      <td dir="ltr" className="px-4 py-3 text-start font-mono text-caption text-[color:var(--color-text-secondary)]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <RoleChips
                          roleIds={user.roleIds}
                          roleById={roleById}
                          locale={locale}
                          emptyLabel={t("noRoles")}
                          staleLabel={t("staleRole")}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={user.accountStatus} label={statuses(user.accountStatus)} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-body-sm text-[color:var(--color-text-secondary)]">
                        {user.lastLogin
                          ? format.dateTime(new Date(user.lastLogin), {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : common("never")}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {canAssign ? (
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setEditing(open ? null : user.id)}
                            // Openable even on your own row: the API refuses
                            // both a self role-assignment and a self status
                            // change, and the panel is where those refusals
                            // are stated. A disabled button would leave the
                            // reason nowhere on the page.
                            title={isSelf ? t("cannotEditSelf") : undefined}
                            className="h-9 whitespace-nowrap rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-3 text-caption font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] active:bg-[color:var(--color-surface-skeleton)]"
                          >
                            {open ? t("closeEditor") : t("editAccess")}
                          </button>
                        ) : null}
                      </td>
                    </tr>

                    {open ? (
                      <tr className="border-b border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)]">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="flex flex-col gap-6">
                            <RoleAssignment
                              user={user}
                              roles={roles}
                              locale={locale}
                              disabled={isSelf}
                              onDone={() => setEditing(null)}
                            />
                            <div className="border-t border-[color:var(--color-border-default)] pt-5">
                              <StatusControl
                                user={user}
                                disabled={isSelf}
                                onDone={() => setEditing(null)}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </RowGroup>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!canAssign ? (
        <StatusMessage tone="info" title={t("readOnlyTitle")}>
          {t("readOnlyBody")}
        </StatusMessage>
      ) : null}
    </div>
  );
}

/** Two `<tr>` elements per user without an invalid wrapper element. */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function RoleChips({
  roleIds,
  roleById,
  locale,
  emptyLabel,
  staleLabel,
}: {
  roleIds: readonly string[];
  roleById: ReadonlyMap<string, RoleResponse>;
  locale: AppLocale;
  emptyLabel: string;
  staleLabel: string;
}) {
  if (roleIds.length === 0) {
    return <span className="text-caption text-[color:var(--color-text-muted)]">{emptyLabel}</span>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {roleIds.map((id) => {
        const role = roleById.get(id);
        return (
          <span
            key={id}
            // A dashed border for an id that resolves to nothing: archiving a
            // role does not clear it from the users who held it, so this is a
            // real state the directory has to be able to show.
            className={`rounded-[var(--radius-full)] border px-2 py-0.5 text-caption ${
              role
                ? "border-[color:var(--color-border-default)] text-[color:var(--color-text-primary)]"
                : "border-dashed border-[color:var(--color-border-strong)] text-[color:var(--color-text-muted)]"
            }`}
          >
            {role ? localized(role.name, locale) : staleLabel}
          </span>
        );
      })}
    </span>
  );
}

const STATUS_RULE: Record<UserResponse["accountStatus"], string> = {
  Active: "var(--color-semantic-success)",
  Suspended: "var(--color-semantic-warning)",
  Deactivated: "var(--color-text-disabled)",
};

function StatusPill({
  status,
  label,
}: {
  status: UserResponse["accountStatus"];
  label: string;
}) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-body-sm text-[color:var(--color-text-primary)]">
      {/* A dot, with the word beside it. Colour alone would fail Chapter 6
          §6.2, and as text these hues do not clear 4.5:1 anyway. */}
      <span
        aria-hidden="true"
        style={{ background: STATUS_RULE[status] }}
        className="size-2 shrink-0 rounded-[var(--radius-full)]"
      />
      {label}
    </span>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-3 text-label text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
