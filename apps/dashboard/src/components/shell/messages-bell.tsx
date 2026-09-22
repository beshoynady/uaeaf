import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UiIcon } from "@/lib/icons/ui-icons";

/** Past this the badge would outgrow the control; the full number is in the name. */
const MAX_SHOWN = 99;

/**
 * The header's bell: how many contact messages are still new, and the way to
 * them (owner request 2026-09-22).
 *
 * Counted from the messages' own status by `GET /contact-messages/summary`,
 * not from a notifications list: "new" is the unread state, so there is no
 * second read flag to drift from it. The layout reads it on every server
 * render, and the messages screen refreshes it after each status change.
 *
 * The badge is CMP-BADGE-001 `Numeric`: capped at "99+", and announced through
 * the link's name ("Messages, 3 new messages"), so it is hidden from assistive
 * technology itself. A new message is not urgent, so it takes the badge's info
 * colour rather than danger. It is outlined because the number then reads in
 * `semantic-info-text` on the raised surface: 5.30:1 light, 5.17:1 dark. White
 * on a filled `semantic-info` is 4.30:1 in the light theme, below the 4.5:1
 * a 13px number needs.
 *
 * Sized with the header's other controls.
 */
export const MessagesBell = ({ count }: { count: number }) => {
  const t = useTranslations("Shell");

  return (
    <Link
      href="/messages"
      aria-label={t("messagesBell", { count })}
      className="relative flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] text-[color:var(--color-text-secondary)] transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
    >
      <UiIcon name="bell" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-2 -end-2 inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-full)] border border-[color:var(--color-semantic-info)] bg-[color:var(--color-surface-raised)] px-1 text-caption font-bold text-[color:var(--color-semantic-info-text)]"
        >
          {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
        </span>
      ) : null}
    </Link>
  );
};
