"use client";

import { useCallback, useRef, useState } from "react";
import { AlbumViewer } from "@/components/shared/albums/album-viewer";
import type { ViewerPhoto } from "@/lib/albums/photo-window";
import type { AppLocale } from "@/i18n/routing";
import { readAlbumPhotos } from "@/app/[locale]/media/albums/_data/actions";
import {
  appendPhotoPage,
  createPhotoPager,
} from "@/app/[locale]/media/albums/_data/photo-pager";

/**
 * The album viewer with its later pages.
 *
 * The server renders the first page (or as many as it took to reach the
 * `?photo=` the address named); this holds what has arrived since and asks
 * for the next forty when the viewer says its window is reaching the end.
 * The in-flight guard and the append rule live in `photo-pager.ts`, where
 * they are tested without React.
 */
export const AlbumPhotos = ({
  slug,
  locale,
  photos: firstPhotos,
  total: firstTotal,
  initialPhotoId,
  id,
}: {
  slug: string;
  locale: AppLocale;
  photos: readonly ViewerPhoto[];
  total: number;
  initialPhotoId: string | null;
  id: string;
}) => {
  const [photos, setPhotos] = useState(firstPhotos);
  const [total, setTotal] = useState(firstTotal);
  // One pager for the component's life: the in-flight slot must survive
  // re-renders, or a render between two calls would open a second one.
  const pager = useRef(
    createPhotoPager((skip) => readAlbumPhotos(slug, skip, locale)),
  );

  // Stable between pages, so the viewer's effect re-runs only when the count
  // it compares against has actually changed.
  const requestMore = useCallback(() => {
    void pager.current(photos.length, total).then((page) => {
      if (!page) return;
      setPhotos((held) => appendPhotoPage(held, page));
      setTotal(page.total);
    });
  }, [photos.length, total]);

  return (
    <AlbumViewer
      photos={photos}
      total={total}
      initialPhotoId={initialPhotoId}
      onRequestMore={requestMore}
      id={id}
    />
  );
};
