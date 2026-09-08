"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { localized, type LocalizedText } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/** One image from the media library, as this picker needs it. */
export interface MediaAssetOption {
  id: string;
  caption: LocalizedText;
  url: string;
}

/**
 * Choosing the image behind a page's header.
 *
 * A grid of thumbnails rather than a list of ids: the field is "which
 * picture", and a caption is not enough to answer that. The current choice
 * stays visible while the library is closed, so the common case — opening a
 * page to change its wording, not its image — costs nothing.
 *
 * `images` is empty when the editor lacks `mediaAssets:Read`. The library is
 * then not shown at all, with a line saying why: the stored image is still
 * saved back untouched, so a missing grant cannot silently clear it.
 */
export function MediaPicker({
  label,
  value,
  images,
  canRead,
  disabled,
  locale,
  onChange,
}: {
  label: string;
  value: string;
  images: readonly MediaAssetOption[];
  /** False when `mediaAssets:Read` is not held. */
  canRead: boolean;
  disabled: boolean;
  locale: AppLocale;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("SitePages");
  const [open, setOpen] = useState(false);

  const chosen = images.find((image) => image.id === value) ?? null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-label font-medium text-[color:var(--color-text-secondary)]">
        {label}
      </legend>

      {!canRead ? (
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("imageHidden")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Thumbnail image={chosen} emptyLabel={t("noImage")} locale={locale} />
            <button
              type="button"
              disabled={disabled}
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
              className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-4 text-label text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] active:bg-[color:var(--color-surface-skeleton)]"
            >
              {t("chooseImage")}
            </button>
            {value ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange("")}
                className="h-10 rounded-[var(--radius-md)] px-3 text-label text-[color:var(--color-text-secondary)] underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] hover:text-[color:var(--color-text-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed active:bg-[color:var(--color-surface-skeleton)]"
              >
                {t("noImage")}
              </button>
            ) : null}
          </div>

          {open ? (
            images.length === 0 ? (
              <p className="text-caption text-[color:var(--color-text-muted)]">{t("noImages")}</p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {images.map((image) => {
                  const selected = image.id === value;
                  return (
                    <li key={image.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={selected}
                        onClick={() => {
                          onChange(image.id);
                          setOpen(false);
                        }}
                        className={`flex w-full flex-col gap-2 rounded-[var(--radius-md)] border p-2 text-start transition-colors duration-[var(--motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] ${
                          selected
                            ? "border-[color:var(--color-brand-primary)] bg-[color:color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-surface-base))]"
                            : "border-[color:var(--color-border-default)] hover:border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface-skeleton)]"
                        }`}
                      >
                        {/* Plain <img>: these are absolute CDN URLs whose host
                            is not known at build time, which next/image cannot
                            be configured for without inventing a domain list. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt=""
                          loading="lazy"
                          className="h-[84px] w-full rounded-[var(--radius-sm)] object-cover"
                        />
                        <span className="line-clamp-2 text-caption text-[color:var(--color-text-primary)]">
                          {localized(image.caption, locale)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </>
      )}
    </fieldset>
  );
}

function Thumbnail({
  image,
  emptyLabel,
  locale,
}: {
  image: MediaAssetOption | null;
  emptyLabel: string;
  locale: AppLocale;
}) {
  if (!image) {
    return (
      <span className="flex h-[64px] w-[112px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[color:var(--color-border-default)] text-caption text-[color:var(--color-text-muted)]">
        {emptyLabel}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={localized(image.caption, locale)}
      className="h-[64px] w-[112px] shrink-0 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] object-cover"
    />
  );
}
