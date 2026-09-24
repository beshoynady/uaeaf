import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { BrandGround } from "@/components/ui/brand-ground";
import { AccessDenied } from "@/components/ui/access-denied";
import { PolicyBoard } from "@/components/admin/news/policy-board";
import { loadApprovalPolicies } from "@/lib/admin/newsroom-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * Turning review on or off for any content type.
 *
 * Driven by the list the server sends rather than by a list written here, so a
 * thirteenth governed type appears on this screen without a line of code being
 * written for it — which is the whole reason the screen exists.
 *
 * Under Users & Access (IA §4.8): it decides who may approve what, for every
 * content type. Its former address, `/news/policies`, redirects here
 * (`legacy-redirects.mjs`).
 */
const PoliciesPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Newsroom");
  const common = await getTranslations("Common");
  const screen = await loadApprovalPolicies(locale);

  const header = <PageHeader title={t("policiesTitle")} description={t("policiesDescription")} />;

  if (screen.status !== "ready") {
    return (
      <BrandGround>
        {header}
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </BrandGround>
    );
  }

  return (
    <BrandGround>
      {header}
      <PolicyBoard entities={screen.data.entities} approvers={screen.data.approvers} locale={locale} />
    </BrandGround>
  );
};

export default PoliciesPage;
