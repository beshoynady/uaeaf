"use client";

import { memo } from "react";

import { useTranslations } from "next-intl";
import { HERO_IMAGE_MIN_WIDTH, isSmallImage } from "@uaeaf/content/hero";
import type { PointLike } from "@uaeaf/content/hero";
import { MediaPicker, type MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { AppLocale } from "@/i18n/routing";
import { FocalPointPicker } from "./focal-point-picker";

/**
 * One picture of a slide and the point its crop keeps.
 *
 * The library picker is the dashboard's own (`MediaPicker`), so choosing and
 * uploading work as on every other screen. Under the choice: its size, a
 * warning (never a refusal) when it is narrower than the hero needs to stay
 * sharp, the "temporary" mark on a generated picture, and the focal-point
 * picker with the text area of this picture shown.
 */
const HeroImageFieldView = ({
  id,
  label,
  assetId,
  focalPoint,
  onAsset,
  onFocalPoint,
  images,
  canRead,
  locale,
  onUploaded,
  device,
  textZone,
  error,
}: {
  id: string;
  label: string;
  assetId: string | null;
  focalPoint: PointLike | null;
  onAsset: (id: string) => void;
  onFocalPoint: (point: PointLike) => void;
  images: readonly MediaAssetOption[];
  canRead: boolean;
  locale: AppLocale;
  onUploaded: (image: MediaAssetOption) => void;
  device: "desktop" | "mobile";
  textZone: "right" | "left" | "bottom";
  error: string | null;
}) => {
  const t = useTranslations("HomepageHero");
  const chosen = assetId ? images.find((image) => image.id === assetId) : undefined;
  const small = chosen?.width !== undefined && isSmallImage(chosen.width, device);

  return (
    // A group, so the error below is read with the picture it is about.
    <div id={id} role="group" aria-describedby={error ? `${id}-error` : undefined} className="flex flex-col gap-3">
      <MediaPicker
        label={label}
        value={assetId ?? ""}
        images={images}
        canRead={canRead}
        disabled={false}
        locale={locale}
        onChange={onAsset}
        onUploaded={onUploaded}
      />
      {error ? (
        <p id={`${id}-error`} className="text-caption font-medium text-[color:var(--color-text-primary)]">
          {error}
        </p>
      ) : null}
      {chosen ? (
        <>
          <p className="flex flex-wrap items-center gap-2 text-caption text-[color:var(--color-text-secondary)]">
            {chosen.width && chosen.height ? <span dir="ltr">{t("dimensions", { width: chosen.width, height: chosen.height })}</span> : null}
            {chosen.isAiGenerated ? (
              <span className="rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-warning)] px-1.5 py-0.5 font-medium text-[color:var(--color-semantic-warning-text)]">
                {t("temporary")}
              </span>
            ) : null}
          </p>
          {small ? (
            <p role="status" className="rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-warning)] px-3 py-2 text-caption text-[color:var(--color-text-primary)]">
              {t(device === "mobile" ? "smallMobileImage" : "smallImage", { min: HERO_IMAGE_MIN_WIDTH[device] })}
            </p>
          ) : null}
          <FocalPointPicker
            imageUrl={chosen.url}
            width={chosen.width ?? (device === "mobile" ? 9 : 16)}
            height={chosen.height ?? (device === "mobile" ? 16 : 9)}
            value={focalPoint ?? { x: 50, y: 50 }}
            onChange={onFocalPoint}
            textZone={textZone}
            label={t("focalPoint")}
          />
        </>
      ) : null}
    </div>
  );
};

// Memoised: the screen re-renders on every keystroke, and this part only has to
// when its own props change (the props it receives are kept stable for that).
export const HeroImageField = memo(HeroImageFieldView);
