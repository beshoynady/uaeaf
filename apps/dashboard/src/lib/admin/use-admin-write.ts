"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * One write to the API, and what to say when it fails.
 *
 * -- Why a failure is never silent ------------------------------------------
 *
 * Acting on `response.ok` alone and discarding the body is a failure mode this
 * project has already shipped once: the form keeps the typed values, nothing
 * moves, and the editor reads that as success. So every write reads the route
 * handler's `code` and puts the matching `WriteErrors` line on screen, and
 * there is one place that does it rather than one per screen.
 *
 * -- `savedAsDraft` is not a plain failure ----------------------------------
 *
 * `POST /videos` always creates a draft; publishing is a second request. A
 * create that saved but could not publish leaves a real row in the list, and
 * reporting only "forbidden" would send the editor looking for work that is
 * actually there. The caller passes the sentence for that case, because only
 * it knows what was half-done.
 *
 * -- Why the caller gets the outcome back ------------------------------------
 *
 * The three screens do different things on success: the list redraws in place,
 * the forms navigate away. A hook that navigated would decide that for all of
 * them.
 */
export type WriteOutcome = { ok: true } | { ok: false; savedAsDraft: boolean };

export const useAdminWrite = () => {
  const writeErrors = useTranslations("WriteErrors");
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const send = async (
    path: string,
    init: RequestInit = {},
    options: {
      /** Redraw the server-rendered list. Off for a form that is navigating
       *  away — the destination does its own read. */
      refresh?: boolean;
      /** What to say when the row was created but not published. */
      savedAsDraftMessage?: string;
    } = {},
  ): Promise<WriteOutcome> => {
    setBusy(true);
    setFailure(null);

    try {
      const response = await fetch(path, init);

      if (response.ok) {
        if (options.refresh !== false) router.refresh();
        return { ok: true };
      }

      const body = (await response.json().catch(() => null)) as
        | { code?: string; savedAsDraft?: boolean }
        | null;

      const savedAsDraft = body?.savedAsDraft === true;
      setFailure(
        savedAsDraft && options.savedAsDraftMessage
          ? options.savedAsDraftMessage
          : writeErrors(body?.code ?? "serviceUnavailable"),
      );
      if (savedAsDraft) router.refresh();
      return { ok: false, savedAsDraft };
    } catch {
      // Never reached the API at all: an offline browser, a dropped
      // connection. The same line as an unreachable service, because from the
      // editor's side it is the same situation.
      setFailure(writeErrors("serviceUnavailable"));
      return { ok: false, savedAsDraft: false };
    } finally {
      setBusy(false);
    }
  };

  /** `POST`/`PATCH` with a JSON body, spelled once. */
  const json = (body: unknown, method: "POST" | "PATCH" = "POST"): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { busy, failure, setFailure, send, json };
};
