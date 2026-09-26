"use client";

import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { TextField } from "@/components/auth/text-field";
import type { AboutDraft } from "@/lib/admin/about-readiness";
import type { SectionFieldsProps } from "./section-fields";

type CtaLink = AboutDraft["cta"]["primary"];

/** Where a button may point: a path inside this site, or an `https://`
 *  address. The screen's copy of the API's allowlist, the same one the
 *  governance link is held to, matched against the value exactly as typed
 *  because the API does not trim it either. A protocol-relative `//host`
 *  starts with a slash and is still refused. */
const SAFE_HREF = /^(?:\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/;

/**
 * The closing band: its heading, the line under it, and the two buttons
 * beside them.
 *
 * The band has no line above its heading in the approved composition, so it
 * takes its title and standfirst directly rather than through the shared
 * heading trio. The labels are still the trio's, so the same field reads the
 * same way in every section.
 *
 * Each button is its own group, named by which button it is, because the two
 * are otherwise identical pairs of fields: without the name, an editor cannot
 * tell which of the two addresses sits behind the white button.
 */
export const CtaFields = ({ value, patch, disabled }: SectionFieldsProps<"cta">) => {
  const t = useTranslations("AboutFederation");

  return (
    <>
      <BilingualField
        id="about-cta-title"
        labelAr={t("headings.title")}
        labelEn={t("headings.title")}
        valueAr={value.title.ar}
        valueEn={value.title.en}
        onChangeAr={(ar) => patch({ title: { ...value.title, ar } })}
        onChangeEn={(en) => patch({ title: { ...value.title, en } })}
        disabled={disabled}
        required
      />

      <BilingualField
        id="about-cta-description"
        labelAr={t("headings.description")}
        labelEn={t("headings.description")}
        valueAr={value.description.ar}
        valueEn={value.description.en}
        onChangeAr={(ar) => patch({ description: { ...value.description, ar } })}
        onChangeEn={(en) => patch({ description: { ...value.description, en } })}
        disabled={disabled}
        required
        multiline
      />

      <LinkGroup
        which="primary"
        link={value.primary}
        onChange={(primary) => patch({ primary })}
        disabled={disabled}
      />

      <LinkGroup
        which="secondary"
        link={value.secondary}
        onChange={(secondary) => patch({ secondary })}
        disabled={disabled}
      />
    </>
  );
};

/**
 * One button's words and address.
 *
 * The address is checked as it is typed. The hint states the rule before
 * anything is typed, and the error names a breach as soon as there is one,
 * so an editor who pastes an `http://` address finds out beside the field
 * rather than from a save that fails with the whole section still unsaved.
 * An empty field is not flagged: nobody has reached it yet, and it is
 * marked required already.
 */
const LinkGroup = ({
  which,
  link,
  onChange,
  disabled,
}: {
  which: "primary" | "secondary";
  link: CtaLink;
  onChange: (link: CtaLink) => void;
  disabled: boolean;
}) => {
  const t = useTranslations("AboutFederation");
  const id = `about-cta-${which}`;
  const patchLink = (change: Partial<CtaLink>) => onChange({ ...link, ...change });
  const hrefRefused = link.href !== "" && !SAFE_HREF.test(link.href);

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-label font-bold">{t(`cta.${which}`)}</legend>

      <BilingualField
        id={`${id}-label`}
        labelAr={t("cta.linkLabel")}
        labelEn={t("cta.linkLabel")}
        valueAr={link.label.ar}
        valueEn={link.label.en}
        onChangeAr={(ar) => patchLink({ label: { ...link.label, ar } })}
        onChangeEn={(en) => patchLink({ label: { ...link.label, en } })}
        disabled={disabled}
        required
      />

      {/* Left to right in both languages: an address is not Arabic text, and
          read right to left its slashes and dots land in the wrong places.
          `inputMode="url"` brings the keyboard with "/" and ".com" on it
          without `type="url"`, which would reject the site's own paths as
          malformed. */}
      <TextField
        id={`${id}-href`}
        label={t("cta.linkHref")}
        // Each address in the hint is isolated left to right. Left in the
        // Arabic sentence's own direction, "https://" prints as "//:https"
        // and the example path loses its leading slash to the far end.
        hint={t.rich("cta.linkHrefHint", {
          addr: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
        })}
        error={hrefRefused ? t("cta.linkHrefRefused") : null}
        dir="ltr"
        inputMode="url"
        spellCheck={false}
        autoComplete="off"
        value={link.href}
        disabled={disabled}
        required
        onChange={(event) => patchLink({ href: event.target.value })}
      />
    </fieldset>
  );
};
