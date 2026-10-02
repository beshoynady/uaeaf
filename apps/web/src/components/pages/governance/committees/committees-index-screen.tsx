import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";
import type { CommitteesIndexView, GovernancePageSettings } from "@/lib/governance/types";
import { AboutPageJsonLd, BreadcrumbJsonLd } from "@/lib/seo/json-ld";

import { say } from "../shared/text";
import { CommitteesHero } from "./committees-hero";
import { CommitteesHow } from "./committees-how";
import { CommitteesLinks } from "./committees-links";
import { CommitteesList } from "./committees-list";

const ROUTE = "/about/committees";

/**
 * The committees listing.
 *
 * One markup tree whose section order changes with the width: on a phone the
 * list follows the hero, because a visitor arriving there wants a committee,
 * and from `lg` the explanation of how committees work leads into it. Source
 * order is the phone's, so the list is what a screen reader and the keyboard
 * reach first at every width; the explanation holds no links, so moving it
 * changes no focus order.
 */
export const CommitteesIndexScreen = async ({
  index,
  locale,
}: {
  index: CommitteesIndexView & { page: GovernancePageSettings };
  locale: AppLocale;
}) => {
  const [t, tGov, tBoard, tNav] = await Promise.all([
    getTranslations({ locale, namespace: "CommitteesIndex" }),
    getTranslations({ locale, namespace: "Gov" }),
    getTranslations({ locale, namespace: "Board" }),
    getTranslations({ locale, namespace: "Nav" }),
  ]);

  const title = say(index.page.hero.title, locale);
  const subtitle = say(index.page.hero.subtitle, locale);

  return (
    <>
      <AboutPageJsonLd locale={locale} route={ROUTE} name={title} description={subtitle || title} />
      <BreadcrumbJsonLd
        locale={locale}
        trail={[
          { name: tNav("home"), route: "/" },
          { name: title, route: ROUTE },
        ]}
      />

      <CommitteesHero index={index} locale={locale} statLabel={t("statCommittees")} />

      <div className="flex flex-col">
        <CommitteesList
          className="order-1 lg:order-2"
          index={index}
          locale={locale}
          copy={{
            standing: tGov("standing"),
            standingHint: tGov("standingHint"),
            boardSubs: tGov("boardSubs"),
            empty: t("empty"),
            photoPending: tGov("photoPending"),
            viewCommittee: tGov("viewCommittee"),
            subsOf: tBoard("subsOf"),
          }}
        />

        <CommitteesHow
          className="order-2 lg:order-1"
          eyebrow={t("howEyebrow")}
          title={t("howTitle")}
          steps={[
            { title: t("howAppointments"), text: t("howAppointmentsText") },
            { title: t("howTerm"), text: t("howTermText") },
            { title: t("howStructure"), text: t("howStructureText") },
          ]}
        />

        <CommitteesLinks
          className="order-3"
          title={tNav("governance")}
          links={[
            { href: `/${locale}/about/board-members`, title: tNav("boardMembers") },
            {
              href: `/${locale}/about/governance/policies`,
              title: tNav("policies"),
              description: tNav("policiesDescription"),
            },
          ]}
        />
      </div>
    </>
  );
};
