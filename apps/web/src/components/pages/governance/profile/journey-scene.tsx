import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandBorder, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { AppointmentView, PersonProfileView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { isCurrent, ordinal, say, termYears } from "../shared/text";
import { ArrowForwardIcon } from "./icons";
import { SCENE_HAS, SCENE_SCROLL_MARGIN } from "./profile-scenes";
import { SceneHeading } from "./scene-heading";

/** The page a post belongs to: its committee's, or the board's. */
const pageOf = (post: AppointmentView, locale: AppLocale): string =>
  post.committee ? `/${locale}/about/committees/${post.committee.slug}` : `/${locale}/about/board-members`;

/** Faint lane lines behind the cards, settling as one layer. */
const TrackLines = () => (
  <div aria-hidden="true" className="gov-settle pointer-events-none absolute inset-0 -z-10 opacity-[var(--opacity-mesh-subtle)]">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full text-[color:var(--surface-text)]">
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  </div>
);

/**
 * One post as a lane.
 *
 * `endReason` is deliberately absent: why a post closed is the federation's
 * internal record, and the public page says only that it closed and when.
 * The whole card is one link, the pattern `PersonCard` uses, so the card and
 * its title are not two targets for the same address.
 */
const LaneCard = ({
  post,
  lane,
  locale,
}: {
  post: AppointmentView;
  lane: number;
  locale: AppLocale;
}) => {
  const t = useTranslations("Person");
  const gov = useTranslations("Gov");
  const current = isCurrent(post);

  const body = (
    <article data-field="lane" data-state={current ? "current" : "past"} className="flex h-full flex-col gap-[var(--space-4)] p-[var(--space-6)]">
      <div className="flex items-center justify-between gap-[var(--space-3)]">
        <p className="flex items-baseline gap-[var(--space-2)]">
          <span className="text-label text-[color:var(--surface-text-muted)]">{t("lane")}</span>
          <span data-part="lane" className="text-display-l leading-none">
            {ordinal(lane)}
          </span>
        </p>
        {current ? (
          <Surface kind="brand-green" as="span" className="rounded-[var(--radius-full)] px-[var(--space-3)] py-[var(--space-1)] text-label">
            {gov("current")}
          </Surface>
        ) : (
          <span className="rounded-[var(--radius-full)] border border-[color:var(--surface-border)] px-[var(--space-3)] py-[var(--space-1)] text-label text-[color:var(--surface-text-muted)]">
            {gov("past")}
          </span>
        )}
      </div>

      <h3 data-part="position" className="text-h4">
        {say(post.position.title, locale)}
      </h3>
      <p data-part="body" className="text-body-sm text-[color:var(--surface-text-muted)]">
        {post.committee ? say(post.committee.name, locale) : t("bodyBoard")}
      </p>

      <p className="mt-auto flex items-center justify-between gap-[var(--space-3)] border-t border-[color:var(--surface-divider)] pt-[var(--space-4)]">
        <span data-part="period" className="text-label">
          {termYears(post, locale, t("present"))}
        </span>
        <span className="text-[color:var(--surface-link)]">
          <ArrowForwardIcon />
        </span>
      </p>
    </article>
  );

  const link = (
    <Link href={pageOf(post, locale)} className="brand-focusable brand-focus-wide block h-full">
      {body}
    </Link>
  );

  return current ? (
    <BrandBorder tone="green" className="h-full gov-pop" style={revealStep(lane - 1)}>
      <Surface kind="raised" as="div" className="h-full">
        {link}
      </Surface>
    </BrandBorder>
  ) : (
    <div
      className="gov-pop h-full rounded-[var(--radius-lg)] border border-dashed border-[color:var(--surface-border)]"
      style={revealStep(lane - 1)}
    >
      {link}
    </div>
  );
};

/**
 * `#journey` — every post, current then former, as numbered lanes.
 *
 * The lane is the card's place in the combined list, so the numbering runs on
 * from the current posts into the former ones without restarting. Inverts
 * with the theme.
 */
export const JourneyScene = ({
  profile,
  locale,
  number,
}: {
  profile: PersonProfileView;
  locale: AppLocale;
  number: number;
}) => {
  const t = useTranslations("Person");
  if (!SCENE_HAS.journey(profile)) return null;

  const posts = [...profile.current, ...profile.previous];

  return (
    <Surface kind="canvas" id="journey" className={`${SCENE_SCROLL_MARGIN} overflow-hidden`}>
      <TrackLines />
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-10)] py-[var(--space-16)] lg:py-[var(--space-24)]`}>
        <SceneHeading number={number} label={t("journeyTitle")} title={t("journeyHeading")} lead={t("journeyLead")} />

        <ol data-field="journey" className="grid gap-[var(--space-6)] md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post, index) => (
            <li key={post.id}>
              <LaneCard post={post} lane={index + 1} locale={locale} />
            </li>
          ))}
        </ol>
      </div>
    </Surface>
  );
};
