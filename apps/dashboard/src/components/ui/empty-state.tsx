import type { ReactNode } from "react";
import { UiIcon } from "@/lib/icons/ui-icons";
import type { UiIconName } from "@/lib/icons/ui-icons";

/**
 * A list with nothing in it, saying which kind of nothing.
 *
 * -- Three different nothings -----------------------------------------------
 *
 * "You have not added anything yet", "your filter matched nothing" and "the
 * server did not answer" look identical if a screen draws one empty box for
 * all three — and each needs a different next move: add the first one, clear
 * the filter, try again. One component, three call sites, each passing its own
 * words and its own action.
 *
 * `tone="error"` is the third: the same shape, so a failure does not throw the
 * reader into an unfamiliar layout, with the icon and the border saying it is
 * not an ordinary emptiness.
 */
export const EmptyState = ({
  icon = "inbox",
  title,
  body,
  action,
  tone = "neutral",
}: {
  icon?: UiIconName;
  title: string;
  body?: string;
  /** The one thing to do about it. Omitted where there is nothing to do. */
  action?: ReactNode;
  tone?: "neutral" | "error";
}) => (
  <div
    // `role="status"` so a list that becomes empty after a filter change
    // announces itself; the reader did not navigate, so nothing else would
    // tell them the results went away.
    role="status"
    className={`flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed px-6 py-14 text-center ${
      tone === "error"
        ? "border-[color:var(--color-semantic-error)]"
        : "border-[color:var(--color-border-default)]"
    }`}
  >
    <span
      aria-hidden="true"
      className={`inline-flex size-12 items-center justify-center rounded-[var(--radius-full)] ${
        tone === "error"
          ? "bg-[color-mix(in_srgb,var(--color-semantic-error)_10%,transparent)] text-[color:var(--color-semantic-error)]"
          : "bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]"
      }`}
    >
      <UiIcon name={icon} className="size-[var(--icon-size-sm)]" />
    </span>

    <p className="text-h5 font-bold text-[color:var(--color-text-primary)]">{title}</p>
    {body ? <p className="max-w-prose text-body-sm text-[color:var(--color-text-secondary)]">{body}</p> : null}
    {action ? <div className="pt-1">{action}</div> : null}
  </div>
);
