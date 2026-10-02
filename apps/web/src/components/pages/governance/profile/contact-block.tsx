import { useTranslations } from "next-intl";
import { Surface } from "@uaeaf/brand-ui";

import type { PublicContact } from "@/lib/governance/types";

import { MailIcon, PhoneIcon } from "./icons";

/**
 * The published contact details, one row per channel.
 *
 * Only ever given what `publicContactOf` returned, and each channel still
 * hides on its own when empty. The values sit in a left-to-right isolate: an
 * address or a number read inside Arabic text otherwise reorders around its
 * punctuation.
 */
export const ContactBlock = ({ contact, asScene }: { contact: PublicContact; asScene: boolean }) => {
  const t = useTranslations("Person");

  const rows = [
    contact.email
      ? { key: "email", label: t("contactEmail"), value: contact.email, href: `mailto:${contact.email}`, icon: <MailIcon /> }
      : null,
    contact.phone
      ? {
          key: "phone",
          label: t("contactPhone"),
          value: contact.phone,
          href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
          icon: <PhoneIcon />,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) return null;

  return (
    <Surface
      kind="raised"
      as="div"
      className="flex flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] p-[var(--space-6)]"
    >
      {/* The scene's own heading already names this when nothing else is in it. */}
      {asScene ? null : <h3 className="text-h4">{t("contactTitle")}</h3>}

      <ul data-field="contact" className="flex flex-col gap-[var(--space-2)] md:flex-row md:gap-[var(--space-6)]">
        {rows.map((row) => (
          <li key={row.key} data-part={row.key}>
            <a
              href={row.href}
              className="brand-focusable inline-flex min-h-[var(--space-12)] items-center gap-[var(--space-3)] text-[color:var(--surface-link)]"
            >
              {row.icon}
              <span className="text-label text-[color:var(--surface-text-muted)]">{row.label}</span>
              <bdi dir="ltr" className="text-body underline underline-offset-4">
                {row.value}
              </bdi>
            </a>
          </li>
        ))}
      </ul>
    </Surface>
  );
};
