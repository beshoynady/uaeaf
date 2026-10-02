import Link from "next/link";
import { BrandBorder, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { CommitteeCard } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { nameOf, ordinal, say } from "../shared/text";
import { ChapterHeading } from "./chapter-heading";
import { ForwardIcon } from "./icons";
import { ANCHOR_OFFSET } from "./sections";

/**
 * One sibling, compact: its number, its name, and its chair on one line.
 *
 * Smaller than the listing's `CommitteeCard` on purpose — this is the way on
 * to another page, not the listing repeated. A committee with no chair has no
 * chair line rather than an empty one.
 */
const OtherCard = ({ committee, index, locale }: { committee: CommitteeCard; index: number; locale: AppLocale }) => (
  <BrandBorder variant="hover" className="gov-pop h-full" style={revealStep(index)}>
    <Link
      href={`/${locale}/about/committees/${committee.slug}`}
      className="brand-focusable brand-focus-wide block h-full"
    >
      <Surface kind="raised" as="article" className="flex h-full flex-col gap-[var(--space-2)] p-[var(--space-5)]">
        <span aria-hidden="true" className="text-label text-[color:var(--surface-text-muted)]">
          {ordinal(index + 1)}
        </span>
        <h3 className="text-body font-bold">{say(committee.name, locale)}</h3>
        {committee.chair ? (
          <p className="text-body-sm text-[color:var(--surface-text-muted)]">
            {say(committee.chair.position.title, locale)} · {nameOf(committee.chair.person, locale)}
          </p>
        ) : null}
      </Surface>
    </Link>
  </BrandBorder>
);

/**
 * `#others`: the other committees, and the way back to the full listing.
 *
 * Four columns from `lg`, two from `md`, one below.
 */
export const CommitteeOthers = ({
  committees,
  number,
  title,
  allLabel,
  locale,
}: {
  committees: readonly CommitteeCard[];
  number: number;
  title: string;
  allLabel: string;
  locale: AppLocale;
}) => {
  if (committees.length === 0) return null;

  return (
    <Surface kind="canvas" id="others" className={ANCHOR_OFFSET}>
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-8)] py-12 md:py-16 lg:py-24`}>
        <ChapterHeading
          number={number}
          title={title}
          action={
            <Link
              href={`/${locale}/about/committees`}
              className="brand-focusable inline-flex min-h-[var(--space-12)] items-center gap-[var(--space-2)] text-body-sm font-bold text-[color:var(--surface-link)]"
            >
              {allLabel}
              <ForwardIcon />
            </Link>
          }
        />

        <ul data-field="others" className="grid gap-[var(--space-4)] md:grid-cols-2 lg:grid-cols-4">
          {committees.map((committee, index) => (
            <li key={committee.id}>
              <OtherCard committee={committee} index={index} locale={locale} />
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
};
