import Link from "next/link";
import { BrandBorder, Surface } from "@uaeaf/brand-ui";

import type { AppLocale } from "@/i18n/routing";
import type { AppointmentView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { Portrait } from "./portrait";
import { nameOf, say } from "./text";

/**
 * One person holding one post.
 *
 * The board draws these in a grid, a committee draws them beneath its chair,
 * and the profile's closing scene draws them small. One component because the
 * card is the same object in all three — a portrait, the post, the name — and
 * the differences are size, which `className` carries.
 *
 * The post's title comes from the position record, never from a list of roles
 * in the code: the admin names every position, so a card that printed
 * "Board Member" from a lookup would print the wrong thing the moment a
 * position is renamed.
 *
 * The whole card is one link to the profile rather than a link on the name
 * with the portrait inert beside it: two targets to the same address read as
 * two destinations to a screen reader, and the portrait is the larger target.
 */
export const PersonCard = ({
  post,
  locale,
  photoLabel,
  step = 0,
  compact = false,
  showCommittee = true,
}: {
  post: AppointmentView;
  locale: AppLocale;
  photoLabel: string;
  /** Position in its grid, for the staggered reveal. */
  step?: number;
  /** The closing scene's smaller row, portrait beside the name. */
  compact?: boolean;
  /** Off on a committee's own page, where the line names that committee again. */
  showCommittee?: boolean;
}) => (
  <BrandBorder variant="hover" className="h-full gov-pop" style={revealStep(step)}>
    <Link
      href={`/${locale}/about/people/${post.person.slug}`}
      data-field="person-card"
        className="brand-focusable brand-focus-wide block h-full"
    >
      <Surface
        kind="raised"
        as="article"
        className={
          compact
            ? "flex h-full items-center gap-[var(--space-4)] p-[var(--space-4)]"
            : "flex h-full flex-col gap-[var(--space-3)] p-[var(--space-6)]"
        }
      >
        <Portrait
          shape={compact ? "circle" : "panel"}
          label={photoLabel}
          className={compact ? "size-[var(--space-12)] shrink-0" : "aspect-[4/5] w-full"}
        />

        <div className="flex min-w-0 flex-col gap-[var(--space-1)]">
          <p data-part="position" className="text-label text-[color:var(--surface-text-muted)]">
            {say(post.position.title, locale)}
          </p>
          <h3 data-part="name" className={compact ? "text-body font-bold" : "text-h4"}>
            {nameOf(post.person, locale)}
          </h3>

          {/* The committee they chair, when the post is a committee post. A
              board member who chairs nothing simply has no second line. */}
          {post.committee && showCommittee ? (
            <p data-part="committee" className="text-body-sm text-[color:var(--surface-text-muted)]">
              {say(post.committee.name, locale)}
            </p>
          ) : null}
        </div>
      </Surface>
    </Link>
  </BrandBorder>
);
