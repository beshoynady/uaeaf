"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { ContactIcon, type ContactIconName } from "@/components/ui/contact-icon";

/**
 * The public message form.
 *
 * Figma `1192:2272` (AR) / `1475:2582` (EN). Field labels and placeholders are
 * interface strings, not editorial content, so they come from the translation
 * catalogues; the heading, the consent sentence and the option labels are the
 * record's and are passed in.
 *
 * Submits through `/api/contact`, a same-origin route handler, rather than
 * straight to the API: the browser would otherwise need a CORS grant on the
 * one unauthenticated write route on the platform, and the API's origin would
 * become public knowledge for no gain.
 *
 * Validation runs on submit rather than on every keystroke — WCAG 3.3.1 asks
 * for errors to be identified in text, not for a field to argue with someone
 * who is still typing in it. Each message is tied to its control with
 * `aria-describedby`, the control carries `aria-invalid`, and focus moves to
 * the first field that failed.
 */

type FieldName = "senderName" | "senderPhone" | "senderEmail" | "messageType" | "subject" | "messageBody";

export type MessageTypeOption = { value: string; label: string };

const REQUIRED: readonly FieldName[] = ["senderName", "senderEmail", "messageType", "messageBody"];

const CONTROL_BASE =
  "w-full rounded-[var(--radius-md)] border bg-[color:var(--color-surface-base)] px-3.5 py-3 text-body text-[color:var(--color-text-primary)] shadow-[inset_0_2px_6px_rgb(0_0_0/0.07)] placeholder:text-[color:var(--color-text-secondary)]";

/** A failed field is marked by its border as well as by its message, so the
 *  state survives WCAG 1.4.1 — the message is the primary signal and the
 *  colour is the secondary one, never the reverse. */
const controlClass = (invalid: boolean) =>
  `${CONTROL_BASE} ${
    invalid
      ? "border-[color:var(--color-semantic-error)]"
      : "border-[color:var(--color-border-default)]"
  }`;

export function ContactForm({
  title,
  consentNote,
  messageTypes,
  headingId,
}: {
  title: string;
  consentNote: string | null;
  messageTypes: readonly MessageTypeOption[];
  headingId: string;
}) {
  const t = useTranslations("Contact.form");
  const formId = useId();
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const fieldId = (name: FieldName) => `${formId}-${name}`;
  const errorId = (name: FieldName) => `${formId}-${name}-error`;

  const describedBy = (name: FieldName) => (errors[name] ? errorId(name) : undefined);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: FieldName) => String(data.get(name) ?? "").trim();

    const found: Partial<Record<FieldName, string>> = {};
    for (const name of REQUIRED) {
      if (!value(name)) found[name] = t("errors.required");
    }
    const email = value("senderEmail");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      found.senderEmail = t("errors.email");
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      setState("idle");
      const first = Object.keys(found)[0] as FieldName;
      form.querySelector<HTMLElement>(`#${CSS.escape(fieldId(first))}`)?.focus();
      return;
    }

    setState("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageType: value("messageType"),
          senderName: value("senderName"),
          senderEmail: email,
          senderPhone: value("senderPhone") || undefined,
          subject: value("subject") || undefined,
          messageBody: value("messageBody"),
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  const field = (name: FieldName, control: React.ReactNode, required = false) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={fieldId(name)} className="text-label text-[color:var(--color-text-primary)]">
        {t(`labels.${name}`)}
        {required ? (
          <span className="font-bold text-[color:var(--color-semantic-error)]">
            {" *"}
            <span className="sr-only">{t("requiredHint")}</span>
          </span>
        ) : null}
      </label>
      {control}
      {errors[name] ? (
        <p id={errorId(name)} className="text-caption text-[color:var(--color-semantic-error)]">
          {errors[name]}
        </p>
      ) : null}
    </div>
  );

  const icon = (name: ContactIconName) => (
    <ContactIcon
      name={name}
      className="pointer-events-none absolute inset-y-0 end-3.5 my-auto size-4.5 text-[color:var(--color-text-secondary)]"
    />
  );

  return (
    <section
      aria-labelledby={headingId}
      data-testid="contact-form"
      className="flex flex-col gap-6 rounded-[var(--radius-lg)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-5 shadow-[var(--elevation-card)] md:p-8 xl:p-10"
    >
      <h2 id={headingId} className="text-h2">
        {title}
      </h2>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 md:flex-row">
          {field(
            "senderName",
            <div className="relative">
              <input
                id={fieldId("senderName")}
                name="senderName"
                type="text"
                maxLength={200}
                autoComplete="name"
                placeholder={t("placeholders.senderName")}
                aria-invalid={Boolean(errors.senderName)}
                aria-describedby={describedBy("senderName")}
                className={`${controlClass(Boolean(errors.senderName))} pe-11 ${TRANSITION} ${FOCUS}`}
              />
              {icon("user")}
            </div>,
            true,
          )}
          {field(
            "senderPhone",
            // `dir="ltr"` on the wrapper as well as the control: the icon is
            // placed at the wrapper's inline end, and a Latin-only field inside
            // an RTL page would otherwise put the icon exactly where the text
            // starts. Measured collision, not a precaution.
            <div dir="ltr" className="relative">
              <input
                id={fieldId("senderPhone")}
                name="senderPhone"
                type="tel"
                dir="ltr"
                maxLength={30}
                autoComplete="tel"
                placeholder={t("placeholders.senderPhone")}
                className={`${controlClass(false)} pe-11 text-start ${TRANSITION} ${FOCUS}`}
              />
              {icon("phone")}
            </div>,
          )}
        </div>

        {field(
          "senderEmail",
          <div dir="ltr" className="relative">
            <input
              id={fieldId("senderEmail")}
              name="senderEmail"
              type="email"
              dir="ltr"
              maxLength={254}
              autoComplete="email"
              placeholder={t("placeholders.senderEmail")}
              aria-invalid={Boolean(errors.senderEmail)}
              aria-describedby={describedBy("senderEmail")}
              className={`${controlClass(Boolean(errors.senderEmail))} pe-11 text-start ${TRANSITION} ${FOCUS}`}
            />
            {icon("mail")}
          </div>,
          true,
        )}

        <div className="flex flex-col gap-6 md:flex-row">
          {field(
            "messageType",
            <div className="relative">
              <select
                id={fieldId("messageType")}
                name="messageType"
                defaultValue=""
                aria-invalid={Boolean(errors.messageType)}
                aria-describedby={describedBy("messageType")}
                className={`${controlClass(Boolean(errors.messageType))} appearance-none pe-11 ${TRANSITION} ${FOCUS}`}
              >
                <option value="" disabled>
                  {t("placeholders.messageType")}
                </option>
                {messageTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {icon("chevronDown")}
            </div>,
            true,
          )}
          {field(
            "subject",
            <div className="relative">
              <input
                id={fieldId("subject")}
                name="subject"
                type="text"
                maxLength={200}
                placeholder={t("placeholders.subject")}
                className={`${controlClass(false)} pe-11 ${TRANSITION} ${FOCUS}`}
              />
              {icon("tag")}
            </div>,
          )}
        </div>

        {field(
          "messageBody",
          <textarea
            id={fieldId("messageBody")}
            name="messageBody"
            rows={4}
            maxLength={5000}
            placeholder={t("placeholders.messageBody")}
            aria-invalid={Boolean(errors.messageBody)}
            aria-describedby={describedBy("messageBody")}
            className={`${controlClass(Boolean(errors.messageBody))} min-h-[110px] resize-y ${TRANSITION} ${FOCUS}`}
          />,
          true,
        )}

        {/* Flat, not a gradient: ADR-0065 R2 — the two stops of the old
            gradient were both Federation Green, so the difference between
            them said nothing. The colour is here because this is the page's
            action (D2), which is the only reason it is here. */}
        <button
          type="submit"
          disabled={state === "sending"}
          aria-busy={state === "sending"}
          className={`flex min-h-13 w-full items-center justify-center gap-2.5 rounded-[var(--button-radius)] bg-[color:var(--color-brand-primary)] text-body font-bold text-[color:var(--color-text-on-brand)] hover:bg-[color:var(--color-green-600)] active:bg-[color:var(--color-green-700)] disabled:cursor-progress disabled:opacity-70 ${TRANSITION} ${FOCUS}`}
        >
          {state === "sending" ? (
            // The label changes as well as the spinner turning: a pending
            // state carried only by motion is invisible under
            // `prefers-reduced-motion` and to anyone not watching the button.
            <span
              aria-hidden="true"
              className="spin size-4.5 rounded-full border-2 border-current border-t-transparent"
            />
          ) : null}
          {state === "sending" ? t("sending") : t("submit")}
        </button>

        {/* WCAG 4.1.3: the outcome has to reach a screen reader without moving
            focus, and it has to be in the DOM before it has text, or the
            announcement is missed. The icon is a second channel so the outcome
            does not rest on colour alone (1.4.1). */}
        <p
          role="status"
          aria-live="polite"
          className={`text-body-sm text-[color:var(--color-text-primary)] empty:hidden ${
            state === "idle"
              ? ""
              : `rounded-[var(--radius-md)] border-s-4 px-4 py-3 ${
                  state === "failed"
                    ? "border-[color:var(--color-semantic-error)] bg-[color-mix(in_srgb,var(--color-semantic-error)_8%,var(--color-surface-raised))]"
                    : "border-[color:var(--color-semantic-success)] bg-[color-mix(in_srgb,var(--color-semantic-success)_8%,var(--color-surface-raised))]"
                }`
          }`}
        >
          {state === "sent" ? t("sent") : state === "failed" ? t("failed") : ""}
        </p>

        {consentNote ? (
          <p className="text-caption text-[color:var(--color-text-secondary)]">{consentNote}</p>
        ) : null}
      </form>
    </section>
  );
}
