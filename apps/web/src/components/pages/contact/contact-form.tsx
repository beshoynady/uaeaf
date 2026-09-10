"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { FIELD_EDGE, GLASS_EDGE, LIFT, PANEL, PANEL_FILL } from "@/components/ui/surface";
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

/**
 * A field reads as recessed at rest and rises to meet the cursor.
 *
 * The inset shadow is the resting state: the control is a well cut into the
 * panel, which is what says "type here" before any label is read. On focus it
 * inverts — the inset goes, a soft outer shadow arrives, and the border
 * strengthens — so the active field lifts out of the panel it sits in. The
 * transition runs on `box-shadow` and `border-color` only, both of which the
 * compositor can handle, and its duration is the `fast` token, so the global
 * reduced-motion reset zeroes it along with everything else.
 *
 * ── The label sits on the edge ─────────────────────────────────────────────
 *
 * An earlier version of this file argued against a floating label, and that
 * argument still holds — for the pattern it was aimed at. The one that fails
 * is the one that *replaces* the label with a placeholder: the reader fills
 * six fields, comes back to check the third, and the only thing that said
 * what it was has been overwritten by their own answer.
 *
 * This is the other pattern. The label travels to the top edge and stays
 * there, readable while typing, while correcting, and while reading the
 * finished form back — and the outline opens a gap for it rather than the
 * label sitting on top of a line. The DOM order is unchanged, which Chapter 8
 * L2 §F.1 makes a MUST: only the painted position moves.
 *
 * The geometry and the notch live in `styles/forms.css`, because they are one
 * mechanism shared by every field on the site rather than this form's
 * decoration. What stays here is the part that is stateful: which edge a
 * field wears when it is resting, hovered, focused or wrong.
 */
const CONTROL_SHAPE =
  "field-control text-body transition-[box-shadow,border-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)]";

/**
 * The two complete field appearances, written out rather than assembled.
 *
 * Each string carries its own hover, active and focus states end to end. That
 * is not repetition for its own sake: `interaction-state-contract.spec.ts`
 * resolves module constants but cannot resolve a function, so a `hover:` in
 * one constant and its matching `active:` inside a helper reads to the guard
 * as a control that lights up under a pointer and does nothing when pressed
 * — which is exactly what it is meant to catch, and it caught this.
 *
 * `active` anticipates `focus` rather than inventing a third look: the press
 * already shows the border the field is about to settle on, so pressing and
 * landing are one movement instead of two jumps.
 */
const CONTROL_RESTING = `${CONTROL_SHAPE} ${FIELD_EDGE}`;

/** A failed field is marked by its border as well as by its message, so the
 *  state survives WCAG 1.4.1 — the message is the primary signal and the
 *  colour is the secondary one, never the reverse. */
const CONTROL_INVALID = `${CONTROL_SHAPE} border-[color:var(--color-semantic-error)] hover:border-[color:var(--color-semantic-error)] active:border-[color:var(--color-semantic-error)] focus:border-[color:var(--color-semantic-error)]`;

const controlClass = (invalid: boolean) => (invalid ? CONTROL_INVALID : CONTROL_RESTING);

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

  const field = (
    name: FieldName,
    control: React.ReactNode,
    required = false,
    shape: "control" | "textarea" = "control",
  ) => (
    <div
      className={`field flex min-w-0 flex-1 flex-col gap-1.5${
        shape === "textarea" ? " field-textarea" : ""
      }${errors[name] ? " field-invalid" : ""}`}
    >
      {/* First in the DOM (Chapter 8 L2 §F.1), painted onto the field's edge
          by `forms.css`. `text-label` is the resting size; the floated size is
          that scaled by the label/body type ratio, which keeps it above
          Chapter 4's 13px floor. */}
      <label htmlFor={fieldId(name)} className="field-label text-body">
        {t(`labels.${name}`)}
        {required ? (
          // §F.4 requires the `*` and `aria-required` together. It is drawn in
          // the primary ink rather than the error red: red at 13px bold
          // measures 3.95:1 on the dark theme's panel and fails 1.4.3, and the
          // glyph carries the meaning without the colour in any case (1.4.1).
          // The error red stays for actual errors, where it means something.
          <span className="font-bold text-[color:var(--color-text-primary)]">
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
      // `elevation-dropdown` at rest rather than `elevation-card`: this panel
      // is the page's primary surface, it sits on a ground only 1.04:1 away
      // from its own fill, and the card step (0 1px 2px at 6%) left it reading
      // as a flat area of the page rather than as a raised object.
      className={`flex h-full flex-col gap-6 ${PANEL} ${GLASS_EDGE} p-5 md:p-8 xl:p-10`}
    >
      <h2 id={headingId} className="text-h2">
        {title}
      </h2>

      <form noValidate onSubmit={onSubmit} className={`flex flex-col gap-6 ${PANEL_FILL}`}>
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
          "textarea",
        )}

        {/* Flat, not a gradient: ADR-0065 R2 — the two stops of the old
            gradient were both Federation Green, so the difference between
            them said nothing. The colour is here because this is the page's
            action (D2), which is the only reason it is here. */}
        <button
          type="submit"
          disabled={state === "sending"}
          aria-busy={state === "sending"}
          // Four felt states, not four colours. Hover raises the button on the
          // ascent vector and deepens its shadow; active drops it flat again,
          // which is what a press is; disabled removes both, because a control
          // that lifts under the cursor while refusing the click is lying.
          // `.lift` carries the rise and the elevation cross-fade — the same
          // response every other raised object on the site gives, along the
          // motif's ascent vector rather than straight up (ADR-0059 §D7). It
          // holds its own reduced-motion and disabled behaviour, so the
          // reader who turns motion off still gets every colour change and a
          // button mid-request stops answering the pointer entirely.
          className={`flex min-h-13 w-full items-center justify-center gap-2.5 rounded-[var(--button-radius)] bg-[color:var(--color-brand-primary)] text-body font-bold text-[color:var(--color-text-on-brand)] ${LIFT} transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:bg-[color:var(--color-green-600)] active:bg-[color:var(--color-green-700)] disabled:cursor-progress disabled:opacity-70 ${FOCUS}`}
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
            announcement is missed. The sentence itself is what carries the
            outcome — it says plainly whether the message was sent — so the
            colour is the secondary channel and 1.4.1 holds without it.

            A full hairline in the semantic colour rather than a thick rail on
            one edge: the tinted ground already distinguishes the two states,
            and the rail was doing nothing it was not already doing while
            reading as a stock alert component. */}
        <p
          role="status"
          aria-live="polite"
          className={`text-body-sm text-[color:var(--color-text-primary)] empty:hidden ${
            state === "idle"
              ? ""
              : `rounded-[var(--radius-md)] border px-4 py-3 ${
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
