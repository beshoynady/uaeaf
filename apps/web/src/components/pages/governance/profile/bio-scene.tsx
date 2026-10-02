import { useTranslations } from "next-intl";
import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { PersonProfileView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { say } from "../shared/text";
import { SCENE_HAS, SCENE_SCROLL_MARGIN } from "./profile-scenes";
import { SceneHeading } from "./scene-heading";

/**
 * The archive photograph's place, under the green wash the design lays on it.
 *
 * No archive picture has been supplied, so the slot holds its shape and says
 * what belongs in it. The frame clips and the inner layer travels, which is how
 * the stylesheet expresses a wipe without animating `clip-path`.
 */
const ArchivePhoto = ({ label }: { label: string }) => (
  <figure
    data-part="archive-photo"
    className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-[color:var(--surface-tile-edge)]"
  >
    <div aria-hidden="true" className="gov-wipe-inner absolute inset-0 bg-[color:var(--surface-tile-fill)]">
      <Surface kind="brand-green" as="div" className="absolute inset-0 opacity-[var(--opacity-scrim-photo)]" />
    </div>
    <figcaption className="absolute bottom-[var(--space-4)] start-[var(--space-4)] rounded-[var(--radius-sm)] bg-[color:var(--surface-bg)] px-[var(--space-2)] py-[var(--space-1)] text-label">
      {label}
    </figcaption>
  </figure>
);

/**
 * `#bio` — who they are.
 *
 * Ink in both themes: it is a photograph scene. Each word is its own span so
 * the stylesheet can light it as the reader reaches it; the words are inline,
 * which keeps Arabic joining and line breaking exactly as the text is written.
 */
export const BioScene = ({
  profile,
  locale,
  number,
}: {
  profile: PersonProfileView;
  locale: AppLocale;
  number: number;
}) => {
  const t = useTranslations("Person");
  if (!SCENE_HAS.bio(profile)) return null;

  const words = say(profile.person.bio, locale).split(/\s+/).filter(Boolean);

  return (
    <Surface kind="ink" mesh id="bio" className={SCENE_SCROLL_MARGIN}>
      <div
        className={`${CONTAINER} grid gap-[var(--space-10)] py-[var(--space-16)] lg:grid-cols-12 lg:py-[var(--space-24)]`}
      >
        <div className="flex flex-col gap-[var(--space-8)] lg:col-span-7">
          <SceneHeading number={number} label={t("bioTitle")} title={t("bioHeading")} />

          <p data-field="bio" className="text-body-lg">
            {words.map((word, index) => (
              <span key={`${word}-${index}`}>
                {index > 0 ? " " : null}
                <span className="gov-ink" style={revealStep(index)}>
                  {word}
                </span>
              </span>
            ))}
          </p>
        </div>

        <div className="lg:col-span-5">
          <ArchivePhoto label={t("archivePhoto")} />
        </div>
      </div>
    </Surface>
  );
};
