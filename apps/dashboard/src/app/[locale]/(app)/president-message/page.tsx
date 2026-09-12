import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { PresidentMessageEditor } from "@/components/admin/president-message/editor";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { PresidentMessageResponse } from "@/lib/admin/president-message";
import { resolveLocale } from "@/i18n/params";

/**
 * The president's message.
 *
 * The permission check here is the *enforcement* half of the pair. Hiding the
 * link in the navigation is presentation — anyone can type the URL — so this
 * decides on the server, before any of the record reaches the browser, and a
 * reader who fails it is sent an access notice rather than the screen.
 *
 * Reading the message is deliberately not enough. The screen exists to change
 * it or to decide on a change, so `presidentMessagePage:Read` alone opens
 * nothing (owner decision 2026-09-12) — which is a narrower rule than the
 * other sections of this dashboard use, and narrower than `أ٣` of the plan
 * recorded, where the link was to appear for `Read`.
 *
 * Two grants, two jobs. The editor writes the message; the approver decides
 * on it and needs to read what they are approving, so the screen opens for
 * either and the editor itself goes read-only for the one who cannot write.
 */
export default async function PresidentMessagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("PresidentMessage");
  const common = await getTranslations("Common");

  const grants = await readGrants(locale);
  const canEdit = hasPermission(grants, "presidentMessagePage", "Update");
  const canReview = hasPermission(grants, "workflowInstances", "Approve");

  if (!canEdit && !canReview) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  // The record and the image library are independent grants. `mediaAssets`
  // being refused is an absence, not an error: the picker then offers upload
  // only, rather than an empty grid that reads as a broken screen.
  const [records, images] = await Promise.all([
    fetchAsUser<PresidentMessageResponse[]>("/president-message-page", locale),
    fetchAsUser<MediaAssetOption[]>("/media-assets", locale),
  ]);

  // Refused is not the same as absent, and saying "access denied" for both
  // tells a reader with every permission that they lack one. `null` is the
  // API refusing; an empty list is a record nobody has created.
  if (records === null) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />
      </>
    );
  }

  // One message, held as a collection upstream: the archive of past messages
  // is a later decision (plan, decision 5), so the screen edits the one row
  // that exists rather than offering a list of one.
  const record = records[0] ?? null;

  if (record === null) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />
        {/* Creating it is not this screen's job: it needs an appointment to
            attach to, and comes from seeding or an import. */}
        <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-6 py-10 text-center text-body text-[color:var(--color-text-muted)]">
          <strong className="block text-body font-bold text-[color:var(--color-text-primary)]">
            {t("notCreatedTitle")}
          </strong>
          {t("notCreatedBody")}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <PresidentMessageEditor
        record={record}
        images={images ?? []}
        canEdit={canEdit}
        canReadMedia={images !== null}
        locale={locale}
      />
    </>
  );
}
