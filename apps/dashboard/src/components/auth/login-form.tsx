"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { TextField } from "./text-field";
import { RequiredHint } from "@/components/ui/required-field";
import { PasswordInput } from "./password-input";
import { StatusMessage } from "./status-message";
import { LockoutNotice, type TimedReason } from "./lockout-notice";
import { SubmitButton } from "./submit-button";
import type { AppLocale } from "@/i18n/routing";

/** The four codes the BFF login route can return. Anything unrecognised
 *  falls back to the availability message rather than rendering a raw key. */
const ERROR_KEYS = new Set([
  "invalidCredentials",
  "accountLocked",
  "tooManyAttempts",
  "serviceUnavailable",
]);

/** Which of the four are timed rather than wrong. The distinction drives
 *  both the colour and whether the button stays disabled — see
 *  StatusMessage for why a timed refusal is not painted red. */
const TIMED = new Set<string>(["accountLocked", "tooManyAttempts"]);

interface Failure {
  code: string;
  retryAfterSeconds: number | null;
}

export function LoginForm({ locale }: { locale: AppLocale }) {
  const t = useTranslations("Login");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Bumped on every rejection, purely to key the timed notice so a new
   *  wait remounts it with a new starting value. */
  const [attempt, setAttempt] = useState(0);

  const clearFailure = useCallback(() => setFailure(null), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setFailure(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          locale,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          code?: string;
          retryAfterSeconds?: number | null;
        } | null;
        setFailure({
          code: body?.code && ERROR_KEYS.has(body.code) ? body.code : "serviceUnavailable",
          retryAfterSeconds:
            typeof body?.retryAfterSeconds === "number" ? body.retryAfterSeconds : null,
        });
        setAttempt((current) => current + 1);
        setSubmitting(false);
        return;
      }

      const { locale: target } = (await response.json()) as { locale: AppLocale };
      // A full document load, not a client-side push: the session, language
      // and theme cookies were all just set, and `lang`/`dir`/`data-theme`
      // are rendered on <html> by the server. A soft navigation would keep
      // the old document — an Arabic user could land on an LTR shell.
      window.location.assign(`/${target}`);
    } catch {
      setFailure({ code: "serviceUnavailable", retryAfterSeconds: null });
      setSubmitting(false);
    }
  }

  const timedOut = failure !== null && TIMED.has(failure.code);
  // Only a countdown we can actually run is allowed to disable the button.
  // With no `Retry-After` the wait is unknown, and a permanently dead button
  // would leave the user with no way to try again after the lock lapses.
  const waiting = timedOut && failure.retryAfterSeconds !== null && failure.retryAfterSeconds > 0;

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6" noValidate>
      {timedOut ? (
        <LockoutNotice
          key={attempt}
          reason={failure.code as TimedReason}
          seconds={failure.retryAfterSeconds}
          onExpire={clearFailure}
        />
      ) : failure ? (
        <StatusMessage tone="error" title={t("errorTitle")}>
          {t(failure.code)}
        </StatusMessage>
      ) : null}

      {/* §F.4: once, at the top, rather than a sentence repeated invisibly
          under every field it applies to. */}
      <RequiredHint />

      <TextField
        id="email"
        label={t("email")}
        type="email"
        autoComplete="username"
        required
        inputMode="email"
        autoFocus
      />

      <div className="flex flex-col gap-2">
        <PasswordInput id="password" label={t("password")} autoComplete="current-password" />
        <a
          href={`/${locale}/forgot-password`}
          className="self-start text-caption font-medium text-[color:var(--color-text-link)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)]"
        >
          {t("forgotPassword")}
        </a>
      </div>

      <SubmitButton busy={submitting} disabled={waiting} busyLabel={t("submitting")}>
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
