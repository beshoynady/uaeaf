"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { UploadItem } from "@/lib/admin/albums/upload-queue";

/**
 * The files of the current batch, each with its own progress and outcome.
 *
 * Per file, because a batch is not one thing: three of forty failing must not
 * read as the batch failing, and the three must each be retryable without
 * sending the thirty-seven again.
 *
 * The bar is the platform's `<progress>`, tinted with the brand token through
 * `accent-color` — a native element carries its own role and value for a
 * screen reader, which a drawn bar would have to fake.
 */
export const UploadList = ({
  items,
  describe,
  onRetry,
  onDismiss,
  onClearDone,
}: {
  items: readonly UploadItem[];
  /** A write-error code, in words. */
  describe: (code: string) => string;
  onRetry: (key: string) => void;
  onDismiss: (key: string) => void;
  onClearDone: () => void;
}) => {
  const t = useTranslations("Albums");
  if (items.length === 0) return null;

  const doneCount = items.filter((item) => item.status === "done").length;
  const failedCount = items.filter((item) => item.status === "failed").length;

  const reason = (item: UploadItem): string => {
    if (item.error === "wrongType" || item.error === "tooLarge" || item.error === "aborted") {
      return t(`upload_${item.error}`);
    }
    return describe(item.error ?? "serviceUnavailable");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The batch's standing, announced as it changes. */}
        <p role="status" className="text-body-sm text-[color:var(--color-text-secondary)]">
          {t("uploadSummary", { done: doneCount, total: items.length, failed: failedCount })}
        </p>
        {doneCount > 0 ? (
          <Button variant="ghost" onClick={onClearDone}>
            {t("clearDone")}
          </Button>
        ) : null}
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex flex-col gap-2 rounded-[var(--radius-md)] border px-3 py-2 ${
              item.status === "failed"
                ? "border-[color:var(--color-semantic-error)]"
                : "border-[color:var(--color-border-default)]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* A file name is whatever the camera wrote; `auto` keeps it in
                  its own direction inside either language. */}
              <span dir="auto" className="min-w-0 truncate text-body-sm font-medium text-[color:var(--color-text-primary)]">
                {item.file.name}
              </span>
              <span className="text-caption text-[color:var(--color-text-secondary)]">
                {item.status === "uploading"
                  ? t("uploadProgress", { percent: Math.round(item.progress * 100) })
                  : t(`uploadStatus_${item.status}`)}
              </span>
            </div>

            {item.status === "uploading" || item.status === "queued" ? (
              <progress
                value={item.progress}
                max={1}
                aria-label={t("uploadProgressLabel", { name: item.file.name })}
                className="h-2 w-full accent-[color:var(--color-brand-primary)]"
              />
            ) : null}

            {item.status === "failed" ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-caption font-medium text-[color:var(--color-text-primary)]">{reason(item)}</p>
                <div className="flex gap-2">
                  {item.retryable ? (
                    <Button variant="secondary" onClick={() => onRetry(item.key)}>
                      {t("retryUpload")}
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => onDismiss(item.key)}>
                    {t("dismissUpload")}
                  </Button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};
