"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { PasswordInput } from "./password-input";
import { RequiredHint } from "@/components/ui/required-field";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { StatusMessage } from "./status-message";
import { SubmitButton } from "./submit-button";
import { assessPassword } from "@/lib/auth/password-strength";
import type { AppLocale } from "@/i18n/routing";

const ERROR_KEYS = new Set([
  "invalidToken",
  "weakPassword",
  "tooManyAttempts",
  "serviceUnavailable",
]);

/**
 * Step two of recovery: set the new password.
 *
 * The token arrives in the query string and is never rendered — it is the
 * credential for this request, and putting it on screen invites it into a
 * screenshot or a support ticket.
 *
 * On success the screen does not sign the user in. The reset revokes every
 * session for that account (the contract in lib/auth/password-reset.ts), so
 * the only truthful next step is signing in again with what they just
 * chose — which also proves to them that it worked.
 */
export function ResetPasswordForm({ token, locale }: { token: string; locale: AppLocale }) {
  const t = useTranslations("ResetPassword");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const assessment = useMemo(() => assessPassword(password), [password]);
  // Only compared once the user has actually started the second field, so
  // the mismatch error does not appear against an empty box.
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const submittable = assessment.meetsMinimum && confirmation === password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorKey(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setErrorKey(body?.code && ERROR_KEYS.has(body.code) ? body.code : "serviceUnavailable");
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setErrorKey("serviceUnavailable");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <StatusMessage tone="success" title={t("doneTitle")}>
          {t("doneBody")}
        </StatusMessage>
        <a
          href={`/${locale}/login`}
          className="flex h-12 w-full items-center justify-center rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--button-primary-background-pressed)]"
        >
          {t("signIn")}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6" noValidate>
      {errorKey ? (
        <StatusMessage
          tone={errorKey === "tooManyAttempts" ? "warning" : "error"}
          title={t("errorTitle")}
        >
          {t(errorKey)}
          {errorKey === "invalidToken" ? (
            <>
              {" "}
              <a
                href={`/${locale}/forgot-password`}
                className="font-medium text-[color:var(--color-text-link)] underline underline-offset-4"
              >
                {t("requestNewLink")}
              </a>
            </>
          ) : null}
        </StatusMessage>
      ) : null}

      <RequiredHint />

      <div className="flex flex-col gap-3">
        <PasswordInput
          id="password"
          label={t("newPassword")}
          autoComplete="new-password"
          value={password}
          onValueChange={setPassword}
        />
        <PasswordStrengthMeter assessment={assessment} length={password.length} />
      </div>

      <PasswordInput
        id="confirmation"
        label={t("confirmPassword")}
        autoComplete="new-password"
        value={confirmation}
        onValueChange={setConfirmation}
        error={mismatch ? t("mismatch") : null}
      />

      <SubmitButton busy={submitting} disabled={!submittable} busyLabel={t("submitting")}>
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
