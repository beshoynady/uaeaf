"use client";

import { useTranslations } from "next-intl";
import { FormSection } from "@/components/ui/form-section";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import { CREATABLE_ALBUM_STATES } from "@/lib/admin/albums/types";
import type { AdminAlbum, AlbumState } from "@/lib/admin/albums/types";
import type { SectionProps } from "./form-types";

/**
 * 4. Whether the album is on the public site, and whether it leads it.
 *
 * -- Which states the select offers -----------------------------------------
 *
 * Only the moves the API can make. A new album is created as a draft or
 * archived, and "published" is the create followed by `:id/publish` — offered
 * only to a holder of `albums:Publish`. An existing album cannot change state
 * through its edit at all (`UpdateAlbumDto` omits it), so it can only go
 * forward to published, and once published there is no route back: the select
 * then shows the state, disabled, with that said beside it.
 *
 * -- The featured switch -----------------------------------------------------
 *
 * One album leads the gallery. Turning the switch on makes this one the
 * holder, and the API clears the previous one in the same call. It cannot be
 * turned off — there is no route that leaves the gallery without a featured
 * album — so on the holder it is shown on and disabled, with the way to move
 * it named. And it needs the album published: a draft cannot lead a gallery.
 */
export const AlbumPublishingSection = ({
  record,
  canPublish,
  canUpdate,
  ...props
}: SectionProps & { record: AdminAlbum | null; canPublish: boolean; canUpdate: boolean }) => {
  const t = useTranslations("Albums");
  const { draft, set } = props;

  const stored = record?.publicationState ?? null;
  const states: AlbumState[] =
    stored === null
      ? [...CREATABLE_ALBUM_STATES, ...(canPublish ? (["Published"] as const) : [])]
      : stored === "Published"
        ? ["Published"]
        : [stored, ...(canPublish ? (["Published"] as const) : [])];

  const stateHint =
    stored === "Published"
      ? t("statePublishedFinal")
      : !canPublish
        ? t("stateNeedsPublishGrant")
        : stored === null
          ? t("stateCreateHint")
          : t("stateEditHint");

  const featuredLocked = record?.isFeatured === true;
  const featuredHint = featuredLocked
    ? t("featuredHolderHint")
    : draft.state !== "Published"
      ? t("featuredNeedsPublishedHint")
      : t("featuredHint");

  return (
    <FormSection number={4} title={t("sectionPublishing")}>
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField
          id="album-state"
          label={t("colStatus")}
          value={draft.state}
          disabled={states.length < 2}
          onChange={(event) => {
            const next = event.target.value as AlbumState;
            set("state", next);
            // Leaving "published" takes the featured request with it: it could
            // only have been asked for on a published album.
            if (next !== "Published" && !featuredLocked) set("featured", false);
          }}
          options={states.map((state) => ({ value: state, label: t(`state_${state}`) }))}
          hint={stateHint}
        />

        <SwitchField
          id="album-featured"
          label={t("featuredLabel")}
          checked={draft.featured}
          disabled={!canUpdate || featuredLocked || draft.state !== "Published"}
          onChange={(value) => set("featured", value)}
          hint={featuredHint}
        />
      </div>
    </FormSection>
  );
};
