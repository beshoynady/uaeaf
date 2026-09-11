"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { localized, type LocalizedText, type RoleResponse } from "@/lib/api/types";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-strength";
import { toggleSelection } from "@/lib/admin/permission-matrix";
import { StatusMessage } from "@/components/auth/status-message";
import { PasswordInput } from "@/components/auth/password-input";
import { TextField } from "@/components/auth/text-field";
import { SelectField } from "@/components/ui/select-field";
import { RequiredHint } from "@/components/ui/required-field";
import { BilingualField } from "@/components/admin/bilingual-field";
import type { AppLocale } from "@/i18n/routing";

/** One federation person, as this form needs them. */
export interface PersonOption {
  id: string;
  name: LocalizedText;
}

/**
 * Creating an account.
 *
 * Everything the account needs goes in one request: the name, the sign-in
 * credentials, the roles, and the optional link to the federation personnel
 * record. `POST /users` accepted only the first two until 2026-09-08, so an
 * account was created with no access and the roles were a second request —
 * and a failure between the two left an account that looks provisioned in
 * the directory and is not.
 *
 * The initial password is the one value an administrator has to carry out of
 * this screen, and it is never shown again. That is what the hint says,
 * because discovering it afterwards means resetting the account.
 */
export function CreateUserForm({
  roles,
  people,
  locale,
  onDone,
  onCancel,
}: {
  roles: readonly RoleResponse[];
  /** `null` when the signed-in administrator lacks `federationPersonnel:Read`.
   *  The picker is then absent with a reason rather than empty: an empty
   *  select says "there are no people", which is a different statement and a
   *  false one. */
  people: readonly PersonOption[] | null;
  locale: AppLocale;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("UsersDirectory");
  const errors = useTranslations("WriteErrors");
  const router = useRouter();

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<Set<string>>(() => new Set());
  const [personId, setPersonId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function submit() {
    if (nameAr.trim().length === 0 || nameEn.trim().length === 0) {
      setErrorKey("nameRequired");
      return;
    }

    setSaving(true);
    setErrorKey(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: { ar: nameAr.trim(), en: nameEn.trim() },
          // Sent as typed. The route lowercases and trims it the way the
          // schema does, in one place, so the form's idea of an address and
          // the unique index's cannot drift apart.
          email,
          password,
          roleIds: [...roleIds],
          personId: personId.length > 0 ? personId : null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setErrorKey(body?.code ?? "serviceUnavailable");
        setSaving(false);
        return;
      }

      router.refresh();
      onDone();
    } catch {
      setErrorKey("serviceUnavailable");
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-6 rounded-[var(--card-radius)] border border-[color:var(--card-border)] bg-[color:var(--card-background)] px-5 py-5"
    >
      <h2 className="text-title font-bold text-[color:var(--color-text-primary)]">
        {t("formCreateTitle")}
      </h2>

      {errorKey ? (
        <StatusMessage tone="error" title={t("createFailedTitle")}>
          {/* A taken email is the one conflict this form can actually
              produce, so it names the field rather than saying "the data
              conflicts". */}
          {errorKey === "conflict"
            ? t("createConflict")
            : errors.has(errorKey)
              ? errors(errorKey)
              : errors("serviceUnavailable")}
        </StatusMessage>
      ) : null}

      <RequiredHint />

      <BilingualField
        id="user-name"
        labelAr={t("fieldNameAr")}
        labelEn={t("fieldNameEn")}
        valueAr={nameAr}
        valueEn={nameEn}
        onChangeAr={setNameAr}
        onChangeEn={setNameEn}
        disabled={saving}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="user-email"
          label={t("fieldEmail")}
          type="email"
          inputMode="email"
          autoComplete="off"
          hint={t("emailHint")}
          value={email}
          disabled={saving}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordInput
          id="user-password"
          label={t("fieldPassword")}
          autoComplete="new-password"
          hint={t("passwordHint", { min: MIN_PASSWORD_LENGTH })}
          value={password}
          disabled={saving}
          onValueChange={setPassword}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">
          {t("fieldRoles")}
        </legend>
        {roles.length === 0 ? (
          <p className="text-body-sm text-[color:var(--color-text-muted)]">{t("noRolesToAssign")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const checked = roleIds.has(role._id);
              return (
                <li key={role._id}>
                  <label
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 transition-colors duration-[var(--motion-duration-fast)] ${
                      checked
                        ? "border-[color:var(--color-brand-primary)] bg-[color:color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-surface-base))]"
                        : "border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-skeleton)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={() => setRoleIds((current) => toggleSelection(current, role._id))}
                      className="size-[18px] accent-[color:var(--color-brand-primary)]"
                    />
                    <span className="text-label text-[color:var(--color-text-primary)]">
                      {localized(role.name, locale)}
                    </span>
                    {role.isSystemRole ? (
                      <span className="text-caption text-[color:var(--color-text-muted)]">
                        {t("systemRoleShort")}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("rolesHint")}</p>
      </fieldset>

      {people === null ? (
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("personHiddenHint")}</p>
      ) : (
        <div className="flex max-w-[420px] flex-col">
          {/* No `placeholder`: "no linked person" is an answer, not the
              absence of one, so it is a real option the reader can pick and
              pick again. `forms.css` distinguishes the two by whether the
              empty option is `disabled`, which keeps the label floated here
              rather than resting on top of the word it would cover. */}
          <SelectField
            id="user-person"
            label={t("fieldPerson")}
            value={personId}
            disabled={saving}
            hint={t("personHint")}
            onChange={(event) => setPersonId(event.target.value)}
            options={[
              { value: "", label: t("personNone") },
              ...people.map((person) => ({
                value: person.id,
                label: localized(person.name, locale),
              })),
            ]}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-5 text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--button-disabled-text)] active:bg-[color:var(--button-primary-background-pressed)]"
        >
          {saving ? t("saving") : t("createSubmit")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 text-label text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
        >
          {t("formCancel")}
        </button>
      </div>
    </form>
  );
}
