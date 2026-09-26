import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { BrandGround } from "@/components/ui/brand-ground";
import { EditorialScreenNotice } from "@/components/admin/editorial-editor/editorial-screen-notice";
import { PresidentMessageEditor } from "@/components/admin/president-message/editor";
import { loadEditorialScreen } from "@/lib/admin/editorial-screen";
import { readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { PresidentMessageResponse } from "@/lib/admin/president-message";
import { resolveLocale } from "@/i18n/params";

/**
 * The president's message.
 *
 * Opened, refused and resolved to one record by the shared editorial loader,
 * whose rules this screen settled: the check is enforced on the server, the
 * editor and the approver are the two grants that open it, and reading alone
 * opens nothing (owner decision 2026-09-12 — narrower than `أ٣` of the plan,
 * where the link was to appear for `Read`).
 *
 * One message, held as a collection upstream: the archive of past messages is
 * a later decision (plan, decision 5), so the screen edits one row. Creating
 * it needs an appointment to attach to, and comes from seeding or an import.
 */
const PresidentMessagePage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  /** `?record=<id>` opens one specific row of the collection — how a test
   *  record is rehearsed on without touching the real message. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("PresidentMessage");
  const screen = await loadEditorialScreen<PresidentMessageResponse>("presidentMessagePage", locale, searchParams);
  const header = <PageHeader title={t("title")} description={t("description")} />;

  if (screen.status !== "ready") {
    const common = await getTranslations("Common");
    return (
      <BrandGround>
        {header}
        <EditorialScreenNotice screen={screen} t={t} common={common} />
      </BrandGround>
    );
  }

  // Only the fields this record can actually be blocked on. The rest of a
  // blocker path stays technical, which is the honest answer for generated
  // paths inside rich text.
  const fieldLabels = {
    featuredImageId: t("blockerField.featuredImageId"),
    heroImageId: t("blockerField.heroImageId"),
    pullQuote: t("blockerField.pullQuote"),
    messageBody: t("blockerField.messageBody"),
  };

  // The publish grant decides whether the activation bar offers a control or
  // only states the page's condition: editing the page and deciding when the
  // public sees it are different jobs (ADR-0102 §D2).
  const grants = await readGrants(locale);

  return (
    <BrandGround>
      {/* The editor owns the frame, not this page: it draws the shared shell,
          whose header replaces `PageHeader` here (ADR-0102 §D1) so the screen
          has one `h1`, and whose version panel needs the draft this component
          holds. */}
      <PresidentMessageEditor
        record={screen.record}
        images={screen.images}
        canEdit={screen.canEdit}
        canPublish={hasPermission(grants, "presidentMessagePage", "Publish")}
        canReadMedia={screen.canReadMedia}
        locale={locale}
        editorial={screen.editorial}
        fieldLabels={fieldLabels}
      />
    </BrandGround>
  );
};

export default PresidentMessagePage;
