"use client";

import { useId, useRef, useState } from "react";
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
 *
 * Uploading lives here rather than on a screen of its own. The editor's
 * question is "which picture belongs in this field", and until now the only
 * answer the interface could give was "one that is already in the library" —
 * with no way to put one there. A separate upload screen would answer it by
 * sending them away mid-edit; this answers it in place, and the new image is
 * selected the moment it exists.
 */
export function MediaPicker({
  label,
  value,
  images,
  canRead,
  disabled,
  locale,
  onChange,
  onUploaded,
}: {
  label: string;
  value: string;
  images: readonly MediaAssetOption[];
  /** False when `mediaAssets:Read` is not held. */
  canRead: boolean;
  disabled: boolean;
  locale: AppLocale;
  onChange: (id: string) => void;
  /** Lets the screen add the new image to its own list, so it appears in the
   *  grid without a reload. Absent where the page has no list to update. */
  onUploaded?: (image: MediaAssetOption) => void;
}) {
  const t = useTranslations("SitePages");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

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
            <UploadPanel
              disabled={disabled || uploading}
              busy={uploading}
              setBusy={setUploading}
              onUploaded={(image) => {
                onUploaded?.(image);
                onChange(image.id);
                setOpen(false);
              }}
            />
          ) : null}

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

/**
 * Putting a new picture into the library from where it is about to be used.
 *
 * Alternative text is required in both languages, and the form says so before
 * it is submitted — the API refuses without it, and learning that after
 * choosing a file and waiting through an upload is a worse way to be told.
 *
 * Nothing else here restates the API's rules. Type, size and dimensions are
 * enforced upstream and their refusals are shown as they come back, so the
 * screen and the server cannot drift into disagreeing about what is
 * acceptable.
 *
 * Deliberately not a `<form>`, and not a stylistic choice: the page editor
 * that hosts this picker is itself a form, and HTML has no nested forms —
 * the parser drops the inner tag, so a `<form onSubmit>` here silently
 * became part of the outer one and its submit button navigated the whole
 * editor away with every field in the query string. Seen in the browser,
 * not deduced. The fields are read from the container instead, and the
 * button is a plain button.
 */
function UploadPanel({
  disabled,
  busy,
  setBusy,
  onUploaded,
}: {
  disabled: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onUploaded: (image: MediaAssetOption) => void;
}) {
  const t = useTranslations("SitePages");
  const fieldId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const id = (name: string) => `${fieldId}-${name}`;

  async function submit() {
    const panel = panelRef.current;
    if (!panel) return;

    const input = (name: string) => panel.querySelector<HTMLInputElement>(`[name="${name}"]`);
    const text = (name: string) => input(name)?.value.trim() ?? "";

    const file = input("file")?.files?.[0];
    if (!file || file.size === 0) {
      setProblem(t("uploadNeedsFile"));
      return;
    }
    if (!text("altAr") || !text("altEn")) {
      setProblem(t("uploadNeedsAlt"));
      return;
    }

    // The bilingual fields travel as JSON text: every part of a multipart
    // body is a string, so there is no other way to carry a shape.
    const body = new FormData();
    body.set("file", file);
    body.set("altText", JSON.stringify({ ar: text("altAr"), en: text("altEn") }));
    body.set(
      "caption",
      JSON.stringify({
        // The record requires a caption. Where the editor gave none, the
        // alternative text is the truest thing anyone has said about the
        // picture — better than storing an empty string.
        ar: text("captionAr") || text("altAr"),
        en: text("captionEn") || text("altEn"),
      }),
    );
    if (text("photographer")) body.set("photographer", text("photographer"));
    if (text("captureDate")) body.set("captureDate", new Date(text("captureDate")).toISOString());

    setProblem(null);
    setBusy(true);
    try {
      const response = await fetch("/api/admin/media-assets/upload", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const code =
          payload && typeof payload === "object" && "code" in payload
            ? String((payload as { code: unknown }).code)
            : null;
        setProblem(code ? `${t("uploadFailed")} (${code})` : t("uploadFailed"));
        return;
      }

      const created = payload as {
        _id?: string;
        id?: string;
        caption?: LocalizedText;
        file?: { url?: string };
      };
      const createdId = created._id ?? created.id;
      if (!createdId || !created.file?.url) {
        setProblem(t("uploadFailed"));
        return;
      }
      // Cleared by hand: without a form element there is no `reset()`, and
      // leaving the previous picture's description in place is how the next
      // upload silently inherits the wrong alternative text.
      panel.querySelectorAll<HTMLInputElement>("input").forEach((field) => {
        field.value = "";
      });
      onUploaded({
        id: createdId,
        caption: created.caption ?? { ar: "", en: "" },
        url: created.file.url,
      });
    } catch {
      setProblem(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const CONTROL =
    "h-10 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-3 text-label text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)]";

  const field = (name: string, label: string, required = false, type = "text") => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id(name)} className="text-caption text-[color:var(--color-text-secondary)]">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input id={id(name)} name={name} type={type} disabled={disabled} className={CONTROL} />
    </div>
  );

  return (
    <div
      ref={panelRef}
      className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4"
    >
      <p className="text-label font-medium text-[color:var(--color-text-primary)]">
        {t("uploadImage")}
      </p>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id("file")}
          className="text-caption text-[color:var(--color-text-secondary)]"
        >
          {t("uploadFile")}
          <span aria-hidden="true"> *</span>
        </label>
        <input
          id={id("file")}
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          className={`${CONTROL} py-2 file:me-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[color:var(--color-surface-skeleton)] file:px-3 file:py-1 file:text-label`}
        />
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("uploadHint")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field("altAr", t("uploadAltAr"), true)}
        {field("altEn", t("uploadAltEn"), true)}
      </div>
      <p className="text-caption text-[color:var(--color-text-muted)]">{t("uploadAltHint")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {field("captionAr", t("uploadCaptionAr"))}
        {field("captionEn", t("uploadCaptionEn"))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field("photographer", t("uploadPhotographer"))}
        {field("captureDate", t("uploadCaptureDate"), false, "date")}
      </div>

      {/* WCAG 4.1.3: the outcome reaches assistive technology without moving
          focus, and the element is in the DOM before it has text so the
          announcement is not missed. */}
      <p
        role="status"
        aria-live="polite"
        className="text-caption text-[color:var(--color-semantic-error)] empty:hidden"
      >
        {problem ?? ""}
      </p>

      {/* `type="button"`, which is not the default: inside the editor's form
          a bare <button> submits it, saving the page as a side effect of
          uploading a picture. */}
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        aria-busy={busy}
        className="h-10 self-start rounded-[var(--radius-md)] bg-[color:var(--color-brand-primary)] px-4 text-label font-bold text-[color:var(--color-text-on-brand)] transition-colors duration-[var(--motion-duration-fast)] hover:bg-[color:var(--color-green-600)] active:bg-[color:var(--color-green-700)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] disabled:cursor-progress disabled:opacity-70"
      >
        {busy ? t("uploadBusy") : t("uploadSubmit")}
      </button>
    </div>
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
