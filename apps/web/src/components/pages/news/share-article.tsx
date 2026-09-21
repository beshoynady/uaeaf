"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BADGE, CARD } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";
import { SHARE_TARGETS, shareHref, type ShareTarget } from "@/lib/news/share-targets";

/**
 * Passing a story on, with a look at what will be passed (Figma `1739:2390`).
 *
 * ── Why a preview and not a direct link ────────────────────────────────────
 *
 * Owner rule 2026-09-21: no share without a preview first. A share button
 * normally throws the reader at a platform composer and only there do they
 * discover which picture and which sentence the federation's page will carry.
 * If the article has no uploaded cover, or its meta description is empty, the
 * first person to find out is the reader, in public, on their own account.
 * The card below shows the same three things the platform will read — picture,
 * headline, opening — and opens nothing until the reader agrees.
 *
 * ── Why these five and not Figma's six ─────────────────────────────────────
 *
 * Instagram is drawn in the design and has no share-a-link endpoint; see
 * `lib/news/share-targets.ts`. Reported as a scope conflict, not silently
 * dropped.
 *
 * ── Why the buttons carry no platform mark ─────────────────────────────────
 *
 * The design draws icon + label. Three of the six marks have no production
 * asset anywhere: LinkedIn's is a hand-built box with the letters "in" typed
 * into it, X's exports as a raster, and WhatsApp and the link glyph were never
 * brought into the repository. A row where half the buttons carry a mark and
 * half do not reads as unfinished, so all five carry their label at the
 * design's own size, geometry and colour, and the marks are recorded as
 * PENDING FIGMA BACK-SYNC rather than drawn from memory.
 *
 * ── Why the dialog is a `dialog` ───────────────────────────────────────────
 *
 * `showModal()` gives the focus trap, the backdrop, the Escape key and the
 * inertness of the page behind it, all from the platform. The design draws no
 * dialog at all — it has no preview step — so the shell comes from the design
 * system's own panel treatment rather than being invented.
 */
export const ShareArticle = ({
  url,
  title,
  excerpt,
  image,
}: {
  /** Absolute, because every one of these targets is another origin. */
  url: string;
  title: string;
  excerpt: string;
  /** What the platform will show. Absent only if the placeholder failed. */
  image: string | null;
}) => {
  const t = useTranslations("News");
  const dialog = useRef<HTMLDialogElement>(null);
  const [chosen, setChosen] = useState<ShareTarget | null>(null);
  const [copied, setCopied] = useState(false);

  // Opened imperatively rather than through the `open` attribute: only
  // `showModal()` gives the top layer, the backdrop and the focus trap.
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (chosen && !node.open) node.showModal();
    if (!chosen && node.open) node.close();
  }, [chosen]);

  const dismiss = () => {
    setChosen(null);
    setCopied(false);
  };

  const confirm = async () => {
    if (!chosen) return;
    const href = shareHref(chosen, url, title);

    if (href === null) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        // Left open, with the confirmation in place of the button: closing on
        // success would take the only evidence that anything happened away
        // with it.
        return;
      } catch {
        // A clipboard a browser refuses is not an error worth a dialog of its
        // own — the address is in the bar above, which is what the reader
        // falls back to anyway.
        setCopied(false);
        return;
      }
    }

    // `noopener` because the opened page gets a handle on this one otherwise,
    // and can navigate it away while the reader is looking at the composer.
    window.open(href, "_blank", "noopener,noreferrer");
    dismiss();
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="text-body-sm text-[color:var(--color-text-primary)]">{t("shareLabel")}</p>

      <ul className="flex list-none flex-wrap gap-2 p-0">
        {SHARE_TARGETS.map((target) => (
          <li key={target}>
            <button
              type="button"
              onClick={() => setChosen(target)}
              className={`${BADGE} min-h-11 border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 font-medium text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-duration-instant)] hover:border-[color:var(--color-action-default)] active:border-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-primary)] ${FOCUS}`}
            >
              {t(`share_${target}`)}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={dismiss}
        aria-labelledby="share-preview-heading"
        className="m-auto w-[min(30rem,calc(100vw-2rem))] bg-transparent p-0 backdrop:bg-[color:var(--color-surface-overlay)]/60"
      >
        <div className={`${CARD} flex flex-col gap-4 p-6 text-start`}>
          <h2 id="share-preview-heading" className="text-h4 text-[color:var(--color-text-primary)]">
            {chosen ? t("sharePreviewHeading", { platform: t(`share_${chosen}`) }) : ""}
          </h2>

          {/* The card as the platform will draw it: picture, headline,
              opening. Nothing here is decoration — each line is a thing the
              reader is about to publish under their own name. */}
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border-default)]">
            {image ? (
              <div className="relative aspect-[1200/630] w-full bg-[color:var(--color-surface-sunken)]">
                <Image src={image} alt="" fill sizes="30rem" className="object-cover" unoptimized />
              </div>
            ) : null}
            <div className="flex flex-col gap-1 p-4">
              <p className="text-caption text-[color:var(--color-text-muted)]">{new URL(url).host}</p>
              <p className="text-body font-bold text-[color:var(--color-text-primary)]">{title}</p>
              <p className="text-body-sm text-[color:var(--color-text-secondary)]">{excerpt}</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={dismiss}
              className={`${BADGE} min-h-11 border-[color:var(--color-border-strong)] px-4 text-[color:var(--color-text-secondary)] ${FOCUS}`}
            >
              {t("shareCancel")}
            </button>

            {copied ? (
              // The confirmation takes the button's place rather than sitting
              // beside it: a reader who has copied has nothing left to press.
              <p role="status" className="self-center text-body-sm font-medium text-[color:var(--color-semantic-success-text)]">
                {t("shareCopied")}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void confirm()}
                className={`${BADGE} min-h-11 border-transparent bg-[color:var(--color-brand-primary)] px-4 text-[color:var(--color-text-on-brand)] ${FOCUS}`}
              >
                {chosen === "copy" ? t("shareCopyAction") : t("shareOpenAction")}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
};
