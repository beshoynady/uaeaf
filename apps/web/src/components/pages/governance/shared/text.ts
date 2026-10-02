import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText } from "@/lib/api/types";
import type { AppointmentView, PersonSummary } from "@/lib/governance/types";

/** One half of a stored pair, or an empty string when the record has none. */
export const say = (text: LocalizedText | null | undefined, locale: AppLocale): string =>
  text ? text[locale] : "";

/**
 * A person's name with the honorific the record stores in front of it.
 *
 * Joined here rather than at each call site because the two are separate
 * fields and a listing that forgets the honorific reads as a different
 * register from one that remembers it.
 */
export const nameOf = (person: PersonSummary, locale: AppLocale): string => {
  const honorific = say(person.honorific, locale);
  const name = say(person.name, locale);
  return honorific ? `${honorific} ${name}` : name;
};

/** A post is current until it has an end date. */
export const isCurrent = (post: AppointmentView): boolean => post.termEnd === null;

/**
 * The years a post covers, as the page prints them.
 *
 * Latin digits in both languages (Chapter 19 §5) — Arabic reaches them only
 * through the locale's default otherwise, which is not a decision.
 */
export const termYears = (post: AppointmentView, locale: AppLocale, present: string): string => {
  const digits = new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: false });
  const start = digits.format(new Date(post.termStart).getUTCFullYear());
  const end = post.termEnd ? digits.format(new Date(post.termEnd).getUTCFullYear()) : present;
  return `${start} – ${end}`;
};

/** A count, pinned to Latin digits for the same reason. */
export const count = (value: number, locale: AppLocale): string =>
  new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(value);

/** A position number, zero-padded the way the design numbers its cards. */
export const ordinal = (value: number): string => String(value).padStart(2, "0");
