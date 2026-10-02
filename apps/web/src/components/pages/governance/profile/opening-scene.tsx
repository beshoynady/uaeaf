import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import { HERO_SCRIM } from "@/components/ui/surface";
import type { AppLocale } from "@/i18n/routing";
import type { PersonProfileView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { Portrait } from "../shared/portrait";
import { nameOf, say } from "../shared/text";
import { ArrowDownIcon } from "./icons";
import { StadiumBackdrop } from "./stadium-backdrop";

/** The three identity strips, each a surface value the ink ground publishes. */
const STREAKS = [
  "top-[var(--space-16)] bg-[color:var(--surface-tricolor-start)]",
  "top-[var(--space-20)] bg-[color:var(--surface-tricolor-mid)]",
  "top-[var(--space-24)] bg-[color:var(--surface-tricolor-end)]",
] as const;

/**
 * The name, a word at a time.
 *
 * Each word is an inline block because a transform does nothing to an inline
 * box, and the space between words sits outside the blocks, where it cannot
 * collapse into the word before it.
 */
const RevealedName = ({ name }: { name: string }) => (
  <h1 data-field="name" className="text-display-xl">
    {name
      .split(/\s+/)
      .filter(Boolean)
      .map((word, index) => (
        <span key={`${word}-${index}`}>
          {index > 0 ? " " : null}
          <span className="gov-word inline-block" style={revealStep(index)}>
            {word}
          </span>
        </span>
      ))}
  </h1>
);

/**
 * The profile's first scene: a night stadium, and the person standing in it.
 *
 * Ink in both themes, because it is a picture and a picture does not invert.
 * The name is the page's only `h1`. The eyebrow names the body and the term
 * from the person's current posts, so a person with none carries no eyebrow
 * rather than one that names nothing.
 */
export const OpeningScene = ({
  profile,
  locale,
  firstSceneId,
  breadcrumb,
}: {
  profile: PersonProfileView;
  locale: AppLocale;
  /** Where the scroll cue leads; absent when no scene follows. */
  firstSceneId: string | null;
  breadcrumb?: ReactNode;
}) => {
  const t = useTranslations("Person");
  const gov = useTranslations("Gov");

  const { person, current } = profile;
  const lead = current[0] ?? null;
  const body = current.some((post) => post.body === "board") ? t("bodyBoard") : t("bodyCommittee");
  const eyebrow = lead ? t("openingEyebrow", { body, term: say(lead.cycle.label, locale) }) : null;

  return (
    <Surface kind="ink" mesh className="overflow-hidden">
      <div aria-hidden="true" className="gov-settle absolute inset-0 -z-10">
        <StadiumBackdrop />
      </div>

      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        {STREAKS.map((position, index) => (
          <span
            key={position}
            className={`gov-streak absolute end-0 h-[var(--space-1)] w-1/2 rounded-[var(--radius-full)] ${position}`}
            style={revealStep(index)}
          />
        ))}
      </div>

      <div aria-hidden="true" className={`${HERO_SCRIM} -z-10`} />

      <div
        className={`${CONTAINER} grid min-h-[calc(100svh-var(--header-height))] items-end gap-[var(--space-10)] py-[var(--space-24)] lg:grid-cols-12`}
      >
        <div className="flex flex-col gap-[var(--space-5)] lg:col-span-8">
          {breadcrumb}

          {eyebrow ? (
            <p data-field="eyebrow" className="text-overline text-[color:var(--surface-accent,var(--surface-text-muted))]">
              {eyebrow}
            </p>
          ) : null}

          <RevealedName name={nameOf(person, locale)} />

          {current.length > 0 ? (
            <ul data-field="positions" className="flex flex-wrap gap-[var(--space-2)]">
              {current.map((post) => (
                <li
                  key={post.id}
                  className="flex min-h-[var(--space-10)] items-center rounded-[var(--radius-full)] border border-[color:var(--surface-border)] px-[var(--space-4)] text-body-sm"
                >
                  {post.committee
                    ? `${say(post.position.title, locale)} · ${say(post.committee.name, locale)}`
                    : say(post.position.title, locale)}
                </li>
              ))}
            </ul>
          ) : null}

          {firstSceneId ? (
            <a
              href={`#${firstSceneId}`}
              className="brand-focusable inline-flex min-h-[var(--space-12)] w-fit items-center gap-[var(--space-2)] text-label text-[color:var(--surface-text-muted)]"
            >
              <ArrowDownIcon />
              {t("scroll")}
            </a>
          ) : null}
        </div>

        <Portrait
          shape="panel"
          label={gov("photoPending")}
          className="aspect-[4/5] w-2/3 sm:w-1/2 lg:col-span-4 lg:w-full"
        />
      </div>
    </Surface>
  );
};
