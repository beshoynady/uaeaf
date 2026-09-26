"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TextField } from "@/components/auth/text-field";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/admin/albums/upload-queue";

/**
 * Where photos are added: dropped on the zone, or chosen with the file field.
 *
 * The file field is the real control and the zone is a larger target around
 * it. A drop zone alone is pointer-only; the field inside it is what a keyboard
 * and a screen reader use, and it is the shared `TextField` so it has the same
 * label, edge and focus ring as every other field on the page.
 *
 * Only file drags are accepted here. A photo being dragged within the grid
 * carries no files, and treating it as a drop would be a no-op that swallows
 * the reorder.
 */
export const PhotoDropzone = ({ disabled, onFiles }: { disabled: boolean; onFiles: (files: File[]) => void }) => {
  const t = useTranslations("Albums");
  const [active, setActive] = useState(false);

  const carriesFiles = (event: React.DragEvent) => event.dataTransfer.types.includes("Files");

  return (
    <div
      onDragOver={(event) => {
        if (disabled || !carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        setActive(false);
        if (!disabled) onFiles([...event.dataTransfer.files]);
      }}
      className={`flex flex-col gap-4 rounded-[var(--radius-lg)] border-2 border-dashed p-6 ${
        active
          ? "border-[color:var(--color-brand-primary)] bg-[color:var(--color-surface-sunken)]"
          : "border-[color:var(--color-border-strong)]"
      }`}
    >
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold text-[color:var(--color-text-primary)]">{t("dropTitle")}</p>
        <p className="text-caption text-[color:var(--color-text-secondary)]">{t("dropHint")}</p>
      </div>

      <TextField
        id="album-photo-files"
        label={t("chooseFiles")}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        disabled={disabled}
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          // Cleared, so choosing the same file again after a failure still
          // fires a change.
          event.target.value = "";
        }}
      />
    </div>
  );
};
