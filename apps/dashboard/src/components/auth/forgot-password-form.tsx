"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { TextField } from "./text-field";
import { RequiredHint } from "@/components/ui/required-field";
import { StatusMessage } from "./status-message";
import { SubmitButton } from "./submit-button";
import type { AppLocale } from "@/i18n/routing";

const ERROR_KEYS = new Set(["invalidEmail", "tooManyAttempts", "serviceUnavailable"]);

/**
 * Step one of recovery: name the account.
 *
 * On success the form is replaced by a confirmation panel that deliberately
 * does not say whether the address is registered — the same panel, the same
 * words, for a real administrator and for a guessed address. That is the
 * whole security value of this screen, and it is why the API is required to
 * answer 202 either way (lib/auth/password-reset.ts).
 *
 * The confirmation replaces the form rather than sitting above it: leaving
 * a live "send" button under a "we sent it" message invites the double-send
 * that makes people wonder which link is the good one.
 */
export function ForgotPasswordForm({ locale }: { locale: AppLocale }) {
  const t = useTranslations("ForgotPassword");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setSubmitting(true);
    setErrorKey(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setErrorKey(body?.code && ERROR_KEYS.has(body.code) ? body.code : "serviceUnavailable");
        setSubmitting(false);
        return;
      }

      setSentTo(email);
    } catch {
      setErrorKey("serviceUnavailable");
      setSubmitting(false);
    }
  }

  if (sentTo !== null) {
    return (
      <div className="flex flex-col gap-6">
        <StatusMessage tone="info" title={t("sentTitle")}>
          <p>
            {t("sentBody")}{" "}
            <span dir="ltr" className="font-medium text-[color:var(--color-text-primary)]">
              {sentTo}
            </span>
          </p>
        </StatusMessage>
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("sentHint")}</p>
        <a
          href={`/${locale}/login`}
          className="flex h-12 w-full items-center justify-center rounded-[var(--button-radius)] border border-[color:var(--color-border-default)] text-label font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
        >
          {t("backToLogin")}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6" noValidate>
      {errorKey ? (
        <StatusMessage tone={errorKey === "tooManyAttempts" ? "warning" : "error"} title={t("errorTitle")}>
          {t(errorKey)}
        </StatusMessage>
      ) : null}

      <RequiredHint />

      <TextField
        id="email"
        label={t("email")}
        type="email"
        autoComplete="username"
        required
        inputMode="email"
        autoFocus
        hint={t("emailHint")}
      />

      <SubmitButton busy={submitting} busyLabel={t("submitting")}>
        {t("submit")}
      </SubmitButton>

      {/* The way back lives here rather than under the card, so the sent
          state can replace it with its own button instead of showing two
          links to the same place. */}
      <p className="text-center text-body-sm text-[color:var(--color-text-secondary)]">
        {t("rememberedPrefix")}{" "}
        <a
          href={`/${locale}/login`}
          className="font-medium text-[color:var(--color-text-link)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)]"
        >
          {t("backToLogin")}
        </a>
      </p>
    </form>
  );
}
