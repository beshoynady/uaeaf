import { getTranslations } from "next-intl/server";
import { AccessDenied } from "@/components/ui/access-denied";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission, type PermissionGrant } from "@/lib/auth/permissions";
import type { NavRequirement } from "@/lib/navigation";

/**
 * What a sponsors, partners, memberships or strip page shows instead of its
 * editor: refused, when a grant its Save uses is missing, and not loaded.
 * Checked on the server; the API checks every write again.
 */

export const holdsAll = (grants: readonly PermissionGrant[], required: readonly NavRequirement[]): boolean =>
  required.every(({ resourceType, action }) => hasPermission(grants, resourceType, action ?? "Read"));

export const RelationAccessDenied = async ({ title, description }: { title: string; description: string }) => {
  const common = await getTranslations("Common");
  return (
    <>
      <PageHeader title={title} description={description} />
      <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
    </>
  );
};

export const RelationLoadFailed = async ({ title, description }: { title: string; description: string }) => {
  const common = await getTranslations("Common");
  return (
    <>
      <PageHeader title={title} description={description} />
      <p
        role="status"
        className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4 text-body-sm text-[color:var(--color-text-primary)]"
      >
        {common("loadFailed")}
      </p>
    </>
  );
};
