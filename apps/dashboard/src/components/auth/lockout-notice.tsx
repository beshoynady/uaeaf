"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatCountdown } from "@/lib/auth/lockout";
import { StatusMessage } from "./status-message";

/**
 * What the screen says when the door is timed rather than wrong.
 *
 * Two renderings, and which one appears is decided by evidence, not taste:
 *
 * - The API sent `Retry-After` → a real countdown, and the form unlocks the
 *   moment it reaches zero.
 * - It did not (the case today) → the policy, stated as a maximum: "up to
 *   15 minutes". No clock.
 *
 * The guiding design showed a ticking clock unconditionally. That cannot be
 * built honestly against this API: the lockout begins at the fifth failure,
 * so a user who reloads eight minutes in would watch a fresh 15:00 count
 * down and still be refused at 00:00. A wrong clock is worse than none —
 * it is the difference between a screen the user can trust and one they
 * learn to ignore.
 */
/** The two timed refusals, which have different causes and so different
 *  copy: `accountLocked` is five failures against one account, while
 *  `tooManyAttempts` is the endpoint's own throttle (10 requests / 60s) and
 *  says nothing about whether the credentials were right. Sharing one
 *  message would tell a throttled user their account is locked when it is
 *  not. */
export type TimedReason = "accountLocked" | "tooManyAttempts";

const COPY: Record<TimedReason, { title: string; withClock: string; withoutClock: string }> = {
  accountLocked: {
    title: "lockedTitle",
    withClock: "lockedWithClock",
    withoutClock: "lockedWithoutClock",
  },
  tooManyAttempts: {
    title: "throttledTitle",
    withClock: "throttledWithClock",
    withoutClock: "throttledWithoutClock",
  },
};

export function LockoutNotice({
  reason,
  seconds,
  onExpire,
}: {
  reason: TimedReason;
  /** From the API's `Retry-After`; `null` when it said nothing. */
  seconds: number | null;
  onExpire: () => void;
}) {
  const t = useTranslations("Auth");
  const copy = COPY[reason];

  // Initial state only, never synced from the prop afterwards. The parent
  // remounts this via `key` on each new failure, which is what makes a
  // fresh wait start a fresh clock — cheaper and less error-prone than an
  // effect that mirrors a prop into state on every change.
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining === null) {
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(timer);
          // Announced from the tick rather than from a second effect
          // watching for zero: one place decides the countdown is over.
          onExpire();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // Deliberately not re-created per tick — the interval owns its own
    // countdown and clears itself at zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StatusMessage tone="warning" title={t(copy.title)}>
      {remaining === null ? (
        <p>{t(copy.withoutClock)}</p>
      ) : (
        <p className="flex flex-wrap items-baseline gap-2">
          <span>{t(copy.withClock)}</span>
          <time
            // Mono, tabular: the digits must not shift the line as they
            // change. Chapter 4 §4.3 assigns IBM Plex Mono to numeric data.
            dir="ltr"
            aria-live="off"
            // Not tinted warning: at this size that hue measures 2.45:1 on
            // the panel. The panel's bar already says which state this is.
            className="font-mono text-h4 font-bold tabular-nums text-[color:var(--color-text-primary)]"
          >
            {formatCountdown(remaining)}
          </time>
        </p>
      )}
    </StatusMessage>
  );
}
