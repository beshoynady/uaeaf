import Link from "next/link";
import { BrandBorder, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { AppointmentView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { PersonCard } from "../shared/person-card";
import { Portrait } from "../shared/portrait";
import { nameOf, say } from "../shared/text";
import { ChapterHeading } from "./chapter-heading";
import { ANCHOR_OFFSET } from "./sections";

/**
 * The chair, drawn wider than the members and on a green edge.
 *
 * Its own card rather than a `PersonCard` because it is a different object in
 * the design — portrait beside the text rather than above it, across two
 * columns — and the shared card carries no variant for that.
 */
const ChairCard = ({
  chair,
  locale,
  photoLabel,
}: {
  chair: AppointmentView;
  locale: AppLocale;
  photoLabel: string;
}) => (
  <BrandBorder variant="hover" tone="green" className="gov-pop h-full" style={revealStep(0)}>
    <Link
      href={`/${locale}/about/people/${chair.person.slug}`}
      className="brand-focusable brand-focus-wide block h-full"
    >
      <Surface
        kind="raised"
        as="article"
        className="flex h-full flex-col gap-[var(--space-6)] p-[var(--space-6)] sm:flex-row sm:items-center"
      >
        <Portrait shape="panel" label={photoLabel} className="aspect-[4/5] w-full sm:w-1/3 sm:shrink-0" />
        <div data-field="chair" className="flex min-w-0 flex-col gap-[var(--space-2)]">
          <p data-part="position" className="text-label text-[color:var(--surface-link)]">
            {say(chair.position.title, locale)}
          </p>
          <h3 data-part="name" className="text-h3">
            {nameOf(chair.person, locale)}
          </h3>
        </div>
      </Surface>
    </Link>
  </BrandBorder>
);

/**
 * `#members`: the chair first, then everyone else in the committee's order.
 *
 * Four columns from `lg` with the chair across two; two columns below with the
 * chair across both. A committee with no chair draws its members alone, and
 * one with nobody at all draws nothing.
 */
export const CommitteeMembers = ({
  chair,
  members,
  number,
  title,
  lead,
  photoLabel,
  locale,
}: {
  chair: AppointmentView | null;
  members: readonly AppointmentView[];
  number: number;
  title: string;
  lead: string;
  photoLabel: string;
  locale: AppLocale;
}) => {
  if (!chair && members.length === 0) return null;

  const offset = chair ? 1 : 0;

  return (
    <Surface kind="canvas" id="members" className={ANCHOR_OFFSET}>
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-8)] py-12 md:py-16 lg:py-24`}>
        <ChapterHeading number={number} title={title} lead={lead} />

        <ul data-field="members" className="grid grid-cols-2 gap-[var(--space-4)] md:gap-[var(--space-5)] lg:grid-cols-4">
          {chair ? (
            <li className="col-span-2">
              <ChairCard chair={chair} locale={locale} photoLabel={photoLabel} />
            </li>
          ) : null}

          {members.map((member, index) => (
            <li key={member.id}>
              <PersonCard
                post={member}
                locale={locale}
                photoLabel={photoLabel}
                step={index + offset}
                showCommittee={false}
              />
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
};
