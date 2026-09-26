"use client";

import { useTranslations } from "next-intl";
import { BUTTON_ICON, SELECTABLE_ROW } from "@/components/ui/interactive";
import { UiIcon } from "@/lib/icons/ui-icons";
import { moveAlbum } from "./section-draft";
import type { AdminAlbum } from "@/lib/admin/albums/types";

/**
 * The albums the homepage shows in manual mode, in the order it shows them.
 *
 * Two lists in the page: the chosen ones, numbered, each with "move up",
 * "move down" and "remove"; and the published albums not yet chosen, each one
 * press to add at the end. Buttons rather than drag here: the list is at most
 * eight long, and one press per place is both the keyboard path and quick
 * enough for a pointer.
 *
 * A chosen id that no longer names a published album (unpublished or deleted
 * since) is still listed, marked as such, so the editor can see why the
 * homepage shows fewer cards than they picked and remove it.
 */
export const ManualAlbumPicker = ({
  albums,
  chosen,
  limit,
  count,
  locale,
  onChange,
}: {
  albums: readonly AdminAlbum[];
  chosen: readonly string[];
  /** The most the list can hold. */
  limit: number;
  /** How many the homepage draws. */
  count: number;
  locale: "ar" | "en";
  onChange: (next: string[]) => void;
}) => {
  const t = useTranslations("Albums");
  const byId = new Map(albums.map((album) => [album.id, album]));
  const titleOf = (album: AdminAlbum) => album.title[locale] || album.title.ar || album.title.en;
  const available = albums.filter((album) => !chosen.includes(album.id));
  const full = chosen.length >= limit;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="gallery-chosen-title" className="flex flex-col gap-3">
        <h4 id="gallery-chosen-title" className="text-label font-bold text-[color:var(--color-text-primary)]">
          {t("manualChosenTitle", { count: chosen.length, limit })}
        </h4>

        {chosen.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-4 py-6 text-center text-body-sm text-[color:var(--color-text-secondary)]">
            {t("manualEmpty")}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {chosen.map((id, index) => {
              const album = byId.get(id);
              const name = album ? titleOf(album) : t("manualMissing");
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] ps-3"
                >
                  <span className="w-6 shrink-0 text-caption font-bold text-[color:var(--color-text-secondary)]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-sm text-[color:var(--color-text-primary)]">{name}</span>
                  {index >= count ? (
                    <span className="shrink-0 text-caption text-[color:var(--color-semantic-warning-text)]">
                      {t("manualBeyondCount")}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={t("manualMoveUp", { name })}
                    disabled={index === 0}
                    onClick={() => {
                      const next = moveAlbum(chosen, id, -1);
                      if (next) onChange(next);
                    }}
                    className={BUTTON_ICON}
                  >
                    <UiIcon name="arrow-up" className="size-[var(--icon-size-xs)]" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("manualMoveDown", { name })}
                    disabled={index === chosen.length - 1}
                    onClick={() => {
                      const next = moveAlbum(chosen, id, 1);
                      if (next) onChange(next);
                    }}
                    className={BUTTON_ICON}
                  >
                    <UiIcon name="arrow-down" className="size-[var(--icon-size-xs)]" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("manualRemove", { name })}
                    onClick={() => onChange(chosen.filter((entry) => entry !== id))}
                    className={BUTTON_ICON}
                  >
                    <UiIcon name="x" className="size-[var(--icon-size-xs)]" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="gallery-available-title" className="flex flex-col gap-3">
        <h4 id="gallery-available-title" className="text-label font-bold text-[color:var(--color-text-primary)]">
          {t("manualAvailableTitle")}
        </h4>
        {full ? <p className="text-caption text-[color:var(--color-text-secondary)]">{t("manualFull", { limit })}</p> : null}
        {available.length === 0 ? (
          <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("manualNoneAvailable")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {available.map((album) => (
              <li key={album.id}>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => onChange([...chosen, album.id])}
                  aria-label={t("manualAdd", { name: titleOf(album) })}
                  className={`${SELECTABLE_ROW} flex items-center justify-between gap-3`}
                >
                  <span className="min-w-0 truncate text-body-sm text-[color:var(--color-text-primary)]">{titleOf(album)}</span>
                  <UiIcon name="plus" className="size-[var(--icon-size-xs)] shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
