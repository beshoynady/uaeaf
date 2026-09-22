import { useFormatter } from "next-intl";

/**
 * The date a story went live: printed in the reader's locale, with the
 * machine-readable value beside it. Nothing at all for a story that never has,
 * rather than a placeholder standing in for a date.
 */
export const PublishDate = ({ date, className }: { date: string | null; className?: string }) => {
  const format = useFormatter();
  if (!date) return null;

  return (
    <time dateTime={date} className={className}>
      {format.dateTime(new Date(date), { dateStyle: "long" })}
    </time>
  );
};
