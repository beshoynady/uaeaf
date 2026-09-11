import { useTranslations } from "next-intl";

/**
 * Chapter 8 L2 §F.4, in one place so the two halves cannot drift apart.
 *
 * The rule is a pairing: an `*` after the label **and** `aria-required="true"`
 * on the control, *"never one without the other"*. Both halves were being
 * broken on this dashboard in opposite directions at once — the auth and admin
 * fields carried neither, while the media uploader carried the glyph on three
 * labels and the attribute on none. Neither was a decision; they were what
 * happens when a rule with two halves is implemented at each call site.
 *
 * So the glyph is not a `<span>` anyone can type. `RequiredMark` renders it,
 * `TextField` and `SelectField` render `RequiredMark` and `aria-required`
 * from the same `required` prop, and no call site is in a position to supply
 * one and forget the other.
 */

/**
 * The visual half.
 *
 * `aria-hidden`, because the programmatic half is `aria-required` and a screen
 * reader that gets both announces the same single requirement twice — "name
 * star, required". The glyph is for the eye; the attribute is for everything
 * else.
 *
 * Primary ink rather than the error red. Red is what the field turns when
 * something is *wrong*, and a field that has not been filled in yet is not
 * wrong — spending the error colour on the resting state leaves nothing to
 * say with when there is an actual error. It also measures 3.95:1 at this
 * size on the dark theme's panel (ADR-0067 §D8), which this avoids entirely.
 */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="font-bold text-[color:var(--color-text-primary)]">
      {" *"}
    </span>
  );
}

/**
 * The label, its notch, and the marker — assembled once.
 *
 * The glyph sits **outside** the `<label>` element, which is what §F.4's own
 * wording asks for: *an `*` after the Label*. It reads like a detail and is
 * not one. A `<label>`'s content is the field's **name**, and an adornment
 * saying something *about* the field is not part of what the field is called.
 * Put inside, it joined `label.textContent` — so the field's name became
 * "الاسم بالعربية *", forty-two tests that asked for the field by its name
 * stopped finding it, and they were right to: the markup had made a true
 * assertion false.
 *
 * `aria-hidden` stays on the glyph even though nothing in the accessibility
 * tree can now reach it. Two mechanisms saying the same thing costs nothing
 * here, and the one that survives a future refactor is whichever one the
 * refactor did not touch.
 *
 * The `.field-label` class moves to the wrapper because it is the thing being
 * positioned: `forms.css` paints it onto the control's edge, carries the
 * field's own surface behind it so the border opens a notch, and travels it by
 * `transform`. All of that applies to "the label and its marker" as one
 * object, which is exactly what a reader sees.
 */
export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    /* `text-body` is the resting size: the floated size is that scaled by the
       label/body type ratio, and starting from `text-label` would float at
       10.5px, under Chapter 4's 13px floor. */
    <span className="field-label text-body">
      <label htmlFor={htmlFor}>{children}</label>
      {required ? <RequiredMark /> : null}
    </span>
  );
}

/**
 * The sentence that says what the glyph means — §F.4's SHOULD: *once* at the
 * top of the form, not repeated per field.
 *
 * Rendered from the shared `Common` namespace so the wording is one string in
 * each language rather than seven, and so a form that forgets it is a missing
 * component rather than a missing paragraph nobody notices.
 */
export function RequiredHint({ className }: { className?: string }) {
  const t = useTranslations("Common");
  return (
    <p className={`text-caption text-[color:var(--color-text-secondary)]${className ? ` ${className}` : ""}`}>
      {t("requiredHint")}
    </p>
  );
}
