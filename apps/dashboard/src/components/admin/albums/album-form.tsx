"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { RequiredHint } from "@/components/ui/required-field";
import { StickyFormActions } from "@/components/ui/sticky-form-actions";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { BackToAlbums } from "./album-links";
import { AlbumAffiliationSection } from "./album-affiliation-section";
import { AlbumBasicsSection } from "./album-basics-section";
import { AlbumDeleteZone } from "./album-delete-zone";
import { AlbumOccasionSection } from "./album-occasion-section";
import { AlbumPublishingSection } from "./album-publishing-section";
import { InlineConfirm } from "./inline-confirm";
import { suggestSlug } from "@/lib/admin/articles";
import { draftFromAlbum, draftProblems, toCreateBody, toPatchBody } from "@/lib/admin/albums/album-draft";
import { useAlbumWrite } from "@/lib/admin/albums/use-album-write";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import type { AlbumDraft } from "@/lib/admin/albums/album-draft";
import type { AlbumPermissions } from "@/lib/admin/albums/editor-screen";
import type { AdminAlbum, PersonOption } from "@/lib/admin/albums/types";
import type { DraftSetter } from "./form-types";

/**
 * Adding an album, and changing one — one component for both, as the video
 * form is: the two ask the same questions in the same order and differ in
 * where the answers go, whether the address can still be set, and which states
 * the album can move to.
 *
 * A full page with its own address, never an overlay: it can be linked to and
 * returned to, and the photo grid below it needs the whole width.
 *
 * -- What Save does ---------------------------------------------------------
 *
 * One request to the route handler, which writes the album and then — if the
 * editor asked — publishes it and makes it the featured album, in that order.
 * A new album then opens on its own edit page, because that is where its
 * photos are added: an album with no id has nowhere to upload them to.
 *
 * -- Save is never disabled -------------------------------------------------
 *
 * A disabled button says something is wrong and refuses to say what. The press
 * is answered with the problems instead, beside the fields that cause them,
 * and the first of them in the bar.
 */
export const AlbumForm = ({
  record,
  athletes: initialAthletes,
  clubs: initialClubs,
  permissions,
  locale,
  photos,
}: {
  record: AdminAlbum | null;
  athletes: readonly PersonOption[];
  clubs: readonly PersonOption[];
  permissions: AlbumPermissions;
  locale: "ar" | "en";
  /** The photo section, on an existing album. Drawn after the fields and
   *  before the delete zone, so the destructive act stays last on the page. */
  photos?: ReactNode;
}) => {
  const t = useTranslations("Albums");
  const router = useRouter();
  const toast = useToast();
  const { busy, failure, setFailure, send, json } = useAlbumWrite();

  const creating = record === null;
  const [draft, setDraft] = useState<AlbumDraft>(() => draftFromAlbum(record));
  const [athletes, setAthletes] = useState<PersonOption[]>([...initialAthletes]);
  const [clubs, setClubs] = useState<PersonOption[]>([...initialClubs]);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!creating);
  const [leaving, setLeaving] = useState(false);

  useUnsavedGuard(dirty);

  const set: DraftSetter = (key, value) => {
    setDirty(true);
    setFailure(null);
    setDraft((current) => {
      const next = { ...current, [key]: value };
      // The address follows the English title until the editor writes one.
      if (key === "titleEn" && !slugEdited) next.slug = suggestSlug(String(value));
      return next;
    });
  };

  const problems = draftProblems(draft, record);

  const save = async () => {
    // Judged at the press, from the draft as it is now (CLAUDE.md §31).
    if (draftProblems(draft, record).length > 0) {
      setShowErrors(true);
      return;
    }

    const wantsPublish = draft.state === "Published" && record?.publicationState !== "Published";
    const wantsFeature = draft.featured && record?.isFeatured !== true;
    const body = {
      album: creating ? toCreateBody(draft) : toPatchBody(draft),
      publish: wantsPublish,
      feature: wantsFeature,
    };

    const outcome = creating
      ? await send("/api/admin/albums", json(body), { refresh: false, savedMessage: t("savedPartly") })
      : await send(`/api/admin/albums/${record.id}`, json(body, "PATCH"), { savedMessage: t("savedPartly") });

    const title = draft.titleAr || draft.titleEn;
    if (!outcome.ok) {
      // Written but not published or featured: a new album exists now, so it
      // opens on its edit page, where the refusal is repeated as a toast.
      if (creating && outcome.saved && outcome.id) {
        setDirty(false);
        toast.show({ tone: "error", title: t("savedPartly"), description: title, source: "api" });
        router.push(`/albums/${outcome.id}/edit`);
      }
      return;
    }

    setDirty(false);
    setShowErrors(false);
    toast.show({
      tone: "success",
      title: creating ? t("createdToast") : t("updatedToast"),
      description: title,
      source: "api",
      dedupeKey: `albums:${creating ? "created" : "updated"}`,
    });

    if (creating) {
      const id = (outcome.body as { id?: unknown } | null)?.id;
      router.push(typeof id === "string" ? `/albums/${id}/edit` : "/albums");
    }
  };

  const leave = () => {
    // Read now, so work typed after this handler was wired still counts.
    if (dirty) {
      setLeaving(true);
      return;
    }
    router.push("/albums");
  };

  const sectionProps = { draft, set, problems, showErrors };

  return (
    <div className="flex flex-col gap-5">
      <BackToAlbums />

      <StickyFormActions
        status={showErrors && problems.length > 0 ? t(`problem_${problems[0]}`) : dirty ? t("unsaved") : t("formReady")}
        statusProps={{ "aria-live": "polite" }}
      >
        <Button variant="ghost" onClick={leave}>
          {t("cancel")}
        </Button>
        {permissions.canUpdate ? (
          <Button loading={busy} onClick={() => void save()}>
            {creating ? t("createAlbum") : t("saveChanges")}
          </Button>
        ) : null}
      </StickyFormActions>

      {leaving ? (
        <InlineConfirm
          message={t("leaveConfirmBody")}
          confirmLabel={t("leaveConfirmLeave")}
          cancelLabel={t("leaveConfirmStay")}
          onConfirm={() => {
            setLeaving(false);
            setDirty(false);
            router.push("/albums");
          }}
          onCancel={() => setLeaving(false)}
        />
      ) : null}

      <WriteFailure message={failure} />
      <RequiredHint />

      <AlbumBasicsSection {...sectionProps} creating={creating} onSlugEdited={() => setSlugEdited(true)} />
      <AlbumOccasionSection {...sectionProps} />
      <AlbumAffiliationSection
        {...sectionProps}
        athletes={athletes}
        clubs={clubs}
        onAthletesChange={(next) => {
          setAthletes(next);
          set("athleteIds", next.map((person) => person.id));
        }}
        onClubsChange={(next) => {
          setClubs(next);
          set("clubIds", next.map((person) => person.id));
        }}
        locale={locale}
      />
      <AlbumPublishingSection
        {...sectionProps}
        record={record}
        canPublish={permissions.canPublish}
        canUpdate={permissions.canUpdate}
      />

      {photos}

      {record && permissions.canDelete ? <AlbumDeleteZone album={record} locale={locale} /> : null}
    </div>
  );
};
