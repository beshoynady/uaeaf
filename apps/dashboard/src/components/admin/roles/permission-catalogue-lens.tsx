"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { localized, type PermissionResponse, type RoleResponse } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { SearchField } from "@/components/ui/search-field";

/**
 * The catalogue, seen from the permission's side.
 *
 * Roles and permissions are one relation, and until now the platform showed
 * two projections of it on two screens: a matrix that answered "what may
 * this role do", and a flat `/permissions` table that answered "what
 * permissions exist". The approved IA (`01-Information-Architecture.md`
 * §4.8) defines a single screen, and merging them is only a merge if the
 * second view's content survives.
 *
 * So this is not the old table relocated. It carries what that table had —
 * the bilingual label, which the matrix has no room for — and adds the
 * question it could never answer: **who holds this**. A permission no role
 * carries guards a route nobody in the federation can reach, and nothing in
 * the platform said so before.
 */
export function PermissionCatalogueLens({
  permissions,
  roles,
  selectedRoleId,
  locale,
}: {
  permissions: readonly PermissionResponse[];
  roles: readonly RoleResponse[];
  /** Highlighted as held/not held, so the reader keeps their place when
   *  switching lenses. Null when the user reached this screen with
   *  `permissions:Read` but no `roles:Read`. */
  selectedRoleId: string | null;
  locale: AppLocale;
}) {
  const t = useTranslations("RolesWorkbench");
  const actions = useTranslations("PermissionAction");
  const [query, setQuery] = useState("");

  /** permissionId -> how many live roles grant it. */
  const holders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const role of roles) {
      for (const permissionId of role.permissionIds) {
        counts.set(permissionId, (counts.get(permissionId) ?? 0) + 1);
      }
    }
    return counts;
  }, [roles]);

  const selectedHolds = useMemo(
    () => new Set(roles.find((role) => role._id === selectedRoleId)?.permissionIds ?? []),
    [roles, selectedRoleId],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = [...permissions].sort(
      (a, b) => a.resourceType.localeCompare(b.resourceType) || a.action.localeCompare(b.action),
    );
    if (needle.length === 0) return sorted;
    // Matches the technical identifier as well as the label: an engineer
    // looking for `contactMessages` and an administrator looking for
    // "الرسائل" are both looking for the same row.
    return sorted.filter(
      (permission) =>
        permission.resourceType.toLowerCase().includes(needle) ||
        permission.action.toLowerCase().includes(needle) ||
        localized(permission.name, locale).toLowerCase().includes(needle),
    );
  }, [permissions, query, locale]);

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("catalogueNote")}</p>

      <SearchField
          label={t("catalogueSearch")}
          value={query}
          onValueChange={setQuery}
        />

      {visible.length === 0 ? (
        <p className="py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">
          {t("catalogueEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <caption className="sr-only">{t("catalogueCaption")}</caption>
            <thead>
              <tr>
                {[t("catalogueName"), t("catalogueResource"), t("catalogueAction"), t("catalogueHolders")].map(
                  (header) => (
                    <th
                      key={header}
                      scope="col"
                      className="border-b border-[color:var(--color-border-default)] px-3 py-2 text-start text-caption font-bold text-[color:var(--color-text-secondary)]"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((permission) => {
                const count = holders.get(permission._id) ?? 0;
                const held = selectedHolds.has(permission._id);
                return (
                  <tr
                    key={permission._id}
                    data-selected-role-holds={held ? "true" : "false"}
                    className={`border-b border-[color:var(--color-border-subtle)] ${
                      held
                        ? "bg-[color:color-mix(in_srgb,var(--color-brand-primary)_6%,transparent)]"
                        : ""
                    }`}
                  >
                    <th
                      scope="row"
                      className="px-3 py-2 text-start text-label font-medium text-[color:var(--color-text-primary)]"
                    >
                      {/* A marker, not colour alone — Chapter 6 §6.2, and the
                          tint above does not clear 4.5:1 as a signal. */}
                      {held ? <span aria-hidden="true">✓ </span> : null}
                      {localized(permission.name, locale)}
                    </th>
                    <td
                      dir="ltr"
                      className="px-3 py-2 text-start font-mono text-caption text-[color:var(--color-text-muted)]"
                    >
                      {permission.resourceType}
                    </td>
                    <td className="px-3 py-2 text-label text-[color:var(--color-text-secondary)]">
                      {actions(permission.action)}
                    </td>
                    <td className="px-3 py-2 text-caption tabular-nums text-[color:var(--color-text-secondary)]">
                      {count === 0 ? (
                        <span className="text-[color:var(--color-text-muted)]">{t("heldByNone")}</span>
                      ) : (
                        // Interpolated as a string on purpose: ICU would
                        // format the number for the `ar` locale as ٢, and
                        // every Arabic frame in `docs/design-specs/` sets
                        // figures in Western digits (1974, 1,240+, +30%).
                        t("heldByCount", { count: String(count) })
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
