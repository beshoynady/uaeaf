import type { PresidentMessageDraft } from "@/lib/admin/president-message";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { AppLocale } from "@/i18n/routing";

/**
 * What every section of this form receives.
 *
 * The draft is held once, by the editor, and each section edits its own part
 * of it through `onChange`. Sections hold no state of their own: two of them
 * read the same `signatoryName`, and a section that kept its own copy would
 * show one of them the stale one.
 */
export interface SectionProps {
  draft: PresidentMessageDraft;
  onChange: (patch: Partial<PresidentMessageDraft>) => void;
  /** True while saving, and for a reader who may not edit. */
  disabled: boolean;
}

/** The extra a section needs when it picks an image. */
export interface ImageSectionProps extends SectionProps {
  images: readonly MediaAssetOption[];
  /** False when `mediaAssets:Read` is not held — the picker then offers
   *  upload only, rather than an empty grid that looks broken. */
  canReadMedia: boolean;
  locale: AppLocale;
  onUploaded: (image: MediaAssetOption) => void;
}
