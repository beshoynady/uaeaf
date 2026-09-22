/**
 * The messages screen's rules, apart from any component: the messages sent
 * through the public site's contact form (Domain 10, `contactMessages`).
 *
 * A message's state is its own `status` field. The approved schema keeps it
 * outside the workflow list on purpose: handling a citizen's message is not an
 * approval, and `workflowInstanceId` stays for a formal escalation.
 */

export const MESSAGE_STATUSES = ["New", "InProgress", "Resolved", "Closed"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_TYPES = ["Complaint", "Suggestion", "Inquiry", "General"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

/**
 * One message as `GET /contact-messages` returns it. The reply fields are left
 * out: this screen neither shows nor writes them.
 */
export interface ContactMessage {
  _id: string;
  messageType: MessageType;
  senderName: string;
  senderEmail: string | null;
  senderPhone: string | null;
  subject: string | null;
  messageBody: string;
  status: MessageStatus;
  createdAt: string;
}

export const MESSAGE_FILTERS = ["all", ...MESSAGE_STATUSES] as const;
export type MessageFilter = (typeof MESSAGE_FILTERS)[number];

export const matchesFilter = (message: Pick<ContactMessage, "status">, filter: MessageFilter): boolean =>
  filter === "all" || message.status === filter;

/** Each filter's count, taken over every message rather than the ones on show. */
export const countByFilter = (messages: readonly Pick<ContactMessage, "status">[]): Record<MessageFilter, number> =>
  Object.fromEntries(
    MESSAGE_FILTERS.map((filter) => [filter, messages.filter((message) => matchesFilter(message, filter)).length]),
  ) as Record<MessageFilter, number>;

/**
 * The status a message moves to when someone opens it, or `null` when opening
 * changes nothing. "New" is the unread state, so there is no second read flag
 * to drift from it.
 */
export const statusOnOpening = (status: MessageStatus): MessageStatus | null =>
  status === "New" ? "InProgress" : null;

const isMessageStatus = (value: unknown): value is MessageStatus =>
  typeof value === "string" && (MESSAGE_STATUSES as readonly string[]).includes(value);

/** The body the status route forwards: exactly `{ status }`, or nothing. */
export const readStatusBody = (body: unknown): { status: MessageStatus } | null => {
  if (!body || typeof body !== "object") return null;
  const { status } = body as { status?: unknown };
  return isMessageStatus(status) ? { status } : null;
};
