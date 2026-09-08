"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { localized, type PermissionResponse, type RoleResponse, type UserResponse } from "@/lib/api/types";
import type { PermissionGrant } from "@/lib/auth/permissions";
import {
  buildMatrix,
  diffSelection,
  filterRows,
  incoherentSelections,
  selectionBlockers,
  toggleWithImpliedRead,
  visibleActions,
  type RowFilter,
} from "@/lib/admin/permission-matrix";
import { roleUsage } from "@/lib/admin/directory-stats";
import { StatusMessage } from "@/components/auth/status-message";
import { RoleList } from "./role-list";
import { PermissionMatrixTable } from "./permission-matrix-table";
import { RoleEditor } from "./role-editor";
import { PermissionCatalogueLens } from "./permission-catalogue-lens";
import type { AppLocale } from "@/i18n/routing";
import { SearchField } from "@/components/ui/search-field";
import { BUTTON_DESTRUCTIVE } from "@/components/ui/interactive";

/**
 * The role editor.
 *
 * One screen, two panels: pick a role on the left, edit what it may do on the
 * right. The permission set is the role — there is no other way to grant one
 * — so the matrix is the page rather than a tab inside it.
 *
 * The save is deliberately explicit. A checkbox that wrote immediately would
 * be 164 unreviewable requests, and each one takes effect on every holder of
 * the role at their next request (the token carries roleIds only). Batching
 * behind one button is what lets the screen state the consequence before it
 * happens rather than after.
 */
export function RoleWorkbench({
  roles,
  permissions,
  users,
  actorGrants,
  locale,
}: {
  roles: readonly RoleResponse[];
  /** Empty when the signed-in user lacks `permissions:Read` — reading the
   *  catalogue is a separate grant from editing roles, so this screen can
   *  legitimately load with a role list and no matrix. */
  permissions: readonly PermissionResponse[];
  /** Empty when the user lacks `users:Read`; holder counts then read as
   *  unknown rather than as zero. */
  users: readonly UserResponse[];
  actorGrants: readonly PermissionGrant[];
  locale: AppLocale;
}) {
  const t = useTranslations("RolesWorkbench");
  const router = useRouter();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?._id ?? null);
  const [selection, setSelection] = useState<Set<string>>(
    () => new Set(roles[0]?.permissionIds ?? []),
  );
  const [query, setQuery] = useState("");
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "success" | "error"; key: string } | null>(null);
  // What the detail panel is showing. The matrix is the resting state; the
  // other three are one-at-a-time because they all act on the same role and
  // showing two at once would leave it ambiguous which one a click applies
  // to.
  const [panel, setPanel] = useState<"matrix" | "create" | "edit" | "archive">("matrix");
  const [archiving, setArchiving] = useState(false);
  // Which projection of the roles-permissions relation is on screen. The
  // two are not separate screens: the approved IA (§4.8) defines one, and
  // the catalogue lens carries what the deleted `/permissions` table held.
  const [lens, setLens] = useState<"matrix" | "catalogue">("matrix");
  // Permission ids the implied-read rule ticked on the reader's behalf on
  // the last toggle. Held so the screen can SAY it happened — a grant that
  // changes itself silently is the thing this rule must not become.
  const [autoAdded, setAutoAdded] = useState<string[]>([]);

  const role = useMemo(
    () => roles.find((candidate) => candidate._id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );
  const usage = useMemo(() => roleUsage(users, roles), [users, roles]);
  const original = useMemo(() => new Set(role?.permissionIds ?? []), [role]);

  const rows = useMemo(
    () => buildMatrix(permissions, selection, actorGrants),
    [permissions, selection, actorGrants],
  );
  const visibleRows = useMemo(() => filterRows(rows, query, rowFilter), [rows, query, rowFilter]);
  const diff = useMemo(() => diffSelection(original, selection), [original, selection]);
  const blockers = useMemo(() => selectionBlockers(rows, selection), [rows, selection]);
  // Resources ticked for change but not for read — exactly what the API
  // refuses with `impliedReadMissing`. Normally empty, because ticking a
  // write ticks the read; it fills when the reader unticks a read by hand.
  const incoherent = useMemo(() => incoherentSelections(rows, selection), [rows, selection]);
  // Computed from the UNFILTERED matrix so columns do not appear and vanish
  // as the reader types in the search box.
  const columns = useMemo(() => visibleActions(rows), [rows]);

  const holders = role ? (usage.get(role._id) ?? 0) : 0;
  const readOnly = role?.isSystemRole ?? true;
  const canSave =
    !readOnly && diff.changed && blockers.length === 0 && incoherent.length === 0 && !saving;

  const selectRole = useCallback(
    (roleId: string) => {
      const next = roles.find((candidate) => candidate._id === roleId);
      setSelectedRoleId(roleId);
      setSelection(new Set(next?.permissionIds ?? []));
      setOutcome(null);
      setPanel("matrix");
      setQuery("");
      setRowFilter("all");
      setAutoAdded([]);
    },
    [roles],
  );

  const toggle = useCallback(
    (permissionId: string) => {
      setOutcome(null);
      const result = toggleWithImpliedRead(rows, selection, permissionId);
      setAutoAdded(result.autoAdded);
      setSelection(result.next);
    },
    [rows, selection],
  );

  async function save() {
    if (!role) return;
    setSaving(true);
    setOutcome(null);

    try {
      const response = await fetch(`/api/admin/roles/${role._id}/permissions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissionIds: [...selection] }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setOutcome({ tone: "error", key: `save_${body?.code ?? "serviceUnavailable"}` });
        setSaving(false);
        return;
      }

      setOutcome({ tone: "success", key: "save_ok" });
      setSaving(false);
      // The server component above holds the role list; refreshing is what
      // makes `original` match what was just written, so the diff resets to
      // empty without this component guessing at the new state.
      router.refresh();
    } catch {
      setOutcome({ tone: "error", key: "save_serviceUnavailable" });
      setSaving(false);
    }
  }

  async function archive() {
    if (!role) return;
    setArchiving(true);
    setOutcome(null);

    try {
      const response = await fetch(`/api/admin/roles/${role._id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setOutcome({ tone: "error", key: `save_${body?.code ?? "serviceUnavailable"}` });
        setArchiving(false);
        setPanel("matrix");
        return;
      }

      // The archived role leaves the list on refresh, so the selection has
      // to let go of it first or the panel renders against a role that is
      // no longer there.
      setSelectedRoleId(null);
      setPanel("matrix");
      setArchiving(false);
      router.refresh();
    } catch {
      setOutcome({ tone: "error", key: "save_serviceUnavailable" });
      setArchiving(false);
      setPanel("matrix");
    }
  }

  return (
    <div
      // Two columns only from 2xl (1536px). The matrix needs ~820px before it
      // scrolls, and a 320px role list beside it does not leave that until
      // the viewport is genuinely wide; below it the panels stack so the
      // matrix gets the full width instead of a scrollbar. Both values are
      // token breakpoints (--breakpoint-2xl), not chosen numbers.
      className="grid items-start gap-4 2xl:grid-cols-[320px_minmax(0,1fr)]"
    >
      <section
        aria-label={t("rolesLabel")}
        className="rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[color:var(--card-background)]"
      >
        <div className="flex items-center gap-3 border-b border-[color:var(--color-border-default)] px-4 py-3">
          <h2 className="text-title font-bold text-[color:var(--color-text-primary)]">
            {t("rolesLabel")}
          </h2>
          <span className="rounded-[var(--radius-full)] border border-[color:var(--color-border-default)] px-2 text-caption tabular-nums text-[color:var(--color-text-secondary)]">
            {roles.length}
          </span>
          <button
            type="button"
            onClick={() => setPanel("create")}
            className="ms-auto h-9 whitespace-nowrap rounded-[var(--radius-md)] border border-[color:var(--color-brand-primary)] px-3 text-caption font-medium text-[color:var(--color-brand-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-surface-base))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
          >
            {t("newRole")}
          </button>
        </div>
        <RoleList
          roles={roles}
          usage={usage}
          locale={locale}
          selectedId={selectedRoleId}
          onSelect={selectRole}
        />
      </section>

      <section
        aria-label={t("detailLabel")}
        className="flex flex-col rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[color:var(--card-background)]"
      >
        {panel === "create" ? (
          <RoleEditor
            mode="create"
            onDone={() => setPanel("matrix")}
            onCancel={() => setPanel("matrix")}
          />
        ) : role === null ? (
          <p className="px-5 py-16 text-center text-body-sm text-[color:var(--color-text-muted)]">
            {t("noRoleSelected")}
          </p>
        ) : (
          <>
            {/* The name/description form replaces the identity block only —
                never the matrix below it. Swapping the whole panel out (as
                this did until 2026-09-08) hides a role's permissions at the
                exact moment the reader is deciding what to call it. */}
            {panel === "edit" ? (
              <div className="border-b border-[color:var(--color-border-default)]">
                <RoleEditor
                  mode="edit"
                  role={role}
                  onDone={() => {
                    setPanel("matrix");
                    setOutcome({ tone: "success", key: "detailsSavedBody" });
                  }}
                  onCancel={() => setPanel("matrix")}
                />
              </div>
            ) : (
            <header className="flex flex-col gap-4 border-b border-[color:var(--color-border-default)] px-5 py-4">
              <div>
                <h3 className="text-h4 font-bold text-[color:var(--color-text-primary)]">
                  {localized(role.name, locale)}
                </h3>
                <p dir="ltr" className="text-start font-mono text-label text-[color:var(--color-text-muted)]">
                  {role.name.en}
                </p>
                <p className="mt-2 max-w-[62ch] text-body-sm text-[color:var(--color-text-secondary)]">
                  {localized(role.description, locale) || t("noDescription")}
                </p>
              </div>

              {/* Record-level actions, absent on a system role rather than
                  disabled: the API refuses both outright, and a button that
                  can never work is noise beside the notice that explains
                  why. */}
              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPanel("edit")}
                    className="h-9 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-3 text-caption font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
                  >
                    {t("editDetails")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel("archive")}
                    className="h-9 rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] px-3 text-caption font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:color-mix(in_srgb,var(--color-semantic-error)_8%,var(--color-surface-base))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
                  >
                    {t("archiveRole")}
                  </button>
                </div>
              ) : null}

              <dl className="flex flex-wrap gap-x-8 gap-y-3">
                <Fact
                  label={t("factHolders")}
                  value={
                    users.length === 0 ? t("unknown") : t("holders", { count: holders })
                  }
                />
                <Fact
                  label={t("factPermissions")}
                  value={t("outOf", { granted: selection.size, total: permissions.length })}
                />
                <Fact label={t("factKind")} value={role.isSystemRole ? t("systemRole") : t("customRole")} />
              </dl>
            </header>
            )}

            {/* Its own row, above the filters and below the identity block.
                Sitting inside the filter row made a change of VIEW read as a
                third filter, level with "granted only" — a view switch
                outranks a filter and has to look like it. */}
            {permissions.length > 0 ? (
              <div className="flex items-center gap-3 border-b border-[color:var(--color-border-default)] px-5 py-3">
                <span className="text-caption text-[color:var(--color-text-muted)]">
                  {t("lensLabel")}
                </span>
                <div
                  role="group"
                  aria-label={t("lensLabel")}
                  className="flex rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] p-0.5"
                >
                  {(["matrix", "catalogue"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={lens === option}
                      onClick={() => setLens(option)}
                      className={`h-9 whitespace-nowrap rounded-[var(--radius-sm)] px-3 text-label transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
                        lens === option
                          ? "bg-[color:color-mix(in_srgb,var(--color-brand-primary)_12%,var(--color-surface-base))] font-medium text-[color:var(--color-text-primary)]"
                          : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] active:bg-[color:var(--color-surface-skeleton)]"
                      }`}
                    >
                      {t(`lens_${option}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {readOnly ? (
              <div className="px-5 pt-4">
                <StatusMessage tone="warning" title={t("systemRoleTitle")}>
                  {t("systemRoleBody")}
                </StatusMessage>
              </div>
            ) : (
              <div className="px-5 pt-4">
                <StatusMessage tone="info" title={t("immediateTitle")}>
                  {t("immediateBody", { count: holders })}
                </StatusMessage>
              </div>
            )}

            {panel === "archive" ? (
              <div className="px-5 pt-4">
                <StatusMessage tone="warning" title={t("archiveTitle")}>
                  <p>{t("archiveBody", { count: holders })}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={archiving}
                      onClick={archive}
                      className={BUTTON_DESTRUCTIVE}
                    >
                      {archiving ? t("saving") : t("archiveConfirm")}
                    </button>
                    <button
                      type="button"
                      disabled={archiving}
                      onClick={() => setPanel("matrix")}
                      className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 text-label text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
                    >
                      {t("formCancel")}
                    </button>
                  </div>
                </StatusMessage>
              </div>
            ) : null}

            {blockers.length > 0 ? (
              <div className="px-5 pt-3">
                <StatusMessage tone="warning" title={t("blockedTitle")}>
                  <p>{t("blockedBody", { count: blockers.length })}</p>
                  <ul dir="ltr" className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-start font-mono text-caption">
                    {blockers.map((blocker) => (
                      <li key={`${blocker.resourceType}:${blocker.action}`}>
                        {blocker.resourceType}:{blocker.action}
                      </li>
                    ))}
                  </ul>
                </StatusMessage>
              </div>
            ) : null}


            {incoherent.length > 0 ? (
              <div className="px-5 pt-3">
                <StatusMessage tone="warning" title={t("incoherentTitle")}>
                  {t("incoherentBody", {
                    resources: incoherent.map((entry) => entry.resourceType).join("، "),
                  })}
                </StatusMessage>
              </div>
            ) : null}

            {outcome ? (
              <div className="px-5 pt-3">
                <StatusMessage
                  tone={outcome.tone}
                  title={outcome.tone === "success" ? t("saveOkTitle") : t("saveFailedTitle")}
                >
                  {t(outcome.key)}
                </StatusMessage>
              </div>
            ) : null}

            {permissions.length === 0 ? (
              <div className="px-5 py-4">
                <StatusMessage tone="info" title={t("catalogueHiddenTitle")}>
                  {t("catalogueHiddenBody")}
                </StatusMessage>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                  {lens === "matrix" ? (
                  <>
                  <SearchField
          label={t("searchResources")}
          value={query}
          onValueChange={setQuery}
          dir="ltr"
        />
                  <button
                    type="button"
                    aria-pressed={rowFilter === "granted"}
                    onClick={() => setRowFilter(rowFilter === "granted" ? "all" : "granted")}
                    className={`h-10 rounded-[var(--radius-md)] border px-3 text-label transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
                      rowFilter === "granted"
                        ? "border-[color:var(--color-brand-primary)] bg-[color:color-mix(in_srgb,var(--color-brand-primary)_10%,var(--color-surface-base))] font-medium text-[color:var(--color-text-primary)]"
                        : "border-[color:var(--color-border-default)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-skeleton)]"
                    }`}
                  >
                    {t("onlyGranted")}
                  </button>
                  </>
                  ) : null}
                </div>

                {/* Sits against the table, not stacked with the permanent
                    "takes effect immediately" notice above: two info boxes
                    of the same tone, one standing and one transient, read as
                    one block of noise and push the matrix off the fold. */}
                {autoAdded.length > 0 ? (
                  <div className="px-5 pb-3">
                    <StatusMessage tone="info" title={t("impliedTitle")}>
                      {t("impliedBody")}
                    </StatusMessage>
                  </div>
                ) : null}

                {lens === "matrix" ? (
                  <>
                    <PermissionMatrixTable
                      rows={visibleRows}
                      actions={columns}
                      locale={locale}
                      disabled={readOnly}
                      onToggle={toggle}
                    />

                    <p className="flex flex-wrap items-center gap-4 border-t border-[color:var(--color-border-default)] px-5 py-3 text-caption text-[color:var(--color-text-secondary)]">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-[2px] w-6 rounded-[var(--radius-full)] bg-[color:var(--color-semantic-warning)]"
                        />
                        {t("legendConsequential")}
                      </span>
                      <span>{t("legendLocked")}</span>
                      <span>{t("legendAbsent")}</span>
                    </p>
                  </>
                ) : (
                  <PermissionCatalogueLens
                    permissions={permissions}
                    roles={roles}
                    selectedRoleId={selectedRoleId}
                    locale={locale}
                  />
                )}

                {!readOnly ? (
                  <div className="sticky bottom-0 flex flex-wrap items-center gap-4 rounded-b-[var(--card-radius)] border-t border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-5 py-3 shadow-dropdown">
                    <p aria-live="polite" className="text-label text-[color:var(--color-text-secondary)]">
                      {diff.changed
                        ? `${t("diff", { added: diff.added.length, removed: diff.removed.length })}${
                            autoAdded.length > 0
                              ? ` · ${t("autoAdded", { count: String(autoAdded.length) })}`
                              : ""
                          }`
                        : t("noChanges")}
                    </p>
                    <div className="ms-auto flex gap-2">
                      <button
                        type="button"
                        disabled={!diff.changed || saving}
                        onClick={() => setSelection(new Set(original))}
                        className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 text-label text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] active:bg-[color:var(--color-surface-skeleton)]"
                      >
                        {t("reset")}
                      </button>
                      <button
                        type="button"
                        disabled={!canSave}
                        onClick={save}
                        className="h-10 rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-5 text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--button-disabled-text)] active:bg-[color:var(--button-primary-background-pressed)]"
                      >
                        {saving ? t("saving") : t("save")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-[color:var(--color-text-muted)]">{label}</dt>
      <dd className="text-label font-medium tabular-nums text-[color:var(--color-text-primary)]">
        {value}
      </dd>
    </div>
  );
}
