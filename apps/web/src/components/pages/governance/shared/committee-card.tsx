import Link from "next/link";
import { BrandBorder, SectionHeading, Surface } from "@uaeaf/brand-ui";

import type { AppLocale } from "@/i18n/routing";
import type { CommitteeCard as CommitteeCardData } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { Portrait } from "./portrait";
import { nameOf, ordinal, say } from "./text";

/**
 * The chair beneath a committee's summary.
 *
 * Returns nothing when the committee has no chair. The design draws the row
 * regardless, with two empty lines beside an empty avatar, which reads as a
 * person whose name failed to load rather than a post nobody holds yet — and a
 * post nobody holds is the ordinary state while the federation is still
 * forming its committees.
 */
const ChairLine = ({
  committee,
  locale,
  photoLabel,
}: {
  committee: CommitteeCardData;
  locale: AppLocale;
  photoLabel: string;
}) => {
  if (!committee.chair) return null;

  return (
    <div
      data-part="chair"
      className="mt-auto flex items-center gap-[var(--space-3)] border-t border-[color:var(--surface-divider)] pt-[var(--space-4)]"
    >
      <Portrait shape="circle" label={photoLabel} className="size-[var(--space-12)] shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="text-label text-[color:var(--surface-text-muted)]">
          {say(committee.chair.position.title, locale)}
        </span>
        <span className="text-body-sm font-bold">{nameOf(committee.chair.person, locale)}</span>
      </div>
    </div>
  );
};

/**
 * One committee, as a card in a listing.
 *
 * The index is the card's place in the group it is drawn in, not a stored
 * field: a sub-committee is numbered within its parent, and a standing
 * committee within the standing list, so the same committee carries a
 * different number in the two places it appears. Decorative, and hidden from
 * the reader who is being read to.
 */
export const CommitteeCard = ({
  committee,
  index,
  locale,
  photoLabel,
  viewLabel,
  level = "h3",
}: {
  committee: CommitteeCardData;
  index: number;
  locale: AppLocale;
  photoLabel: string;
  viewLabel: string;
  /** One level below the group's own heading. */
  level?: "h3" | "h4";
}) => {
  const Name = level;

  const summary = say(committee.summary, locale);

  return (
    <BrandBorder variant="hover" className="h-full gov-pop" style={revealStep(index)}>
      <Link
        href={`/${locale}/about/committees/${committee.slug}`}
        data-field="committee-card"
        className="brand-focusable brand-focus-wide block h-full"
      >
        <Surface
          kind="raised"
          as="article"
            className="flex h-full flex-col gap-[var(--space-4)] p-[var(--space-6)]"
        >
          <span
            aria-hidden="true"
            data-part="index"
            className="text-display-l leading-none text-[color:var(--surface-text-muted)] opacity-40"
          >
            {ordinal(index + 1)}
          </span>

          <Name data-part="name" className="text-h4">
            {say(committee.name, locale)}
          </Name>

          {summary ? (
            <p data-part="summary" className="text-body-sm text-[color:var(--surface-text-muted)]">
              {summary}
            </p>
          ) : null}

          <ChairLine committee={committee} locale={locale} photoLabel={photoLabel} />

          <span className="text-label text-[color:var(--surface-link)]">{viewLabel}</span>
        </Surface>
      </Link>
    </BrandBorder>
  );
};

/**
 * A titled group of committees, with each standing committee's own children
 * indented beneath it.
 *
 * The listing and the organisational chart both draw this, which is why the
 * nesting lives here: the two would otherwise implement the same tree twice
 * and drift. A group with nothing in it renders nothing at all — heading
 * included — so an empty half of the split disappears rather than announcing
 * itself.
 *
 * `level` is the caller's because the same group sits at two depths: on the
 * listing it is a section of the page, and inside the board's chart it is part
 * of one. Left at `h2` in the second place it would open a section that the
 * chart's own heading already opened.
 */
export const CommitteeGroup = ({
  title,
  hint,
  level = "h2",
  committees,
  locale,
  photoLabel,
  viewLabel,
  subsOfLabel,
}: {
  title: string;
  hint?: string;
  level?: "h2" | "h3";
  committees: readonly CommitteeCardData[];
  locale: AppLocale;
  photoLabel: string;
  viewLabel: string;
  /** Names the nested list for a screen reader: "sub-committees of …". */
  subsOfLabel: string;
}) => {
  if (committees.length === 0) return null;

  return (
    <section data-field="committee-group" className="flex flex-col gap-[var(--space-6)]">
      <SectionHeading title={title} description={hint} level={level} />

      <ul className="grid gap-[var(--space-6)] md:grid-cols-2 xl:grid-cols-3">
        {committees.map((committee, index) => (
          <li key={committee.id} className="flex flex-col gap-[var(--space-3)]">
            <CommitteeCard
              committee={committee}
              index={index}
              locale={locale}
              photoLabel={photoLabel}
              viewLabel={viewLabel}
              level={level === "h2" ? "h3" : "h4"}
            />

            {committee.children.length > 0 ? (
              <ul
                aria-label={`${subsOfLabel} ${say(committee.name, locale)}`}
                className="flex flex-col gap-[var(--space-2)] ps-[var(--space-5)]"
              >
                {committee.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/${locale}/about/committees/${child.slug}`}
                      className="brand-focusable flex min-h-[var(--space-12)] items-center rounded-[var(--radius-md)] border border-dashed border-[color:var(--surface-border)] px-[var(--space-4)] text-body-sm"
                    >
                      {say(child.name, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};
