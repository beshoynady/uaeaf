"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PhotoTile } from "./photo-tile";
import { moveBy, moveTo } from "@/lib/admin/albums/photo-order";
import type { AlbumPhoto } from "@/lib/admin/albums/types";

/**
 * The album's photos, in order, arrangeable.
 *
 * Owns only the drag in progress — which photo is lifted and which it is over.
 * The order itself belongs to the section above, which sends it: this turns a
 * drop or a button press into "the complete order is now X" and hands that up.
 */
export const PhotoGrid = ({
  photos,
  coverId,
  selected,
  detailsId,
  canUpdate,
  busy,
  locale,
  onReorder,
  onCover,
  onSelect,
  onDetails,
}: {
  photos: readonly AlbumPhoto[];
  coverId: string | null;
  selected: ReadonlySet<string>;
  detailsId: string | null;
  canUpdate: boolean;
  busy: boolean;
  locale: "ar" | "en";
  onReorder: (order: string[]) => void;
  onCover: (photoId: string) => void;
  onSelect: (photoId: string, selected: boolean) => void;
  onDetails: (photoId: string) => void;
}) => {
  const t = useTranslations("Albums");
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const order = photos.map((photo) => photo.id);

  const drop = (targetId: string) => {
    const next = dragged ? moveTo(order, dragged, targetId) : null;
    setDragged(null);
    setOver(null);
    if (next) onReorder(next);
  };

  return (
    <ol aria-label={t("gridLabel")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo, index) => (
        <PhotoTile
          key={photo.id}
          photo={photo}
          index={index}
          count={photos.length}
          isCover={photo.id === coverId}
          selected={selected.has(photo.id)}
          detailsOpen={detailsId === photo.id}
          dropTarget={over === photo.id && dragged !== photo.id}
          canUpdate={canUpdate}
          busy={busy}
          locale={locale}
          onMove={(delta) => {
            const next = moveBy(order, photo.id, delta);
            if (next) onReorder(next);
          }}
          onCover={() => onCover(photo.id)}
          onSelect={(value) => onSelect(photo.id, value)}
          onDetails={() => onDetails(photo.id)}
          onDragStart={() => setDragged(photo.id)}
          onDragOver={() => setOver(photo.id)}
          onDrop={() => drop(photo.id)}
          onDragEnd={() => {
            setDragged(null);
            setOver(null);
          }}
        />
      ))}
    </ol>
  );
};
