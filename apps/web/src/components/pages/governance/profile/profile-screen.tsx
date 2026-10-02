import type { ComponentType, ReactNode } from "react";
import { useTranslations } from "next-intl";

import type { AppLocale } from "@/i18n/routing";
import type { PersonProfileView } from "@/lib/governance/types";

import { BioScene } from "./bio-scene";
import { FinishScene } from "./finish-scene";
import { GlanceScene } from "./glance-scene";
import { JourneyScene } from "./journey-scene";
import { OpeningScene } from "./opening-scene";
import { PodiumScene } from "./podium-scene";
import { type SceneId, sceneLabelKey, visibleScenes } from "./profile-scenes";
import { QualificationsScene } from "./qualifications-scene";
import { SectionNav } from "./section-nav";

type SceneProps = { profile: PersonProfileView; locale: AppLocale; number: number };

const SCENES: Readonly<Record<SceneId, ComponentType<SceneProps>>> = {
  glance: GlanceScene,
  bio: BioScene,
  journey: JourneyScene,
  qualifications: QualificationsScene,
  achievements: PodiumScene,
  finish: FinishScene,
};

/**
 * A person's profile, told as seven scenes.
 *
 * The nav and the scenes are both drawn from `visibleScenes`, one list, so a
 * scene that drops out for want of data takes its nav entry with it and the
 * numbering closes up. The opening is not in that list: it always renders and
 * has no entry, because it is where the reader already is.
 *
 * `breadcrumb` is a slot rather than something drawn here: the institutional
 * pages keep their trail in structured data and draw none (ADR-0072 D7), so
 * whether this page draws one is the route's decision, not the screen's.
 */
export const ProfileScreen = ({
  profile,
  locale,
  breadcrumb = null,
}: {
  profile: PersonProfileView;
  locale: AppLocale;
  breadcrumb?: ReactNode;
}) => {
  const gov = useTranslations("Gov");
  const t = useTranslations("Person");

  const scenes = visibleScenes(profile);

  return (
    <div data-field="profile">
      <OpeningScene
        profile={profile}
        locale={locale}
        firstSceneId={scenes[0]?.id ?? null}
        breadcrumb={breadcrumb}
      />

      <div className="relative">
        <SectionNav
          label={gov("sectionsLabel")}
          entries={scenes.map(({ id, number }) => ({ id, number, label: t(sceneLabelKey(id, profile)) }))}
        />

        {scenes.map(({ id, number }) => {
          const Scene = SCENES[id];
          return <Scene key={id} profile={profile} locale={locale} number={number} />;
        })}
      </div>
    </div>
  );
};
