import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchAsUser, readCurrentUser } from "@/lib/auth/session";
import type { FederationPersonResponse, RoleResponse, UserResponse } from "@/lib/api/types";
import { summariseDirectory } from "@/lib/admin/directory-stats";
import { hasPermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { StatTiles, type StatTile } from "@/components/admin/stat-tiles";
import { StatusMessage } from "@/components/auth/status-message";
import { UserDirectory } from "@/components/admin/users/user-directory";
import { resolveLocale } from "@/i18n/params";

/**
 * The account directory.
 *
 * The tiles above the table exist to answer the two questions this screen is
 * usually opened with — who is holding access they should not, and who is
 * stuck without any — because both are invisible in a list sorted by name.
 *
 * Creating an account happens above the table rather than on a page of its
 * own: it is the same list, with one more row in it afterwards, and a
 * separate route would lose the directory the administrator was reading to
 * decide they needed the account.
 *
 * Suspending, deactivating and restoring an account all happen in the row's
 * own panel. That control did not exist until `PATCH /users/:id/status` was
 * added on 2026-09-08 — before it, nothing in the API wrote `accountStatus`
 * at all and this screen said so rather than offering a button that could
 * not work.
 */
export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("UsersDirectory");
  const common = await getTranslations("Common");

  const [users, roles, personnel, me] = await Promise.all([
    fetchAsUser<UserResponse[]>("/users", locale),
    fetchAsUser<RoleResponse[]>("/roles", locale),
    // A fourth, independent grant. `null` is a 403 and means the account form
    // omits its personnel picker — not that the federation has no personnel.
    fetchAsUser<FederationPersonResponse[]>("/federation-personnel", locale),
    readCurrentUser(locale),
  ]);

  if (users === null) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  const grants = me?.permissions ?? [];
  const people =
    personnel === null
      ? null
      : personnel.map((person) => ({ id: person._id, name: person.fullName }));
  const summary = summariseDirectory(users, roles ?? [], []);

  const tiles: StatTile[] = [
    {
      key: "total",
      label: t("tileTotal"),
      value: summary.accounts.total,
      note: t("tileTotalNote", {
        active: summary.accounts.active,
        suspended: summary.accounts.suspended,
        deactivated: summary.accounts.deactivated,
      }),
    },
    {
      key: "roleless",
      label: t("tileRoleless"),
      value: summary.accountsWithoutRole,
      note: t("tileRolelessNote"),
      tone: summary.accountsWithoutRole > 0 ? "attention" : "neutral",
    },
    {
      key: "suspended",
      label: t("tileSuspended"),
      value: summary.accounts.suspended,
      note: t("tileSuspendedNote"),
      tone: summary.accounts.suspended > 0 ? "attention" : "neutral",
    },
    {
      key: "never",
      label: t("tileNever"),
      value: summary.neverSignedIn,
      note: t("tileNeverNote"),
    },
    {
      key: "roles",
      label: t("tileRoles"),
      value: summary.roles.total,
      note: t("tileRolesNote", { unused: summary.rolesWithoutUsers }),
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <StatTiles tiles={tiles} caption={t("tilesCaption")} />

      {roles === null ? (
        // `roles:Read` is a separate grant from `users:Read`. Without it the
        // directory can still list accounts, but every role would render as
        // an unresolvable id — so say that rather than show a table of
        // dashes.
        <StatusMessage tone="info" title={t("rolesHiddenTitle")}>
          {t("rolesHiddenBody")}
        </StatusMessage>
      ) : null}

      <UserDirectory
        users={users}
        roles={roles ?? []}
        actorUserId={me?.id ?? null}
        canAssign={roles !== null && hasPermission(grants, "users", "Update")}
        canCreate={hasPermission(grants, "users", "Create")}
        people={people}
        locale={locale}
      />

    </>
  );
}
