"use client";

import { memo } from "react";

import { useTranslations } from "next-intl";
import { HERO_CTA_LABEL_MAX, isInternalHeroUrl } from "@uaeaf/content/hero";
import { TextField } from "@/components/auth/text-field";
import type { CtaDraft, FieldError } from "@/lib/admin/homepage-hero";
import { errorAt, fieldMessage } from "./field-errors";
import { LocalizedTextPair } from "./localized-text-pair";
import { SwitchField } from "./switch-field";

/**
 * One of a slide's two buttons.
 *
 * Its role follows from how many are visible, as the site draws them (owner
 * decision 2026-09-16): with both visible the first is the primary button and
 * the second a text link; with one visible, whichever it is, it is the primary
 * button. The badge says which, so the editor is never surprised by the site.
 *
 * Hiding a button keeps its words and link, so switching it back on restores
 * them. The link hint changes as it is typed: an internal path gets the
 * language added for it, an external one opens in a new tab.
 */
const CtaCardView = ({
  id,
  slot,
  value,
  otherVisible,
  onChange,
  errors,
  errorPath,
}: {
  id: string;
  slot: "primary" | "secondary";
  value: CtaDraft;
  otherVisible: boolean;
  onChange: (value: CtaDraft) => void;
  errors: readonly FieldError[];
  errorPath: string;
}) => {
  const t = useTranslations("HomepageHero");
  const role = !value.isVisible ? null : otherVisible && slot === "secondary" ? t("roleLink") : t("rolePrimary");
  const url = value.url.trim();
  const urlHint = !url ? t("urlHelp") : isInternalHeroUrl(url) ? t("urlInternal") : url.startsWith("https://") ? t("urlExternal") : t("urlHelp");

  return (
    <fieldset className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] p-4">
      <legend className="flex items-center gap-2 px-1 text-label font-medium text-[color:var(--color-text-primary)]">
        {slot === "primary" ? t("buttonPrimary") : t("buttonSecondary")}
        {role ? (
          <span className="rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] px-1.5 py-0.5 text-caption text-[color:var(--color-text-secondary)]">
            {role}
          </span>
        ) : null}
      </legend>
      <SwitchField
        id={`${id}-visible`}
        label={t("buttonVisible")}
        checked={value.isVisible}
        onChange={(isVisible) => onChange({ ...value, isVisible })}
        hint={value.isVisible && !otherVisible ? t("loneButton") : undefined}
      />
      <LocalizedTextPair
        id={`${id}-label`}
        label={t("buttonLabel")}
        value={value.label}
        onChange={(label) => onChange({ ...value, label })}
        limit={HERO_CTA_LABEL_MAX}
        linesHint={t("oneLine")}
        errors={errors}
        errorPath={`${errorPath}.label`}
      />
      <TextField
        id={`${id}-url`}
        label={t("buttonUrl")}
        dir="ltr"
        inputMode="url"
        value={value.url}
        hint={urlHint}
        error={fieldMessage(t, errorAt(errors, `${errorPath}.url`))}
        onChange={(event) => onChange({ ...value, url: event.target.value })}
      />
    </fieldset>
  );
};

// Memoised: the screen re-renders on every keystroke, and this part only has to
// when its own props change (the props it receives are kept stable for that).
export const CtaCard = memo(CtaCardView);
