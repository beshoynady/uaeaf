import { AccessDenied } from "@/components/ui/access-denied";
import type { EditorialScreenAbsence } from "@/lib/admin/editorial-screen";

type Translate = (key: string) => string;

/**
 * What an editorial screen shows under its header when there is no editor to
 * draw (ADR-0070).
 *
 * - Refused: the access notice.
 * - Absent, in two different ways. A named record that is not there is a bad
 *   link; an empty collection is a record nobody has created. Neither may
 *   quietly open some other record instead: an editor who believes they are
 *   on a test record would publish the federation's page. Creating the record
 *   is not the screen's job; it comes from seeding or an import.
 *
 * Synchronous, with the page's translators passed in: the page renders it
 * inline, and an async component nested in a page's output is one the page's
 * own spec cannot render. `t` is the screen's messages, which carry
 * `notCreatedTitle`, `notCreatedBody`, `recordNotFoundTitle` and
 * `recordNotFoundBody`; `common` is `Common`.
 */
export const EditorialScreenNotice = ({
  screen,
  t,
  common,
}: {
  screen: EditorialScreenAbsence;
  t: Translate;
  common: Translate;
}) => {
  if (screen.status === "denied") {
    return <AccessDenied title={common("accessDeniedTitle")} message={common("accessDenied")} />;
  }

  return (
    <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-6 py-10 text-center text-body text-[color:var(--color-text-muted)]">
      <strong className="block text-body font-bold text-[color:var(--color-text-primary)]">
        {screen.requested ? t("recordNotFoundTitle") : t("notCreatedTitle")}
      </strong>
      {screen.requested ? t("recordNotFoundBody") : t("notCreatedBody")}
    </p>
  );
};
