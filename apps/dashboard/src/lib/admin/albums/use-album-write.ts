"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { isAlbumErrorCode } from "./error-codes";

/**
 * One album write, and what to say when it fails.
 *
 * `useAdminWrite` with two differences, and they are why this is not that
 * hook:
 *
 * - **The album screens have refusals of their own.** An incoherent
 *   affiliation (the API's 422), a photo order that no longer matches the
 *   album, an address already taken by another album. Their words live in the
 *   `Albums` namespace; everything else still reads `WriteErrors`, so a
 *   missing permission says exactly what it says on every other screen.
 * - **A save can land half way.** The album is written first, then published,
 *   then featured. When a later step is refused the record exists and holds
 *   what was typed — reporting only the refusal would send the editor looking
 *   for work that is actually there. The handler answers `saved: true` with
 *   the id, and the caller is given both.
 */
export type AlbumWriteOutcome =
  | { ok: true; body: unknown }
  | { ok: false; saved: boolean; id: string | null };

export const useAlbumWrite = () => {
  const t = useTranslations("Albums");
  const writeErrors = useTranslations("WriteErrors");
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const describe = (code: unknown): string =>
    isAlbumErrorCode(code) ? t(`errors.${code}`) : writeErrors(typeof code === "string" ? code : "serviceUnavailable");

  const send = async (
    path: string,
    init: RequestInit,
    options: { refresh?: boolean; savedMessage?: string } = {},
  ): Promise<AlbumWriteOutcome> => {
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch(path, init);
      const body: unknown = await response.json().catch(() => null);

      if (response.ok) {
        if (options.refresh !== false) router.refresh();
        return { ok: true, body };
      }

      const payload = (typeof body === "object" && body !== null ? body : {}) as {
        code?: unknown;
        saved?: unknown;
        id?: unknown;
      };
      const saved = payload.saved === true;
      const reason = describe(payload.code);
      setFailure(saved && options.savedMessage ? `${options.savedMessage} ${reason}` : reason);
      if (saved) router.refresh();
      return { ok: false, saved, id: typeof payload.id === "string" ? payload.id : null };
    } catch {
      // Never reached the server: the same sentence as an unreachable
      // service, because from the editor's side it is the same situation.
      setFailure(writeErrors("serviceUnavailable"));
      return { ok: false, saved: false, id: null };
    } finally {
      setBusy(false);
    }
  };

  const json = (body: unknown, method: "POST" | "PATCH" = "POST"): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { busy, failure, setFailure, send, json, describe };
};
