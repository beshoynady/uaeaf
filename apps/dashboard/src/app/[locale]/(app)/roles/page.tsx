import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import type { PermissionResponse, RoleResponse, UserResponse } from "@/lib/api/types";
import { summariseDirectory } from "@/lib/admin/directory-stats";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { StatTiles, type StatTile } from "@/components/admin/stat-tiles";
import { RoleWorkbench } from "@/components/admin/roles/role-workbench";
import { resolveLocale } from "@/i18n/params";

/**
 * Roles and permissions, on one screen.
 *
 * They are one screen because they are one decision: a permission cannot be
 * granted to a person, only to a role, so "which permissions" is never a
 * question asked apart from "which role". The approved IA
 * (`01-Information-Architecture.md` §4.8) says the same — it defines one
 * screen, "Roles & Permissions", under Users & Access; the separate
 * `/permissions` route this project had built was a drift from it, and was
 * deleted on 2026-09-08. Its content lives here as the catalogue lens,
 * which also answers what that flat table could not: who holds a given
 * permission, and which permissions no role holds at all.
 *
 * Three fetches, three separate grants. `roles:Read` is the screen's own
 * gate; `permissions:Read` and `users:Read` are independent, so this page has
 * to render sensibly when either is refused rather than failing whole. Each
 * `null` is a 403 and is handled as an absence, not an error.
 */
export default async function RolesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("RolesWorkbench");
  const common = await getTranslations("Common");

  const [roles, permissions, users, grants] = await Promise.all([
    fetchAsUser<RoleResponse[]>("/roles", locale),
    fetchAsUser<PermissionResponse[]>("/permissions", locale),
    fetchAsUser<UserResponse[]>("/users", locale),
    readGrants(locale),
  ]);

  if (roles === null) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  const summary = summariseDirectory(users ?? [], roles, permissions ?? []);

  const tiles: StatTile[] = [
    {
      key: "roles",
      label: t("tileRoles"),
      value: summary.roles.total,
      note: t("tileRolesNote", { system: summary.roles.system, custom: summary.roles.custom }),
    },
    {
      key: "catalogue",
      label: t("tileCatalogue"),
      value: summary.catalogue.permissions,
      note: t("tileCatalogueNote", { resources: summary.catalogue.resources }),
    },
    {
      key: "unused",
      label: t("tileUnused"),
      value: summary.rolesWithoutUsers,
      note: t("tileUnusedNote"),
      tone: summary.rolesWithoutUsers > 0 ? "attention" : "neutral",
    },
    {
      key: "consequential",
      label: t("tileConsequential"),
      value: summary.accountsWithConsequentialAccess,
      note: t("tileConsequentialNote"),
      tone: summary.accountsWithConsequentialAccess > 0 ? "critical" : "neutral",
    },
    {
      key: "roleless",
      label: t("tileRoleless"),
      value: summary.accountsWithoutRole,
      note: t("tileRolelessNote"),
      tone: summary.accountsWithoutRole > 0 ? "attention" : "neutral",
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <StatTiles tiles={tiles} caption={t("tilesCaption")} />
      <RoleWorkbench
        roles={roles}
        permissions={permissions ?? []}
        users={users ?? []}
        actorGrants={grants}
        locale={locale}
      />
    </>
  );
}
