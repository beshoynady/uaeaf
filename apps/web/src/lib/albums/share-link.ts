/**
 * Handing one link to the platform: its share sheet where there is one, the
 * clipboard where there is not, and a plain answer when neither is allowed.
 *
 * Four outcomes, and the caller shows something different for each:
 *
 * - `shared` — the platform's sheet took the link. Nothing more to say: the
 *   sheet itself was the feedback.
 * - `dismissed` — the reader closed the sheet (`AbortError`). That is their
 *   decision, so nothing is copied behind it and nothing is announced. This is
 *   where it parts from the video library's `ShareButton`, which copies after
 *   a dismissal too and so reports "copied" for an action the reader declined.
 * - `copied` — there is no sheet, or it failed for a reason that was not the
 *   reader's (the press's user activation spent, a permissions policy, a sheet
 *   already open), and the clipboard took the link.
 * - `manual` — the clipboard is missing (an insecure context, an embedded
 *   browser) or refused the write. The caller tells the reader where the link
 *   is instead.
 *
 * Every capability is detected on the object passed in, never assumed: most
 * desktop browsers have no `navigator.share`, and no insecure context has a
 * `navigator.clipboard`, whatever the DOM typings declare.
 */
export type ShareOutcome = "shared" | "dismissed" | "copied" | "manual";

/** The slice of `Navigator` read here. Every member is optional because any of
 *  them can be missing at run time; `navigator` itself satisfies it. */
export interface SharePlatform {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
  clipboard?: { writeText?: (text: string) => Promise<void> };
}

const isDismissal = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";

export const shareLink = async (url: string, platform: SharePlatform): Promise<ShareOutcome> => {
  const data: ShareData = { url };

  // `canShare` is itself missing in some browsers that have `share`; only an
  // explicit "no" skips the sheet.
  if (typeof platform.share === "function" && platform.canShare?.(data) !== false) {
    try {
      await platform.share(data);
      return "shared";
    } catch (error) {
      if (isDismissal(error)) return "dismissed";
    }
  }

  if (typeof platform.clipboard?.writeText === "function") {
    try {
      await platform.clipboard.writeText(url);
      return "copied";
    } catch {
      // Refused — no permission, or the document lost focus. The caller's
      // manual answer covers it, and the reader is told rather than left
      // guessing whether anything happened.
    }
  }

  return "manual";
};
