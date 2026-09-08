"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LocalizedText, RoleResponse } from "@/lib/api/types";
import { StatusMessage } from "@/components/auth/status-message";
import { BilingualField } from "@/components/admin/bilingual-field";

/**
 * A role's own record — its name and its description.
 *
 * Separate from the permission matrix on purpose. The matrix is the role's
 * effect and is edited by the hundred; this is its identity and is edited
 * once. Putting them in one form would mean a creation dialog containing a
 * 164-box grid, and a rename that had to re-submit every permission.
 *
 * So creation makes a role with no permissions at all, and says so. The
 * administrator names it here and grants from the matrix, which is also the
 * order in which the decision is actually made.
 */
export function RoleEditor({
  mode,
  role,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  /** Required in edit mode; the form starts from what is stored. */
  role?: RoleResponse;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("RolesWorkbench");
  const errors = useTranslations("WriteErrors");
  const router = useRouter();

  const [nameAr, setNameAr] = useState(role?.name.ar ?? "");
  const [nameEn, setNameEn] = useState(role?.name.en ?? "");
  const [descriptionAr, setDescriptionAr] = useState(role?.description?.ar ?? "");
  const [descriptionEn, setDescriptionEn] = useState(role?.description?.en ?? "");
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const name = { ar: nameAr.trim(), en: nameEn.trim() };
  const complete = name.ar.length > 0 && name.en.length > 0;

  // Both halves blank means "no description", which is a real stored state
  // and is written as null. A half-filled pair is rejected upstream by
  // `@MinLength(1)` on each side, so it is treated as no description too
  // rather than forwarded to fail.
  const description: LocalizedText | null =
    descriptionAr.trim().length > 0 && descriptionEn.trim().length > 0
      ? { ar: descriptionAr.trim(), en: descriptionEn.trim() }
      : null;

  async function submit() {
    if (!complete) {
      setErrorKey("nameRequired");
      return;
    }

    setSaving(true);
    setErrorKey(null);

    const request =
      mode === "create"
        ? { url: "/api/admin/roles", method: "POST", body: { name, permissionIds: [] } }
        : {
            url: `/api/admin/roles/${role?._id}/name`,
            method: "PATCH",
            body: { name, description },
          };

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request.body),
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
      className="flex flex-col gap-6 px-5 py-5"
    >
      <h3 className="text-h4 font-bold text-[color:var(--color-text-primary)]">
        {mode === "create" ? t("formCreateTitle") : t("formEditTitle")}
      </h3>

      {errorKey ? (
        <StatusMessage tone="error" title={t("actionFailedTitle")}>
          {errors.has(errorKey) ? errors(errorKey) : errors("serviceUnavailable")}
        </StatusMessage>
      ) : null}

      <BilingualField
        id="role-name"
        labelAr={t("fieldNameAr")}
        labelEn={t("fieldNameEn")}
        valueAr={nameAr}
        valueEn={nameEn}
        onChangeAr={setNameAr}
        onChangeEn={setNameEn}
        disabled={saving}
        required
      />

      {mode === "edit" ? (
        <BilingualField
          id="role-description"
          multiline
          labelAr={t("fieldDescriptionAr")}
          labelEn={t("fieldDescriptionEn")}
          valueAr={descriptionAr}
          valueEn={descriptionEn}
          onChangeAr={setDescriptionAr}
          onChangeEn={setDescriptionEn}
          hint={t("descriptionHint")}
          disabled={saving}
        />
      ) : (
        <StatusMessage tone="info" title={t("createHint")} />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-[var(--button-radius)] bg-[color:var(--button-primary-background)] px-5 text-label font-medium text-[color:var(--button-primary-text)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--button-primary-background-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:bg-[color:var(--button-disabled-background)] disabled:text-[color:var(--button-disabled-text)] active:bg-[color:var(--button-primary-background-pressed)]"
        >
          {saving ? t("saving") : mode === "create" ? t("createSubmit") : t("saveDetails")}
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
