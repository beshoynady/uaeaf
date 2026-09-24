import { text } from "@/components/pages/static-page-screen";
import { CONTACT_MESSAGE_TYPES, type ContactUsPage, type PostalAddress } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import type { MessageTypeOption } from "./contact-form";

/**
 * What the contact page derives from its record before drawing it. Kept out
 * of the route so the route reads as fetch-then-compose, and so each rule is
 * stated once beside its reason.
 */

/** The eight parts in the order they are written on an envelope in the UAE —
 *  the same order and names the admin form uses, so what an editor typed into
 *  a labelled field appears in the position that label implied. */
const ADDRESS_PARTS: readonly (keyof PostalAddress)[] = [
  "building",
  "street",
  "area",
  "city",
  "emirate",
  "country",
  "poBox",
  "postalCode",
];

/** The address parts an editor actually filled, in envelope order. */
export const addressLinesOf = (record: ContactUsPage | null): string[] =>
  record?.address
    ? ADDRESS_PARTS.map((part) => record.address?.[part]).filter(
        (value): value is string => Boolean(value && value.trim()),
      )
    : [];

/**
 * The form's message types. An option the editor has not labelled still needs
 * a name, or the select shows a blank row; a label carrying a value outside the
 * four the API accepts is dropped rather than offered, because submitting it
 * would fail validation upstream.
 */
export const messageTypesOf = (
  record: ContactUsPage | null,
  locale: AppLocale,
  fallback: (value: string) => string,
): MessageTypeOption[] => {
  const labelled = new Map(
    (record?.form?.messageTypeLabels ?? [])
      .filter((entry) => (CONTACT_MESSAGE_TYPES as readonly string[]).includes(entry.value))
      .map((entry) => [entry.value, text(entry.label, locale)] as const),
  );
  return CONTACT_MESSAGE_TYPES.map((value) => ({
    value,
    label: labelled.get(value) ?? fallback(value),
  }));
};

/** Chapter 14 §4: every property asserted here is rendered or exposed. */
export const schemaAddress = (address: PostalAddress): Record<string, string> => {
  const mapped: Record<string, string> = {};
  const street = [address.building, address.street].filter(Boolean).join(" ");
  if (street) mapped.streetAddress = street;
  if (address.city) mapped.addressLocality = address.city;
  if (address.emirate) mapped.addressRegion = address.emirate;
  if (address.poBox) mapped.postOfficeBoxNumber = address.poBox;
  if (address.postalCode) mapped.postalCode = address.postalCode;
  if (address.country) mapped.addressCountry = address.country;
  return mapped;
};
