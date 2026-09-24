import { useFormatter } from "next-intl";

/**
 * The date a story went live: printed in the reader's locale, with the
 * machine-readable value beside it. Nothing at all for a story that never has,
 * rather than a placeholder standing in for a date.
 *
 * The **only** component on the site that formats a date, and it asks for the
 * named `long` format declared in `i18n/request.ts` rather than passing its
 * own options. That is what pins Latin numerals (Chapter 19 §5, Chapter 9
 * §CR-1.10) in Arabic: a caller passing its own options object would inherit
 * the locale's default numbering system instead. So a second place printing a
 * date reuses this, rather than reaching for `useFormatter` again.
 */
export const PublishDate = ({ date, className }: { date: string | null; className?: string }) => {
  const format = useFormatter();
  if (!date) return null;

  return (
    <time dateTime={date} className={className}>
      {format.dateTime(new Date(date), "long")}
    </time>
  );
};
