"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/ui/settings-card";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { InlineConfirm } from "./inline-confirm";
import { titleOf } from "./album-row-parts";
import { useAlbumWrite } from "@/lib/admin/albums/use-album-write";
import type { AdminAlbum } from "@/lib/admin/albums/types";

/**
 * Deleting the album, last on its page and behind a second press.
 *
 * Its own write and its own failure line, apart from the form's: a refused
 * delete must not be read as a refused save, and a save's failure must not sit
 * next to the delete button as if it were the delete's.
 */
export const AlbumDeleteZone = ({ album, locale }: { album: AdminAlbum; locale: "ar" | "en" }) => {
  const t = useTranslations("Albums");
  const router = useRouter();
  const toast = useToast();
  const { busy, failure, send } = useAlbumWrite();
  const [confirming, setConfirming] = useState(false);

  const remove = async () => {
    const outcome = await send(`/api/admin/albums/${album.id}`, { method: "DELETE" }, { refresh: false });
    setConfirming(false);
    if (!outcome.ok) return;
    toast.show({
      tone: "success",
      title: t("deletedToast"),
      description: titleOf(album.title, locale),
      source: "api",
      dedupeKey: "albums:deleted",
    });
    router.push("/albums");
  };

  return (
    <SettingsCard title={t("deleteZoneTitle")} description={t("deleteZoneBody")} as="h3">
      <WriteFailure message={failure} />
      {confirming ? (
        <InlineConfirm
          message={t("deleteConfirmBody", { title: titleOf(album.title, locale) })}
          confirmLabel={t("confirmDelete")}
          cancelLabel={t("cancel")}
          busy={busy}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <div>
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            {t("deleteAlbum")}
          </Button>
        </div>
      )}
    </SettingsCard>
  );
};
