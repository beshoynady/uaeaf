import { useTranslations } from "next-intl";
import { Surface, type SurfaceKind } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { CvEntry, PersonProfileView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { count, say } from "../shared/text";
import { SCENE_HAS, SCENE_SCROLL_MARGIN } from "./profile-scenes";
import { SceneHeading } from "./scene-heading";

type Place = 1 | 2 | 3;

/**
 * Each place's ground, column and height.
 *
 * The columns are fixed so that a podium with one or two entries still puts
 * first in the middle rather than sliding it to the start. Heights step down
 * on a phone but the three columns stay: a podium stacked into one column is
 * a list, and the picture is lost.
 */
const PLACES: Readonly<Record<Place, { kind: SurfaceKind; column: string; height: string }>> = {
  1: {
    kind: "brand-green",
    column: "col-start-2",
    height: "h-[var(--space-32)] md:h-[calc(var(--space-32)+var(--space-16))]",
  },
  2: { kind: "raised", column: "col-start-1", height: "h-[var(--space-24)] md:h-[var(--space-32)]" },
  3: { kind: "brand-red", column: "col-start-3", height: "h-[var(--space-16)] md:h-[var(--space-24)]" },
};

const Plinth = ({
  entry,
  place,
  locale,
  placeLabel,
}: {
  entry: CvEntry;
  place: Place;
  locale: AppLocale;
  placeLabel: string;
}) => {
  const { kind, column, height } = PLACES[place];

  return (
    <li
      data-part="plinth"
      data-place={place}
      className={`${column} row-start-1 flex flex-col justify-end gap-[var(--space-3)]`}
    >
      <div className="flex flex-col gap-[var(--space-1)] text-center">
        <p className="text-body-sm font-bold md:text-body">{say(entry.title, locale)}</p>
        {entry.detail ? (
          <p className="text-label text-[color:var(--surface-text-muted)]">{say(entry.detail, locale)}</p>
        ) : null}
      </div>

      <div className="gov-podium" style={revealStep(place - 1)}>
        <Surface
          kind={kind}
          as="div"
          className={`${height} grid place-items-center rounded-t-[var(--radius-md)] border border-[color:var(--surface-border)]`}
        >
          <p className="text-display-l leading-none">
            <span className="brand-visually-hidden">{placeLabel} </span>
            {count(place, locale)}
          </p>
        </Surface>
      </div>
    </li>
  );
};

/**
 * `#achievements` — the first three achievements on a podium.
 *
 * Written second, first, third so the eye finds first in the centre; each
 * numeral is preceded by hidden text so a screen reader hears "Place 1"
 * rather than a bare figure. Inverts with the theme.
 */
export const PodiumScene = ({
  profile,
  locale,
  number,
}: {
  profile: PersonProfileView;
  locale: AppLocale;
  number: number;
}) => {
  const t = useTranslations("Person");
  if (!SCENE_HAS.achievements(profile)) return null;

  const [first, second, third] = profile.person.cv.achievements;
  const podium: { entry: CvEntry; place: Place }[] = [];
  if (second) podium.push({ entry: second, place: 2 });
  if (first) podium.push({ entry: first, place: 1 });
  if (third) podium.push({ entry: third, place: 3 });

  return (
    <Surface kind="canvas" id="achievements" className={SCENE_SCROLL_MARGIN}>
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-10)] py-[var(--space-16)] lg:py-[var(--space-24)]`}>
        <SceneHeading number={number} label={t("achievementsTitle")} title={t("achievementsHeading")} />

        <ol
          data-field="podium"
          className="mx-auto grid w-full grid-cols-3 items-end gap-[var(--space-2)] md:w-2/3 md:gap-[var(--space-4)]"
        >
          {podium.map(({ entry, place }) => (
            <Plinth key={entry.id} entry={entry} place={place} locale={locale} placeLabel={t("place")} />
          ))}
        </ol>
      </div>
    </Surface>
  );
};
