import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { MessageBoard } from "@/components/admin/messages/message-board";
import { loadContactMessages } from "@/lib/admin/messages-screen";
import { resolveLocale } from "@/i18n/params";

/**
 * The messages sent through the public contact form (owner request
 * 2026-09-22; IA §4.8 note). Read here, and moved between their four statuses
 * where the reader may update them. Replying is not part of this screen.
 */
const MessagesPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  const t = await getTranslations("Messages");
  const common = await getTranslations("Common");
  const screen = await loadContactMessages(locale);

  const header = <PageHeader title={t("title")} description={t("description")} />;

  if (screen.status !== "ready") {
    return (
      <>
        {header}
        <AccessDenied title={common("accessDeniedTitle")} message={t("accessDenied")} />
      </>
    );
  }

  return (
    <>
      {header}
      <MessageBoard messages={screen.data.messages} canUpdate={screen.data.canUpdate} />
    </>
  );
};

export default MessagesPage;
