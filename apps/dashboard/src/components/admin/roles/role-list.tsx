"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { localized, type RoleResponse } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { SearchField } from "@/components/ui/search-field";

export type RoleFilter = "all" | "system" | "custom";

/**
 * The roles, as a single-select list.
 *
 * A listbox rather than a table: exactly one role is being edited at a time,
 * and the panel beside it is the selection's detail. Rendering it as a table
 * would imply the rows are comparable records to scan, when what the reader
 * actually does here is pick one.
 *
 * Each row carries the two facts that decide whether a role matters: how many
 * people hold it, and whether the system owns it. A role nobody holds is
 * called out — it is the archive candidate, and it is invisible otherwise.
 */
export function RoleList({
  roles,
  usage,
  locale,
  selectedId,
  onSelect,
}: {
  roles: readonly RoleResponse[];
  usage: ReadonlyMap<string, number>;
  locale: AppLocale;
  selectedId: string | null;
  onSelect: (roleId: string) => void;
}) {
  const t = useTranslations("RolesWorkbench");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roles.filter((role) => {
      if (filter === "system" && !role.isSystemRole) return false;
      if (filter === "custom" && role.isSystemRole) return false;
      if (needle.length === 0) return true;
      return (
        role.name.ar.toLowerCase().includes(needle) || role.name.en.toLowerCase().includes(needle)
      );
    });
  }, [roles, query, filter]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <SearchField
          label={t("searchRoles")}
          value={query}
          onValueChange={setQuery}
        />

      <div
        role="group"
        aria-label={t("filterRoles")}
        className="flex gap-1 rounded-[var(--radius-md)] bg-[color:var(--color-surface-sunken)] p-1"
      >
        {(["all", "system", "custom"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`flex-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-caption transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
              filter === value
                ? "bg-[color:var(--color-surface-raised)] font-bold text-[color:var(--color-text-primary)] shadow-card"
                : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-skeleton)]"
            }`}
          >
            {t(`filter_${value}`)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="px-2 py-8 text-center text-body-sm text-[color:var(--color-text-muted)]">
          {t("noRoles")}
        </p>
      ) : (
        <ul className="flex max-h-[520px] flex-col gap-1 overflow-y-auto" aria-label={t("rolesLabel")}>
          {visible.map((role) => {
            const holders = usage.get(role._id) ?? 0;
            const selected = role._id === selectedId;
            return (
              <li key={role._id}>
                <button
                  type="button"
                  onClick={() => onSelect(role._id)}
                  aria-current={selected ? "true" : undefined}
                  className={`flex w-full flex-col gap-1 rounded-[var(--radius-md)] border p-3 text-start transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
                    selected
                      ? "border-[color:var(--color-brand-primary)] bg-[color:color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-surface-base))]"
                      : "border-transparent hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)]"
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-label font-bold text-[color:var(--color-text-primary)]">
                      {localized(role.name, locale)}
                    </span>
                    {role.isSystemRole ? (
                      <span className="rounded-[var(--radius-full)] border border-[color:var(--color-border-default)] px-2 text-caption text-[color:var(--color-text-secondary)]">
                        {t("systemRole")}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-[color:var(--color-text-muted)]">
                    <span className="tabular-nums">{t("holders", { count: holders })}</span>
                    <span className="tabular-nums">
                      {t("permissionsGranted", { count: role.permissionIds.length })}
                    </span>
                    {holders === 0 ? (
                      <span className="flex items-center gap-1.5 text-[color:var(--color-text-secondary)]">
                        <span
                          aria-hidden="true"
                          className="h-[2px] w-3 rounded-[var(--radius-full)] bg-[color:var(--color-semantic-warning)]"
                        />
                        {t("unused")}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

