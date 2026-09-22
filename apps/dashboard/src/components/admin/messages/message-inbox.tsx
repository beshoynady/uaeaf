"use client";

import { useId, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { SelectField } from "@/components/ui/select-field";
import { SELECTABLE_ROW, TOGGLE_SEGMENT } from "@/components/ui/interactive";
import {
  MESSAGE_FILTERS,
  MESSAGE_STATUSES,
  countByFilter,
  matchesFilter,
  statusOnOpening,
  type ContactMessage,
  type MessageFilter,
  type MessageStatus,
} from "@/lib/admin/contact-messages";

/** A status this screen wrote, and the one it replaced. */
interface Written {
  from: MessageStatus;
  to: MessageStatus;
}

/**
 * The messages sent through the public contact form, newest first, one open
 * at a time (owner request 2026-09-22).
 *
 * PT-LISTDETAIL-001 as an inbox (ADR-0089 D2, amended): the filter before the
 * list, the list beside the message, one Select in its place below lg. What
 * differs from a settings workspace is recorded there: the records are open
 * ended, nothing is drafted, and a status change is written at once.
 *
 * Nothing is chosen for the reader. Opening a new message marks it read, so
 * choosing one on arrival would mark a message nobody has read.
 *
 * A status written here shows at once, ahead of the refreshed list, and gives
 * way to that list as soon as the list reports anything else: a change made
 * elsewhere afterwards is not hidden behind this screen's own.
 */
export const MessageInbox = ({
  messages,
  canUpdate,
  onStatusChange,
}: {
  messages: readonly ContactMessage[];
  /** `contactMessages:Update`: without it the screen reads and changes nothing. */
  canUpdate: boolean;
  /** Writes the status; `false` when it was refused or could not be sent. */
  onStatusChange: (id: string, status: MessageStatus) => Promise<boolean>;
}) => {
  const t = useTranslations("Messages");
  const format = useFormatter();
  const toast = useToast();
  const id = useId();
  const [filter, setFilter] = useState<MessageFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [written, setWritten] = useState<Readonly<Record<string, Written>>>({});
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  // Read by the handler at the moment it writes (CLAUDE.md §31): state caught
  // in a closure would miss a write that started a moment ago.
  const inFlight = useRef(new Set<string>());

  const statusOf = (message: ContactMessage): MessageStatus => {
    const own = written[message._id];
    return own && own.from === message.status ? own.to : message.status;
  };

  const current = messages.map((message) => ({ ...message, status: statusOf(message) }));
  const counts = countByFilter(current);
  // The open message stays listed when the filter stops matching it.
  const visible = current.filter((message) => matchesFilter(message, filter) || message._id === selected);
  const open = current.find((message) => message._id === selected) ?? null;

  const setBusy = (messageId: string, busy: boolean) => {
    if (busy) inFlight.current.add(messageId);
    else inFlight.current.delete(messageId);
    setPending(new Set(inFlight.current));
  };

  const move = async (message: ContactMessage, status: MessageStatus, opening: boolean) => {
    if (inFlight.current.has(message._id)) return;

    setBusy(message._id, true);
    let saved = false;
    try {
      saved = await onStatusChange(message._id, status);
    } catch {
      saved = false;
    }
    setBusy(message._id, false);

    if (!saved) {
      toast.show({ tone: "error", title: t("toastFailed"), description: t("toastFailedDetail"), source: "api" });
      return;
    }
    const from = messages.find((row) => row._id === message._id)?.status ?? message.status;
    setWritten((held) => ({ ...held, [message._id]: { from, to: status } }));
    toast.show(
      opening
        ? { tone: "success", title: t("toastRead"), description: t("toastReadDetail"), source: "api" }
        : { tone: "success", title: t("toastMoved", { status: t(`status_${status}`) }), source: "api" },
    );
  };

  const choose = (messageId: string) => {
    setSelected(messageId);
    const message = current.find((row) => row._id === messageId);
    if (!message || !canUpdate) return;
    const next = statusOnOpening(message.status);
    if (next) void move(message, next, true);
  };

  const subjectOf = (message: ContactMessage) => message.subject?.trim() || t("noSubject");
  const receivedAt = (message: ContactMessage) =>
    format.dateTime(new Date(message.createdAt), { dateStyle: "medium", timeStyle: "short" });

  if (messages.length === 0) {
    return <p className="text-body text-[color:var(--color-text-secondary)]">{t("listEmpty")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="group"
        aria-label={t("filtersLabel")}
        className="inline-flex flex-wrap gap-1 self-start rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-1"
      >
        {MESSAGE_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={TOGGLE_SEGMENT}
          >
            {t(`filter_${option}`, { count: counts[option] })}
          </button>
        ))}
      </div>

      {/* Chapter 5 §5.2: twelve columns from lg, gutter 24px, 32px from xl. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-8">
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="lg:hidden">
            <SelectField
              id={`${id}-picker`}
              label={t("picker")}
              placeholder
              value={selected ?? ""}
              onChange={(event) => choose(event.target.value)}
              options={visible.map((message) => ({
                value: message._id,
                label: t("pickerOption", { sender: message.senderName, subject: subjectOf(message) }),
              }))}
            />
          </div>

          <section
            aria-labelledby={`${id}-title`}
            className="hidden flex-col gap-4 rounded-[var(--card-radius)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4 lg:flex"
          >
            <h2 id={`${id}-title`} className="text-label font-bold text-[color:var(--color-text-primary)]">
              {t("listTitle")}
            </h2>

            {visible.length === 0 ? (
              <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("filterEmpty")}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {visible.map((message) => {
                  const unread = message.status === "New";
                  return (
                    <li key={message._id}>
                      {/* `aria-current`: the one message on show, not a toggle. */}
                      <button
                        type="button"
                        aria-current={message._id === selected ? "true" : undefined}
                        onClick={() => choose(message._id)}
                        className={`${SELECTABLE_ROW} flex flex-col gap-1 aria-[current=true]:bg-[color:var(--color-surface-sunken)]`}
                      >
                        <span className="flex w-full items-start justify-between gap-2">
                          <span
                            className={`text-body-sm text-[color:var(--color-text-primary)] ${unread ? "font-bold" : "font-medium"}`}
                          >
                            {message.senderName}
                          </span>
                          {/* A word, not a colour: "new" is read as well as seen. */}
                          <span
                            className={`shrink-0 rounded-[var(--radius-full)] border px-2 text-caption ${
                              unread
                                ? "border-[color:var(--color-brand-primary)] font-bold text-[color:var(--color-text-primary)]"
                                : "border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)]"
                            }`}
                          >
                            {t(`status_${message.status}`)}
                          </span>
                        </span>
                        <span className="line-clamp-1 text-caption text-[color:var(--color-text-secondary)]">
                          {subjectOf(message)}
                        </span>
                        <span className="text-caption text-[color:var(--color-text-muted)]">
                          {t(`type_${message.messageType}`)} · {receivedAt(message)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 lg:col-span-8 xl:col-span-9">
          {open ? (
            <article
              aria-labelledby={`${id}-subject`}
              className="flex flex-col gap-6 rounded-[var(--card-radius)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-6"
            >
              <h2 id={`${id}-subject`} className="text-h4 font-bold text-[color:var(--color-text-primary)]">
                {subjectOf(open)}
              </h2>

              <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {[
                  { term: t("from"), value: open.senderName },
                  { term: t("type"), value: t(`type_${open.messageType}`) },
                  { term: t("email"), value: open.senderEmail ?? t("none"), ltr: open.senderEmail !== null },
                  { term: t("phone"), value: open.senderPhone ?? t("none"), ltr: open.senderPhone !== null },
                  { term: t("received"), value: receivedAt(open) },
                ].map(({ term, value, ltr }) => (
                  <div key={term} className="flex flex-col gap-1">
                    <dt className="text-caption text-[color:var(--color-text-muted)]">{term}</dt>
                    <dd className="m-0 text-start text-body-sm text-[color:var(--color-text-primary)] [overflow-wrap:anywhere]">
                      {/* The address keeps its own direction; the cell keeps
                          the page's, so the value stays under its label. */}
                      {ltr ? <span dir="ltr">{value}</span> : value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="m-0 whitespace-pre-line text-body text-[color:var(--color-text-primary)] [overflow-wrap:anywhere]">
                {open.messageBody}
              </p>

              {canUpdate ? (
                <div
                  role="group"
                  aria-label={t("statusLabel")}
                  className="inline-flex flex-wrap gap-1 self-start rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] p-1"
                >
                  {MESSAGE_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={open.status === status}
                      // Waits while a write for this message is on its way:
                      // two in flight could land in either order.
                      disabled={pending.has(open._id)}
                      onClick={() => {
                        if (status !== open.status) void move(open, status, false);
                      }}
                      className={TOGGLE_SEGMENT}
                    >
                      {t(`status_${status}`)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="m-0 text-body-sm text-[color:var(--color-text-primary)]">
                    {t("statusLabel")}: <span className="font-bold">{t(`status_${open.status}`)}</span>
                  </p>
                  <p className="m-0 text-caption text-[color:var(--color-text-muted)]">{t("readOnly")}</p>
                </div>
              )}
            </article>
          ) : (
            <p className="text-body text-[color:var(--color-text-secondary)]">{t("chooseMessage")}</p>
          )}
        </div>
      </div>
    </div>
  );
};
