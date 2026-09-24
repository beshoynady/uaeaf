"use client";

import { useState } from "react";

/**
 * Share, with the browser's own sheet where there is one.
 *
 * -- Three outcomes, two of which are successes -----------------------------
 *
 * 1. `navigator.share` exists and the reader picks a destination. Done; this
 *    says nothing, because the sheet already did.
 * 2. `navigator.share` exists and the reader dismisses the sheet. That rejects
 *    with `AbortError`, which is a **normal outcome** -- they changed their
 *    mind. Reporting it as a failure would be telling someone their own
 *    decision went wrong.
 * 3. No `navigator.share`, or it failed for a real reason: the link goes to
 *    the clipboard and a polite live region says so. Polite rather than
 *    assertive, because nothing is wrong and nothing needs interrupting.
 *
 * The confirmation clears itself after a few seconds so the control returns to
 * its resting label rather than claiming forever that something just happened.
 */

const CONFIRMATION_MS = 2600;

export const ShareButton = ({
  url,
  title,
  label,
  copiedLabel,
}: {
  url: string;
  title: string;
  label: string;
  copiedLabel: string;
}) => {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    // A caller may hand us a path rather than an absolute URL: a component
    // that first renders on the server has no `window` to take an origin from.
    // Here, inside a press handler, there always is one.
    const absolute = /^https?:\/\//i.test(url) ? url : `${window.location.origin}${url}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url: absolute });
        return;
      } catch {
        // Dismissed, or unavailable in this context. Either way the copy below
        // is still a useful thing to have happened.
      }
    }

    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), CONFIRMATION_MS);
    } catch {
      // No clipboard permission. The link is on screen in the address bar of
      // the platform tab the reader can open; nothing useful to say here.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--vs-radius-pill)] px-5 text-body-sm font-semibold transition-colors duration-[var(--motion-duration-fast)] hover:bg-[rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vs-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--vs-bg)]"
        style={{ boxShadow: "inset 0 0 0 1px var(--vs-hairline)", color: "var(--vs-text)" }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5.5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="18.5" r="2.5" />
          <path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" />
        </svg>
        {copied ? copiedLabel : label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
};
