import { useId } from "react";
import { useTranslations } from "next-intl";
import { SelectField } from "@/components/ui/select-field";
import type { AssociationOption } from "@/lib/admin/videos/association-options";

/**
 * Which championship or event a video belongs to.
 *
 * ── Why it can disappear ───────────────────────────────────────────────────
 *
 * None of the three owner collections is built yet, so `getAssociationOptions`
 * has nothing to return. A `<select>` with no options is a control that looks
 * operable and is not — press it, nothing happens, and the editor concludes
 * the screen is broken rather than that the feature is unfinished. This
 * project treats that as a defect in its own right, not a cosmetic gap.
 *
 * So the control renders **nothing at all** until there is something to
 * choose. Everything behind it is already built: the API filters by
 * association, the section settings store one, and the library's filter bar
 * reads one. The day the entity ships, `getAssociationOptions` starts
 * returning rows and every one of these fields appears at once, with no change
 * here or anywhere else.
 *
 * ── Through `SelectField`, like every other select ─────────────────────────
 *
 * This file used to draw its own `<label>` and `<select>`, which left it the
 * one select in the dashboard that did not get the notched label, the 44px
 * height or the focus ring from `forms.css`. `field-standard.spec.tsx` names
 * that as a defect and was red on this file alone.
 */
export const AssociationField = ({
  options,
  value,
  onChange,
  label,
  hint,
}: {
  options: readonly AssociationOption[];
  /** `<ownerType>:<id>`, or `null` for "not linked to anything". */
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  hint?: string;
}) => {
  const t = useTranslations("Videos");
  const id = useId();

  // The whole point — see the note above.
  if (options.length === 0) return null;

  return (
    <SelectField
      id={id}
      label={label}
      hint={hint}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
      options={[
        // Without this an editor who picks one by mistake cannot unpick it.
        { value: "", label: t("associationNone") },
        ...options.map((option) => ({ value: option.value, label: option.label })),
      ]}
    />
  );
};
