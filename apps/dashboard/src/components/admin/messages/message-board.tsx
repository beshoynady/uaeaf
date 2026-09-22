"use client";

import { useRouter } from "@/i18n/navigation";
import { MessageInbox } from "./message-inbox";
import type { ContactMessage, MessageStatus } from "@/lib/admin/contact-messages";

/**
 * The messages screen, wired to the API.
 *
 * Separate from `MessageInbox` as the policy and review boards are: the inbox
 * owns what a status change means, and this owns only how one travels.
 */
export const MessageBoard = ({
  messages,
  canUpdate,
}: {
  messages: readonly ContactMessage[];
  canUpdate: boolean;
}) => {
  const router = useRouter();

  const changeStatus = async (id: string, status: MessageStatus): Promise<boolean> => {
    const response = await fetch(`/api/admin/contact-messages/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return false;

    // The list and the header bell are both drawn on the server; refreshing
    // redraws them from what was stored.
    router.refresh();
    return true;
  };

  return <MessageInbox messages={messages} canUpdate={canUpdate} onStatusChange={changeStatus} />;
};
