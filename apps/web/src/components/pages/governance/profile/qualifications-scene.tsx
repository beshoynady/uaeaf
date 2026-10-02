import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { CvEntry, PersonProfileView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { say } from "../shared/text";
import { SCENE_HAS, SCENE_SCROLL_MARGIN } from "./profile-scenes";
import { SceneHeading } from "./scene-heading";

/** One block of the record under its own `h3`, or nothing at all when the list is empty. */
const Block = ({
  field,
  title,
  entries,
  children,
}: {
  field: string;
  title: string;
  entries: readonly CvEntry[];
  children: ReactNode;
}) => {
  if (entries.length === 0) return null;

  return (
    <div data-field={field} className="flex flex-col gap-[var(--space-5)]">
      <h3 className="text-h4">{title}</h3>
      {children}
    </div>
  );
};

/**
 * `#qualifications` — the record's three lists.
 *
 * Ink in both themes, a cinema scene like the biography. Each list hides on
 * its own, so a person with certificates and nothing else shows the
 * certificates without two headings standing over nothing; the scene itself
 * goes only when all three are empty.
 */
export const QualificationsScene = ({
  profile,
  locale,
  number,
}: {
  profile: PersonProfileView;
  locale: AppLocale;
  number: number;
}) => {
  const t = useTranslations("Person");
  if (!SCENE_HAS.qualifications(profile)) return null;

  const { qualifications, certifications, previousPositions } = profile.person.cv;

  return (
    <Surface kind="ink" mesh id="qualifications" className={SCENE_SCROLL_MARGIN}>
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-12)] py-[var(--space-16)] lg:py-[var(--space-24)]`}>
        <SceneHeading number={number} label={t("qualificationsTitle")} title={t("qualificationsHeading")} />

        <Block field="qualifications" title={t("qualificationsTitle")} entries={qualifications}>
          <ul className="grid gap-[var(--space-4)] md:grid-cols-2 xl:grid-cols-3">
            {qualifications.map((entry, index) => (
              <li key={entry.id} className="gov-flip" style={revealStep(index)}>
                <Surface
                  kind="raised"
                  as="article"
                  className="flex h-full flex-col gap-[var(--space-2)] rounded-[var(--radius-lg)] p-[var(--space-6)]"
                >
                  <p className="text-body font-bold">{say(entry.title, locale)}</p>
                  {entry.detail ? (
                    <p className="text-body-sm text-[color:var(--surface-text-muted)]">{say(entry.detail, locale)}</p>
                  ) : null}
                </Surface>
              </li>
            ))}
          </ul>
        </Block>

        <Block field="certifications" title={t("certificatesTitle")} entries={certifications}>
          <ul className="flex flex-wrap gap-[var(--space-3)]">
            {certifications.map((entry, index) => (
              <li
                key={entry.id}
                className="gov-pop flex min-h-[var(--space-10)] items-center gap-[var(--space-2)] rounded-[var(--radius-full)] border border-[color:var(--surface-border)] px-[var(--space-4)] text-body-sm"
                style={revealStep(index)}
              >
                <span>{say(entry.title, locale)}</span>
                {entry.detail ? (
                  <span className="text-[color:var(--surface-text-muted)]">· {say(entry.detail, locale)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Block>

        <Block field="previous-positions" title={t("previousTitle")} entries={previousPositions}>
          <ul className="flex flex-col">
            {previousPositions.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-[var(--space-1)] border-b border-[color:var(--surface-divider)] py-[var(--space-4)] md:flex-row md:items-baseline md:justify-between md:gap-[var(--space-6)]"
              >
                <span className="text-body font-bold">{say(entry.title, locale)}</span>
                {entry.detail ? (
                  <span className="text-body-sm text-[color:var(--surface-text-muted)]">{say(entry.detail, locale)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </Surface>
  );
};
