import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { AppointmentView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { Portrait } from "../shared/portrait";
import { nameOf, say, termYears } from "../shared/text";
import { ArrowForwardIcon } from "./board-icons";

/**
 * The chairman, drawn on his own on the page's green register.
 *
 * The single highest-ranked board post, however the admin named it: the
 * position title printed here is the record's, never a literal. Nothing is
 * drawn when the post is vacant — an empty panel would read as a person whose
 * record failed to load.
 */
export const BoardChairman = async ({ chairman, locale }: { chairman: AppointmentView | null; locale: AppLocale }) => {
  if (!chairman) return null;

  const [t, tGov] = await Promise.all([
    getTranslations({ locale, namespace: "Board" }),
    getTranslations({ locale, namespace: "Gov" }),
  ]);

  return (
    <Surface kind="brand-green" id="chairman">
      <div
        className={`${CONTAINER} grid items-center gap-[var(--space-8)] py-12 md:grid-cols-3 md:gap-[var(--space-12)] md:py-16 lg:py-24`}
      >
        <div className="gov-flip md:col-span-1" style={revealStep(0)}>
          <Portrait shape="panel" label={tGov("photoPending")} className="aspect-[4/5] w-full" />
        </div>

        <div className="flex flex-col items-start gap-[var(--space-4)] md:col-span-2">
          <span data-part="eyebrow" className="text-label font-bold">
            {t("chairmanEyebrow")}
          </span>
          <h2 data-field="chairman.name" className="text-h2">
            {nameOf(chairman.person, locale)}
          </h2>
          <p data-field="chairman.position" className="text-body text-[color:var(--surface-text-muted)]">
            {say(chairman.position.title, locale)}
          </p>

          <p
            data-part="cycle"
            className="inline-flex flex-wrap items-center gap-x-[var(--space-2)] rounded-[var(--radius-full)] border border-[color:var(--surface-border)] px-[var(--space-4)] py-[var(--space-1)] text-label"
          >
            <span className="brand-visually-hidden">{tGov("term")}</span>
            <span>{say(chairman.cycle.label, locale)}</span>
            <span aria-hidden="true">·</span>
            <span>{termYears(chairman, locale, tGov("current"))}</span>
          </p>

          <Link
            href={`/${locale}/about/people/${chairman.person.slug}`}
            className="brand-focusable inline-flex min-h-[var(--space-12)] items-center gap-[var(--space-2)] text-label font-bold text-[color:var(--surface-link)]"
          >
            {tGov("fullProfile")}
            <span className="brand-visually-hidden">{nameOf(chairman.person, locale)}</span>
            <ArrowForwardIcon className="size-[var(--space-4)]" />
          </Link>
        </div>
      </div>
    </Surface>
  );
};
