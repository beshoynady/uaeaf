import Link from "next/link";
import { Surface } from "@uaeaf/brand-ui";

import type { AppLocale } from "@/i18n/routing";
import type { AppointmentView, OrgChartRow } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { nameOf, say } from "../shared/text";

/*
 * One markup tree for every width. Below `md` the chart is a single stack on
 * the reading edge — connectors run down the start side and every bus and drop
 * is hidden — and from `md` the same elements centre and the rows spread out.
 */

/** A vertical connector from the level above. Drawn top-down (`gov-line`). */
export const Connector = () => (
  <span
    aria-hidden="true"
    data-part="connector"
    className="gov-line block h-[var(--space-8)] w-px ms-[var(--space-6)] bg-[color:var(--surface-border)] md:mx-auto"
  />
);

/** A horizontal bus joining the centres of a row's outer columns. Desktop only. */
const Bus = ({ span }: { span: "half" | "two-thirds" }) => (
  <span
    aria-hidden="true"
    data-part="bus"
    className={`gov-line-x hidden h-px bg-[color:var(--surface-border)] md:mx-auto md:block ${
      span === "half" ? "md:w-1/2" : "md:w-2/3"
    }`}
  />
);

/** The short drop from a bus into one node. Desktop only. */
const Drop = () => (
  <span
    aria-hidden="true"
    className="gov-line hidden h-[var(--space-6)] w-px bg-[color:var(--surface-border)] md:mx-auto md:block"
  />
);

/**
 * One post in the chart: the position the admin named, and the person holding
 * it, as a link to their profile.
 */
const PostNode = ({ post, locale, step }: { post: AppointmentView; locale: AppLocale; step: number }) => (
  <Link
    href={`/${locale}/about/people/${post.person.slug}`}
    data-field="chart-node"
    className="brand-focusable gov-pop block h-full rounded-[var(--radius-md)]"
    style={revealStep(step)}
  >
    <Surface
      kind="raised"
      as="span"
      className="flex h-full min-h-[var(--space-12)] flex-col justify-center gap-[var(--space-1)] rounded-[var(--radius-md)] border border-[color:var(--surface-border)] px-[var(--space-5)] py-[var(--space-4)] text-start md:text-center"
    >
      <span data-part="position" className="text-label text-[color:var(--surface-text-muted)]">
        {say(post.position.title, locale)}
      </span>
      <span data-part="name" className="text-body font-bold">
        {nameOf(post.person, locale)}
      </span>
    </Surface>
  </Link>
);

/**
 * One rank of the board.
 *
 * The rank decides the shape: rank 1 is one wide node, rank 2 a pair under a
 * bracket, and every rank below that the member grid under a single bus. Posts
 * sharing a rank always share the row.
 */
export const ChartRow = ({ row, locale }: { row: OrgChartRow; locale: AppLocale }) => {
  const several = row.posts.length > 1;

  if (row.rank <= 1) {
    return (
      <ul data-part="row" data-rank={row.rank} className="flex flex-col gap-[var(--space-3)] md:mx-auto md:w-1/2">
        {row.posts.map((post, index) => (
          <li key={post.id}>
            <PostNode post={post} locale={locale} step={index} />
          </li>
        ))}
      </ul>
    );
  }

  if (row.rank === 2) {
    return (
      <div data-part="row" data-rank={row.rank} className="flex flex-col">
        {several ? <Bus span="half" /> : null}
        <ul className="grid gap-[var(--space-3)] md:grid-cols-2 md:gap-x-[var(--space-6)]">
          {row.posts.map((post, index) => (
            <li key={post.id} className="flex flex-col">
              {several ? <Drop /> : null}
              <PostNode post={post} locale={locale} step={index} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div data-part="row" data-rank={row.rank} className="flex flex-col gap-[var(--space-3)] md:gap-[var(--space-6)]">
      {several ? <Bus span="two-thirds" /> : null}
      <ul className="grid gap-[var(--space-3)] md:grid-cols-3 md:gap-[var(--space-6)]">
        {row.posts.map((post, index) => (
          <li key={post.id}>
            <PostNode post={post} locale={locale} step={index} />
          </li>
        ))}
      </ul>
    </div>
  );
};
