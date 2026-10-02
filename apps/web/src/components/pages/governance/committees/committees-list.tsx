import { EmptyState, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { CommitteesIndexView } from "@/lib/governance/types";

import { CommitteeGroup } from "../shared/committee-card";

export type CommitteesListCopy = {
  standing: string;
  standingHint: string;
  boardSubs: string;
  empty: string;
  photoPending: string;
  viewCommittee: string;
  subsOf: string;
};

/**
 * The committees themselves, split the way the federation reports them:
 * standing committees with their own sub-committees beneath, then the
 * sub-committees that answer to the board directly.
 *
 * Each group hides itself when empty. When both are, the section says so
 * instead of disappearing, because the list is what a visitor came for and a
 * page that silently ends after its hero reads as broken.
 */
export const CommitteesList = ({
  index,
  locale,
  copy,
  className = "",
}: {
  index: CommitteesIndexView;
  locale: AppLocale;
  copy: CommitteesListCopy;
  className?: string;
}) => {
  const empty = index.standing.length === 0 && index.boardSubCommittees.length === 0;

  return (
    <Surface kind="canvas" className={className}>
      <div
        data-field="committees"
        className={`${CONTAINER} flex flex-col gap-[var(--space-16)] py-12 md:py-16 lg:py-24`}
      >
        {empty ? (
          <EmptyState title={copy.empty} />
        ) : (
          <>
            <CommitteeGroup
              title={copy.standing}
              hint={copy.standingHint}
              committees={index.standing}
              locale={locale}
              photoLabel={copy.photoPending}
              viewLabel={copy.viewCommittee}
              subsOfLabel={copy.subsOf}
            />
            <CommitteeGroup
              title={copy.boardSubs}
              committees={index.boardSubCommittees}
              locale={locale}
              photoLabel={copy.photoPending}
              viewLabel={copy.viewCommittee}
              subsOfLabel={copy.subsOf}
            />
          </>
        )}
      </div>
    </Surface>
  );
};
