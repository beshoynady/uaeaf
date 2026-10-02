import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import type { CommitteeView, GovernancePageSettings } from "@/lib/governance/types";

import { say } from "../shared/text";
import { CommitteeAbout } from "./committee-about";
import { CommitteeDocuments } from "./committee-documents";
import { CommitteeDuties } from "./committee-duties";
import { CommitteeGlance } from "./committee-glance";
import { CommitteeHero } from "./committee-hero";
import { CommitteeMembers } from "./committee-members";
import { CommitteeOthers } from "./committee-others";
import { CommitteeSubs } from "./committee-subs";
import { committeeFacts, reportsTo } from "./facts";
import { type Chapter, SectionNav } from "./section-nav";
import { type CommitteeSectionId, SECTION_IDS, presentSections } from "./sections";

/**
 * One committee's page, the same template for every committee.
 *
 * Which sections draw is decided once, in `presentSections`, and both the
 * chapter nav and the sections read that result: an entry leaves the nav with
 * its section, and the numbers stay contiguous over what is left. Each
 * section still returns nothing on empty data by itself, so the map is the
 * source of the numbering, not the only guard.
 */
export const CommitteeScreen = async ({
  committee,
  locale,
}: {
  committee: CommitteeView & { page: GovernancePageSettings };
  locale: AppLocale;
}) => {
  const [t, gov] = await Promise.all([
    getTranslations({ locale, namespace: "Committee" }),
    getTranslations({ locale, namespace: "Gov" }),
  ]);

  const present = presentSections(committee);
  const titles: Record<CommitteeSectionId, string> = {
    about: t("aboutTitle"),
    duties: t("dutiesTitle"),
    members: t("membersTitle"),
    "sub-committees": t("subCommitteesTitle"),
    documents: t("documentsTitle"),
    others: t("othersTitle"),
  };

  const chapters: Chapter[] = SECTION_IDS.filter((id) => present[id]).map((id, index) => ({
    id,
    label: titles[id],
    number: index + 1,
  }));
  const numberOf = (id: CommitteeSectionId) => chapters.find((chapter) => chapter.id === id)?.number ?? 0;

  const facts = committeeFacts(committee, locale, {
    chair: gov("chair"),
    term: gov("term"),
    members: gov("members"),
    decision: gov("formationDecision"),
  });
  const parent = reportsTo(committee, locale, {
    board: gov("reportsToBoard"),
    committee: (name) => gov("reportsToCommittee", { name }),
  });
  const photoLabel = gov("photoPending");

  return (
    <>
      <CommitteeHero
        name={say(committee.name, locale)}
        summary={say(committee.summary, locale)}
        chair={committee.chair}
        reportsTo={parent}
        facts={facts}
        locale={locale}
        labels={{
          kind:
            committee.kind === "sub" ? t("kindSub") : committee.kind === "standing" ? t("kindStanding") : null,
          factsLabel: t("factsLabel"),
          photoPending: photoLabel,
          noChair: gov("noChair"),
          reportsTo: gov("reportsTo"),
        }}
      />

      <SectionNav chapters={chapters} label={gov("sectionsLabel")} />

      {present.about ? (
        <CommitteeAbout
          about={say(committee.about, locale)}
          number={numberOf("about")}
          title={titles.about}
          glance={
            <CommitteeGlance
              title={t("glance")}
              facts={facts}
              reportsTo={parent}
              reportsToLabel={gov("reportsTo")}
            />
          }
        />
      ) : null}

      {present.duties ? (
        <CommitteeDuties
          duties={committee.duties}
          number={numberOf("duties")}
          title={titles.duties}
          lead={t("dutiesLead")}
          locale={locale}
        />
      ) : null}

      {present.members ? (
        <CommitteeMembers
          chair={committee.chair}
          members={committee.members}
          number={numberOf("members")}
          title={titles.members}
          lead={t("membersLead")}
          photoLabel={photoLabel}
          locale={locale}
        />
      ) : null}

      {present["sub-committees"] ? (
        <CommitteeSubs
          committees={committee.children}
          number={numberOf("sub-committees")}
          title={titles["sub-committees"]}
          lead={t("subCommitteesLead")}
          locale={locale}
          photoLabel={photoLabel}
          viewLabel={gov("viewCommittee")}
          subsOfLabel={gov("subsOf")}
        />
      ) : null}

      {present.documents ? (
        <CommitteeDocuments
          documents={committee.documents}
          number={numberOf("documents")}
          title={titles.documents}
          lead={t("documentsLead")}
          downloadLabel={gov("download")}
          locale={locale}
        />
      ) : null}

      {present.others ? (
        <CommitteeOthers
          committees={committee.siblings}
          number={numberOf("others")}
          title={titles.others}
          allLabel={gov("allCommittees")}
          locale={locale}
        />
      ) : null}
    </>
  );
};
