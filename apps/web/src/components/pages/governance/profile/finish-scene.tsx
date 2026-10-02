import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandAccentBar, BrandBorder, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { PersonProfileView, PersonSummary } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { Portrait } from "../shared/portrait";
import { nameOf } from "../shared/text";
import { ContactBlock } from "./contact-block";
import { ArrowForwardIcon } from "./icons";
import { publicContactOf, SCENE_HAS, SCENE_SCROLL_MARGIN, sceneLabelKey } from "./profile-scenes";
import { SceneHeading } from "./scene-heading";

/**
 * Another person, drawn the way `PersonCard` draws its compact row.
 *
 * Local rather than `PersonCard` itself because `others` arrives as people,
 * not posts, and `PersonCard` needs a post for its position line. Inventing a
 * post to satisfy it would print a title the record never gave.
 */
const OtherPerson = ({
  person,
  locale,
  photoLabel,
  step,
}: {
  person: PersonSummary;
  locale: AppLocale;
  photoLabel: string;
  step: number;
}) => (
  <BrandBorder variant="hover" className="h-full gov-pop" style={revealStep(step)}>
    <Link
      href={`/${locale}/about/people/${person.slug}`}
      data-field="person-card"
      className="brand-focusable brand-focus-wide block h-full"
    >
      <Surface
        kind="raised"
        as="article"
        className="flex h-full items-center gap-[var(--space-4)] p-[var(--space-4)]"
      >
        <Portrait shape="circle" label={photoLabel} className="size-[var(--space-12)] shrink-0" />
        <h3 data-part="name" className="min-w-0 text-body font-bold">
          {nameOf(person, locale)}
        </h3>
      </Surface>
    </Link>
  </BrandBorder>
);

/** The finish line: a chequered band and the identity edge, each stretching in. */
const FinishTape = () => (
  <div aria-hidden="true" className="flex flex-col">
    <div className="gov-tape h-[var(--space-4)] bg-[image:repeating-conic-gradient(var(--surface-text)_0_25%,transparent_0_50%)] bg-[length:var(--space-4)_var(--space-4)]" />
    <div className="gov-tape">
      <BrandAccentBar />
    </div>
  </div>
);

/**
 * `#finish` — the other members, the way to all of them, and the contact
 * details when the record publishes them.
 *
 * With nobody else to show the scene is the contact block alone and takes its
 * heading from it; with neither it does not render. Inverts with the theme.
 */
export const FinishScene = ({
  profile,
  locale,
  number,
}: {
  profile: PersonProfileView;
  locale: AppLocale;
  number: number;
}) => {
  const t = useTranslations("Person");
  const gov = useTranslations("Gov");
  if (!SCENE_HAS.finish(profile)) return null;

  const contact = publicContactOf(profile);
  const hasOthers = profile.others.length > 0;

  return (
    <Surface kind="canvas" id="finish" className={SCENE_SCROLL_MARGIN}>
      <FinishTape />

      <div className={`${CONTAINER} flex flex-col gap-[var(--space-10)] py-[var(--space-16)] lg:py-[var(--space-24)]`}>
        <SceneHeading
          number={number}
          label={t(sceneLabelKey("finish", profile))}
          title={hasOthers ? t("finishHeading") : t("contactTitle")}
        />

        {hasOthers ? (
          <div className="flex flex-col gap-[var(--space-6)]">
            <ul data-field="others" className="grid gap-[var(--space-4)] sm:grid-cols-2 xl:grid-cols-4">
              {profile.others.map((person, index) => (
                <li key={person.id}>
                  <OtherPerson person={person} locale={locale} photoLabel={gov("photoPending")} step={index} />
                </li>
              ))}
            </ul>

            <Link
              href={`/${locale}/about/board-members`}
              data-field="all-members"
              className="brand-focusable inline-flex min-h-[var(--space-12)] w-fit items-center gap-[var(--space-2)] text-body font-bold text-[color:var(--surface-link)]"
            >
              {gov("allMembers")}
              <ArrowForwardIcon />
            </Link>
          </div>
        ) : null}

        {contact ? <ContactBlock contact={contact} asScene={!hasOthers} /> : null}
      </div>
    </Surface>
  );
};
