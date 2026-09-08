import type { ReactNode } from "react";

/**
 * The one place the recovery flow spends colour.
 *
 * Four tones, mapped to the four *independent* semantic families ADR-0051
 * introduced — before it, `success` and `error` were aliases of the brand
 * green and red, so a system state and a brand moment were literally the
 * same token. Keeping them apart is what lets this component say something
 * the brand palette alone could not:
 *
 *   error   — the user got something wrong and can retry now
 *   warning — nothing is wrong; the door is timed (lockout, rate limit).
 *             Deliberately NOT error: on a lockout the password may well
 *             have been right, and painting it red tells the user to doubt
 *             a credential that is fine.
 *   info    — a state to read, not to fix ("check your inbox")
 *   success — done, terminal
 *
 * Chapter 6 §6.2: colour is never the only carrier — each tone has its own
 * heading text, and the region announces itself.
 *
 * **The tone never colours the text.** Measured against the light surface at
 * the 13px label size these screens use: warning `#D09E07` reaches 2.45:1,
 * info `#2980B9` 4.31:1 and success `#238A48` 4.37:1 — all below the 4.5:1
 * WCAG 1.4.3 needs, and none of them large text. Only error clears it.
 *
 * The Design System saw this coming: §3.33.3 (TDR-004) records that the
 * `.500` step is "fills/large-text/icon use only" and that Light was to
 * alias the `.700` step, "AA-safe for text". The current token file points
 * Light at `.500` regardless (`tokens/semantic/colors.light.json:31`), and
 * ADR-0051's supersession register does not list that clause — so the two
 * documents disagree and CLAUDE.md §1/§24 say to report it, not pick one.
 *
 * This component is built so the answer does not matter: the heading takes
 * `--color-text-primary`, and the tone lives in the bar, border and tint —
 * non-text roles, redundant with wording that already carries the meaning.
 */
export type StatusTone = "error" | "warning" | "info" | "success";

const TONE_COLOR: Record<StatusTone, string> = {
  error: "var(--color-semantic-error)",
  warning: "var(--color-semantic-warning)",
  info: "var(--color-semantic-info)",
  success: "var(--color-semantic-success)",
};

export function StatusMessage({
  tone,
  title,
  children,
}: {
  tone: StatusTone;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      // `alert` for the two tones the user must act on; `status` for the two
      // that are merely informative, so a screen reader is not interrupted
      // mid-sentence by a confirmation (WCAG 2.2 SC 4.1.3).
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      style={{ "--tone": TONE_COLOR[tone] } as React.CSSProperties}
      className="animate-status-enter flex gap-3 rounded-[var(--radius-md)] border border-[color:color-mix(in_srgb,var(--tone)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--tone)_8%,var(--color-surface-base))] p-4"
    >
      {/* A full-height bar rather than an icon: it reads as the tone at a
          glance, and an icon set for four states is four more things to keep
          meaningful in two languages. */}
      <span
        aria-hidden="true"
        className="w-[3px] shrink-0 rounded-[var(--radius-full)] bg-[color:var(--tone)]"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-label font-bold text-[color:var(--color-text-primary)]">{title}</p>
        {children ? (
          <div className="text-body-sm text-[color:var(--color-text-secondary)]">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
