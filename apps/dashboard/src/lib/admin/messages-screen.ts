import { unstable_rethrow } from "next/navigation";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { hasPermission, type PermissionGrant } from "@/lib/auth/permissions";
import type { ContactMessage } from "@/lib/admin/contact-messages";
import type { AppLocale } from "@/i18n/routing";

type MessagesScreen =
  | { status: "denied" }
  | { status: "ready"; data: { messages: ContactMessage[]; canUpdate: boolean } };

/**
 * What the messages screen reads before it draws, decided on the server: a
 * reader without `contactMessages:Read` is refused before any message, which
 * is a citizen's personal data, reaches the browser.
 */
export const loadContactMessages = async (locale: AppLocale): Promise<MessagesScreen> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "contactMessages", "Read")) {
    return { status: "denied" };
  }

  const messages = await fetchAsUser<ContactMessage[]>("/contact-messages", locale);
  if (messages === null) {
    return { status: "denied" };
  }

  return {
    status: "ready",
    // The screen offers a status change only where the API would accept one.
    data: { messages, canUpdate: hasPermission(grants, "contactMessages", "Update") },
  };
};

/**
 * The header bell's count, or `null` when there is no bell to draw: the reader
 * may not see the messages, or the count could not be read. Every signed-in
 * screen draws the header, so a failed count costs the bell and not the page.
 */
export const loadNewMessageCount = async (
  grants: readonly PermissionGrant[],
  locale: AppLocale,
): Promise<number | null> => {
  if (!hasPermission(grants, "contactMessages", "Read")) {
    return null;
  }
  try {
    const summary = await fetchAsUser<{ newCount: number }>("/contact-messages/summary", locale);
    return typeof summary?.newCount === "number" ? summary.newCount : null;
  } catch (error) {
    // A lost session still redirects to sign-in; only a failed count is absorbed.
    unstable_rethrow(error);
    return null;
  }
};
