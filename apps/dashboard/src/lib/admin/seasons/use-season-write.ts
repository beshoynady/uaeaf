"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { isSeasonErrorCode } from "./error-codes";

/**
 * One season write, and what to say when it fails.
 *
 * `useAdminWrite`'s contract — a refusal is never silent, and the caller gets
 * the outcome back — with the difference `useAlbumWrite` has for the same
 * reason: the season screens have refusals of their own (a range that ends
 * before it starts, an overlap, a taken address). Their words live in
 * `Seasons.errors`; everything else reads `WriteErrors`, so a missing
 * permission or a policy that requires review says exactly what it says on
 * every other screen.
 */
export type SeasonWriteOutcome = { ok: true; body: unknown } | { ok: false; code: string | null };

export const useSeasonWrite = () => {
  const t = useTranslations("Seasons");
  const writeErrors = useTranslations("WriteErrors");
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const describe = (code: unknown): string =>
    isSeasonErrorCode(code) ? t(`errors.${code}`) : writeErrors(typeof code === "string" ? code : "serviceUnavailable");

  const send = async (
    path: string,
    init: RequestInit,
    options: { refresh?: boolean } = {},
  ): Promise<SeasonWriteOutcome> => {
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch(path, init);
      const body: unknown = await response.json().catch(() => null);

      if (response.ok) {
        if (options.refresh !== false) router.refresh();
        return { ok: true, body };
      }

      const code = (typeof body === "object" && body !== null ? (body as { code?: unknown }).code : null) ?? null;
      setFailure(describe(code));
      return { ok: false, code: typeof code === "string" ? code : null };
    } catch {
      // Never reached the server: the same sentence as an unreachable
      // service, because from the editor's side it is the same situation.
      setFailure(writeErrors("serviceUnavailable"));
      return { ok: false, code: null };
    } finally {
      setBusy(false);
    }
  };

  const json = (body: unknown, method: "POST" | "PATCH" = "POST"): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { busy, failure, setFailure, send, json };
};
