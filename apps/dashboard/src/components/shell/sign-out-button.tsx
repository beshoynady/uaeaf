"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";

export function SignOutButton({ locale }: { locale: AppLocale }) {
  const t = useTranslations("Shell");
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    // The route clears the cookies whether or not the upstream revoke
    // succeeds, so this navigation always lands on a genuinely signed-out
    // login screen rather than bouncing straight back in.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign(`/${locale}/login`);
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={signingOut}
      className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 text-label font-medium text-[color:var(--color-text-secondary)] transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:text-[color:var(--color-text-disabled)] active:bg-[color:var(--color-surface-skeleton)]"
    >
      {signingOut ? t("signingOut") : t("signOut")}
    </button>
  );
}
