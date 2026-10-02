import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { CommitteeCard } from "@/lib/governance/types";

import { CommitteeGroup } from "../shared/committee-card";
import { ordinal } from "../shared/text";
import { ANCHOR_OFFSET } from "./sections";

/**
 * `#sub-committees`: the committees formed under this one.
 *
 * Not in the design file, which drew no committee with children; without it a
 * standing committee's page is the only place in the tree that cannot reach
 * the level below. Drawn by the listing's own `CommitteeGroup`, so a
 * sub-committee card here is the card the listing shows.
 */
export const CommitteeSubs = ({
  committees,
  number,
  title,
  lead,
  locale,
  photoLabel,
  viewLabel,
  subsOfLabel,
}: {
  committees: readonly CommitteeCard[];
  number: number;
  title: string;
  lead: string;
  locale: AppLocale;
  photoLabel: string;
  viewLabel: string;
  subsOfLabel: string;
}) => {
  if (committees.length === 0) return null;

  return (
    <Surface kind="canvas" id="sub-committees" className={`${ANCHOR_OFFSET} border-t border-[color:var(--surface-divider)]`}>
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-2)] py-12 md:py-16 lg:py-24`}>
        <span aria-hidden="true" className="text-overline text-[color:var(--surface-text-muted)]">
          {ordinal(number)}
        </span>
        <CommitteeGroup
          title={title}
          hint={lead}
          committees={committees}
          locale={locale}
          photoLabel={photoLabel}
          viewLabel={viewLabel}
          subsOfLabel={subsOfLabel}
        />
      </div>
    </Surface>
  );
};
