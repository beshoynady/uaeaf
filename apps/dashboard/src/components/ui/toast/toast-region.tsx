"use client";

import { useTranslations } from "next-intl";
import { BUTTON_ICON } from "../interactive";
import { useToastSnapshot } from "./toast-provider";
import type { ToastRecord, ToastStore, ToastTone } from "./toast-store";

/**
 * Where messages appear: one fixed stack, bottom of the reading edge.
 *
 * The accessibility rules it carries (Chapter 8 L4 FB.7, FB.20):
 *
 * - Each message declares its own role — `alert` for an error, `status` for
 *   everything else — so the two are announced with the urgency they have.
 *   The role sits on the message rather than the list because the list is
 *   always mounted and a live region that already contains text announces
 *   nothing when more arrives.
 * - `aria-atomic` so the counter is read with the text it counts, not alone.
 * - The region never takes focus (FB.20). The dismiss button inside it is
 *   reachable by Tab like any other control, which is also what lets FB.11's
 *   "pause on keyboard focus" happen at all.
 * - An icon accompanies every tone, and the tone is also stated in text for
 *   a reader who cannot see the icon (Chapter 6 §6.2 — never colour alone).
 *
 * The stack itself is `pointer-events-none` so the empty space above the
 * messages does not swallow clicks meant for the page; each message turns
 * pointer events back on for its own box.
 */
export function ToastRegion({ store }: { store: ToastStore }) {
  const t = useTranslations("Toasts");
  const { visible, queued, dropped } = useToastSnapshot(store);
  const waiting = queued + dropped;

  return (
    <div
      // Always mounted, even with nothing in it: a region created at the
      // moment its first message arrives is a region assistive technology
      // was not watching when the message arrived.
      role="region"
      aria-label={t("regionLabel")}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      <ol className="pointer-events-auto flex w-full max-w-sm flex-col gap-2">
        {visible.map((record) => (
          <ToastItem
            key={record.id}
            record={record}
            onDismiss={() => {
              store.dismiss(record.id);
            }}
            // FB.11/FB.21. Region-wide rather than per message: while the
            // pointer or the keyboard is inside this stack the reader is
            // reading the stack, and a message two rows up expiring mid-read
            // is the failure the rule is about.
            onPause={() => {
              store.pause();
            }}
            onResume={() => {
              store.resume();
            }}
          />
        ))}
      </ol>

      {waiting > 0 ? (
        <p className="pointer-events-none text-caption text-[color:var(--color-text-muted)]">
          {t("waiting", { count: waiting })}
        </p>
      ) : null}
    </div>
  );
}

const TONE_ICON_COLOURS: Record<ToastTone, string> = {
  success: "text-[color:var(--color-semantic-success)]",
  info: "text-[color:var(--color-semantic-info)]",
  warning: "text-[color:var(--color-semantic-warning)]",
  error: "text-[color:var(--color-semantic-error)]",
};

function ToastItem({
  record,
  onDismiss,
  onPause,
  onResume,
}: {
  record: ToastRecord;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const t = useTranslations("Toasts");

  return (
    <li
      // FB.7: an error is announced at once; everything else waits its turn.
      role={record.tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      // The tone is carried by the icon and by the tone word beside the
      // title, which is what Chapter 6 §6.2 asks for. A thick coloured bar
      // down one edge would be a third statement of the same fact, and
      // FB.15's anatomy does not have one.
      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-3 shadow-card"
    >
      <ToneIcon tone={record.tone} />

      <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
        <p className="text-label font-medium text-[color:var(--color-text-primary)]">
          {/* The tone in words, for a reader who gets no colour and no icon. */}
          <span className="sr-only">{t(`tone.${record.tone}`)}: </span>
          {record.title}
          {record.count > 1 ? (
            // `dir="ltr"`: the counter is `(×2)`, a numeric badge rather
            // than prose, and bidi reordering would otherwise put the bracket
            // on the wrong side of it in Arabic.
            <span dir="ltr" className="ms-1 text-[color:var(--color-text-muted)]">
              {t("repeated", { count: record.count })}
            </span>
          ) : null}
        </p>
        {record.description ? (
          <p className="text-caption text-[color:var(--color-text-secondary)]">{record.description}</p>
        ) : null}
      </div>

      <button type="button" onClick={onDismiss} aria-label={t("dismiss")} className={BUTTON_ICON}>
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="size-[var(--icon-size-xs)]"
        >
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </li>
  );
}

/** One glyph per tone, so the four are told apart without reading the colour
 *  (Chapter 6 §6.2). Decorative to assistive technology — the tone is in the
 *  message's own text above. */
function ToneIcon({ tone }: { tone: ToastTone }) {
  const shared = {
    "aria-hidden": true,
    focusable: "false",
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: `mt-2 size-[var(--icon-size-sm)] shrink-0 ${TONE_ICON_COLOURS[tone]}`,
  } as const;

  switch (tone) {
    case "success":
      return (
        <svg {...shared}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="m6.5 10.5 2.5 2.5 4.5-5" />
        </svg>
      );
    case "warning":
      return (
        <svg {...shared}>
          <path d="M10 3 2.5 16.5h15z" />
          <path d="M10 8v3.5" />
          <path d="M10 14h.01" />
        </svg>
      );
    case "error":
      return (
        <svg {...shared}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 6v5" />
          <path d="M10 13.5h.01" />
        </svg>
      );
    default:
      return (
        <svg {...shared}>
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 9v5" />
          <path d="M10 6.5h.01" />
        </svg>
      );
  }
}
