"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BilingualField } from "@/components/admin/bilingual-field";
import { ChoiceCard, ChoiceCardGroup } from "@/components/ui/choice-card";
import { SelectField } from "@/components/ui/select-field";
import { SettingsCard } from "@/components/ui/settings-card";
import { SwitchField } from "@/components/ui/switch-field";
import { useUnsavedGuard } from "@/lib/admin/use-unsaved-guard";
import { ManualAlbumPicker } from "./manual-picker";
import { GALLERY_COUNTS, MAX_MANUAL_ALBUMS } from "./section-draft";
import type { GalleryMode, GallerySectionDraft } from "./section-draft";
import type { AdminAlbum } from "@/lib/admin/albums/types";

/**
 * The homepage's photo-gallery section, as its editor draws it.
 *
 * The video section's editor, re-cut for this section's four settings: whether
 * it is shown, what it says, whether it follows the newest albums or a chosen
 * list, and how many cards it draws. Built from the same shared settings
 * primitives — `SettingsCard`, `ChoiceCard`, `SwitchField` — so the two
 * sections read as one screen family.
 *
 * Save lives in the page header, as on the video section; `onDirtyChange` is
 * how the header knows whether to enable it.
 */
export const GallerySectionEditor = ({
  initial,
  onSave,
  onDirtyChange,
  albums,
  albumsReadable,
  locale,
}: {
  initial: GallerySectionDraft;
  onSave: (draft: GallerySectionDraft) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Published albums, newest occasion first. */
  albums: readonly AdminAlbum[];
  /** False when the album list was refused: the picker then says why it is
   *  empty rather than claiming nothing is published. */
  albumsReadable: boolean;
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Albums");
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const countId = useId();

  useUnsavedGuard(dirty);

  const set = <K extends keyof GallerySectionDraft>(key: K, value: GallerySectionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (!dirty) {
      setDirty(true);
      onDirtyChange?.(true);
    }
  };

  return (
    <form
      id="gallery-section-form"
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setDirty(false);
        onDirtyChange?.(false);
        onSave(draft);
      }}
    >
      {/* 1. Whether the section is drawn at all. */}
      <SettingsCard
        title={t("gallerySectionTitle")}
        description={t("gallerySectionSubtitle")}
        actions={
          <SwitchField
            id="gallery-enabled"
            label={t("gallerySectionShow")}
            checked={draft.enabled}
            onChange={(enabled) => set("enabled", enabled)}
          />
        }
      />

      {/* 2. Its words. One bilingual pair per row, as on the video section. */}
      <SettingsCard title={t("galleryTexts")} as="h3">
        <div className="flex flex-col gap-5">
          <BilingualField
            id="gallery-eyebrow"
            labelAr={t("galleryEyebrowAr")}
            labelEn={t("galleryEyebrowEn")}
            valueAr={draft.eyebrow.ar}
            valueEn={draft.eyebrow.en}
            onChangeAr={(value) => set("eyebrow", { ...draft.eyebrow, ar: value })}
            onChangeEn={(value) => set("eyebrow", { ...draft.eyebrow, en: value })}
          />
          <BilingualField
            id="gallery-heading"
            labelAr={t("galleryHeadingAr")}
            labelEn={t("galleryHeadingEn")}
            valueAr={draft.heading.ar}
            valueEn={draft.heading.en}
            onChangeAr={(value) => set("heading", { ...draft.heading, ar: value })}
            onChangeEn={(value) => set("heading", { ...draft.heading, en: value })}
          />
          <BilingualField
            id="gallery-description"
            labelAr={t("galleryDescriptionAr")}
            labelEn={t("galleryDescriptionEn")}
            valueAr={draft.description.ar}
            valueEn={draft.description.en}
            onChangeAr={(value) => set("description", { ...draft.description, ar: value })}
            onChangeEn={(value) => set("description", { ...draft.description, en: value })}
          />
        </div>
      </SettingsCard>

      {/* 3. Which albums, and how many. */}
      <SettingsCard title={t("galleryAlbums")} as="h3">
        <ChoiceCardGroup legend={t("galleryMode")} columns={2}>
          {(["latest", "manual"] as const).map((mode) => (
            <ChoiceCard<GalleryMode>
              key={mode}
              name="galleryMode"
              value={mode}
              checked={draft.mode === mode}
              onSelect={(value) => set("mode", value)}
              title={t(`galleryMode_${mode}`)}
              description={t(`galleryMode_${mode}Hint`)}
            />
          ))}
        </ChoiceCardGroup>

        <div className="md:max-w-[calc(50%-0.625rem)]">
          <SelectField
            id={countId}
            label={t("galleryCount")}
            value={String(draft.count)}
            onChange={(event) => set("count", Number(event.target.value))}
            options={GALLERY_COUNTS.map((count) => ({ value: String(count), label: String(count) }))}
            hint={t("galleryCountHint", { count: draft.count })}
          />
        </div>

        {draft.mode === "manual" ? (
          albumsReadable ? (
            <ManualAlbumPicker
              albums={albums}
              chosen={draft.albumIds}
              limit={MAX_MANUAL_ALBUMS}
              count={draft.count}
              locale={locale}
              onChange={(next) => set("albumIds", next)}
            />
          ) : (
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("galleryAlbumsUnreadable")}</p>
          )
        ) : null}
      </SettingsCard>

      {/* The header's Save submits this form by id; this hidden twin keeps
          Enter in a text field saving too. */}
      <Button type="submit" className="sr-only">
        {t("save")}
      </Button>
    </form>
  );
};
