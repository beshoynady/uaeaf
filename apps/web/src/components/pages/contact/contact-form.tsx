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

/**
 * The four the federation cannot act on a message without.
 *
 * The telephone is required and the address is not, which is the reverse of
 * what this form shipped with. It is the owner's call and it matches how the
 * reply actually happens: `contactMessages.replyChannel` is `Email | Phone`,
 * and a citizen reachable on neither is a record nobody can close.
 *
 * The API enforces the same four (`CreateContactMessageDto`). Validating in
 * one place only would mean either a form that accepts what the API rejects,
 * or an API that accepts what no form can produce.
 */
const REQUIRED: readonly FieldName[] = ["senderName", "senderPhone", "messageType", "messageBody"];

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
 * The geometry and the notch live in `@uaeaf/design-tokens/css/forms.css`,
 * because they are one mechanism shared by every field on both applications
 * rather than this form's decoration. What stays here is the part that is
 * stateful: which edge a field wears when it is resting, hovered, focused or
 * wrong.
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

/**
 * A failed field is marked by its border as well as by its message, so the
 * state survives WCAG 1.4.1 — the message is the primary signal and the
 * colour is the secondary one, never the reverse.
 *
 * The bare `border` is load-bearing and was missing. Tailwind's
 * `border-[color:…]` sets a colour and no width, and the width lives in
 * `FIELD_EDGE`, which the invalid variant replaces rather than extends — so an
 * invalid control measured `border-top-width: 0px` and lost its outline
 * entirely at the moment it most needed one (WCAG 2.1 §1.4.11). Visible in the
 * geometry too: an invalid field stood 48px tall where a valid one stood 49.
 */
const CONTROL_INVALID = `${CONTROL_SHAPE} border border-[color:var(--color-semantic-error)] hover:border-[color:var(--color-semantic-error)] active:border-[color:var(--color-semantic-error)] focus:border-[color:var(--color-semantic-error)]`;

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
    // Optional, but not unchecked: a reader who starts typing an address and
    // gets it wrong has given the federation a channel that will bounce, and
    // saying so costs them one correction now instead of a reply that never
    // arrives.
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
          senderEmail: email || undefined,
          senderPhone: value("senderPhone"),
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
      {/*
        §F.4's two halves: the glyph here and `aria-required` on the control.
        The glyph sits **outside** the `<label>` element, which is what the
        rule's own wording asks for — *an `*` after the Label* — and is not a
        detail. A `<label>`'s content is the field's **name**; a marker saying
        something *about* the field is not part of what it is called. Inside,
        it joined `label.textContent`, so the field's name became "الاسم *"
        and every query that asked for the field by its name stopped finding
        it. `aria-hidden` stays as well: nothing in the accessibility tree can
        reach it from out here, and two mechanisms saying the same thing cost
        nothing.

        Primary ink rather than the error red: red at 13px bold measures
        3.95:1 on the dark theme's panel and fails 1.4.3, and a field nobody
        has filled in yet is not *wrong* — spending the error colour on the
        resting state leaves nothing to say with when there is an error.

        This markup is duplicated from the dashboard's `FieldLabel` rather
        than shared, because `packages/ui` holds no components and the two
        applications have separate Tailwind builds. The mechanism they do
        share — geometry, notch, travel — is `forms.css` in the token package.
        Held identical by `surface-standard.spec.ts`. PENDING: a real shared
        component package would end the duplication.
      */}
      <span className="field-label text-body">
        <label htmlFor={fieldId(name)}>{t(`labels.${name}`)}</label>
        {required ? (
          <span aria-hidden="true" className="font-bold text-[color:var(--color-text-primary)]">
            {" *"}
          </span>
        ) : null}
      </span>
      {control}
      {/* Primary ink, not `--color-semantic-error`.
          #E53E3E on the dark theme's raised panel measures **3.95:1**,
          measured on the live page — under WCAG 1.4.3's 4.5:1 for text this
          size, on the one sentence a reader has to be able to act on. The
          field's red edge and its red label carry the state (both measured
          above 4.5:1 on their own grounds), so 1.4.1 holds without the message
          being red as well; the words are what say what is wrong.
          DESIGN SYSTEM GAP — there is no error colour that clears 4.5:1 as
          text on a dark surface. Proposal in ADR-0067 §D8. */}
      {errors[name] ? (
        <p
          id={errorId(name)}
          className="text-caption font-medium text-[color:var(--color-text-primary)]"
        >
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

      {/* §F.4: the explanation belongs once at the top of the form, not
          repeated invisibly on every field it applies to. */}
      <p className="text-caption text-[color:var(--color-text-secondary)]">{t("requiredHint")}</p>

      <form noValidate onSubmit={onSubmit} className={`flex flex-col gap-6 ${PANEL_FILL}`}>
        {/*
          Two paired rows, then two full-width ones.

          The pairing is not decorative: `senderName`/`senderPhone` are who is
          writing and how to reach them, `senderEmail`/`messageType` are the
          second channel and the routing. Subject and body take the full width
          because a one-line title and a paragraph are both harmed by being
          half as wide, and Chapter 5 §5.10 stacks every pair below `md` in DOM
          order — which is already the reading order here.
        */}
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
                aria-required="true"
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
                aria-required="true"
                aria-invalid={Boolean(errors.senderPhone)}
                aria-describedby={describedBy("senderPhone")}
                className={`${controlClass(Boolean(errors.senderPhone))} pe-11 text-start ${TRANSITION} ${FOCUS}`}
              />
              {icon("phone")}
            </div>,
            true,
          )}
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
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
          )}
          {field(
            "messageType",
            <div className="relative">
              <select
                id={fieldId("messageType")}
                name="messageType"
                defaultValue=""
                aria-required="true"
                aria-invalid={Boolean(errors.messageType)}
                aria-describedby={describedBy("messageType")}
                className={`${controlClass(Boolean(errors.messageType))} appearance-none pe-11 ${TRANSITION} ${FOCUS}`}
              >
                {/*
                  Empty on purpose, and `forms.css` reads it.

                  A select used to be the one control that broke the notched
                  label: it always has a value, so `:placeholder-shown` never
                  matches and the label floated from the first paint while a
                  "Select: …" string sat in the middle of the field saying the
                  same thing twice. The empty option is the select's version of
                  an empty input — the label rests in it and travels out of it
                  the moment a real answer is chosen, exactly like every other
                  field.

                Plain and selectable — neither `hidden` nor `disabled`,
                  both of which this carried in turn and both of which the
                  HTML Standard's "ask for a reset" step is specified to skip:
                  it selects the first option in tree order *that is not
                  disabled*, and a `display: none` one cannot be shown either.
                  Under both, the field silently answered its own required
                  question with whichever message type happened to be first.
                  `defaultValue=""` hid that at first paint and `form.reset()`
                  after a successful send brought it back, so the visitor's
                  second message carried a type they never chose.

                  Left plain, the reset rule lands on this option by itself,
                  in every path. `data-placeholder` is what tells `forms.css`
                  the field is unanswered; no browser behaviour reads it, so
                  nothing can be skipped on account of it.
                */}
                <option value="" data-placeholder />
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
        </div>

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

        {field(
          "messageBody",
          <textarea
            id={fieldId("messageBody")}
            name="messageBody"
            rows={4}
            maxLength={5000}
            placeholder={t("placeholders.messageBody")}
            aria-required="true"
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
          className={`flex min-h-13 w-full items-center justify-center gap-2.5 rounded-[var(--button-radius)] bg-[color:var(--color-brand-primary)] shadow-[var(--elevation-card)] text-body font-bold text-[color:var(--color-text-on-brand)] ${LIFT} transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] hover:bg-[color:var(--color-green-600)] active:bg-[color:var(--color-green-700)] disabled:cursor-progress disabled:opacity-70 ${FOCUS}`}
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
