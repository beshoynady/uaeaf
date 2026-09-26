import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { AppLocale } from "@/i18n/routing";
import type { AboutDraft } from "@/lib/admin/about-readiness";

/**
 * What every section's field group receives.
 *
 * One shape for all ten, so the editor can pick a section component by key
 * without a per-section call site — and so a new section is one file plus one
 * line in the dispatcher.
 *
 * `patch` merges into that section only. A section component never sees the
 * whole draft, which is what keeps one section's save from touching another's
 * fields.
 */
export interface SectionFieldsProps<K extends keyof AboutDraft> {
  value: AboutDraft[K];
  patch: (change: Partial<AboutDraft[K]>) => void;
  disabled: boolean;
  images: readonly MediaAssetOption[];
  canReadMedia: boolean;
  locale: AppLocale;
  onUploaded: (image: MediaAssetOption) => void;
}

/** A bilingual pair with both halves empty — what a new list item's text
 *  fields start on, so the form never has to check for undefined. */
export const emptyText = () => ({ ar: "", en: "" });
