"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BilingualField } from "@/components/admin/bilingual-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BUTTON_ICON, BUTTON_SECONDARY, FOCUS_RING, TRANSITION } from "@/components/ui/interactive";
import type { AboutDraft } from "@/lib/admin/about-readiness";
import type { LocalizedText } from "@/lib/api/types";
import { MediaField } from "../media-field";
import { SectionHeadings } from "./section-headings";
import { emptyText, type SectionFieldsProps } from "./section-fields";

/** The API's own ceiling (`MAX_STORY_PARAGRAPHS`). The approved composition
 *  prints two; a third or fourth still fits beside the photograph, a fifth
 *  would be a wall of text. */
const MAX_PARAGRAPHS = 4;

type Direction = "up" | "down";

/** Where focus goes once the list has re-rendered. */
type PendingFocus =
  | { kind: "move"; index: number; direction: Direction }
  | { kind: "field"; index: number }
  | { kind: "add" };

/** One place for the paragraph's field id, because the focus after "add" has
 *  to find the same input `BilingualField` renders. */
const paragraphId = (index: number) => `about-story-paragraph-${index}`;

const hasWriting = (paragraph: LocalizedText): boolean =>
  paragraph.ar.trim() !== "" || paragraph.en.trim() !== "";

const REMOVE_BUTTON = `inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-label font-semibold text-[color:var(--color-semantic-error-text)] hover:bg-[color-mix(in_srgb,var(--color-semantic-error)_10%,transparent)] ${TRANSITION} ${FOCUS_RING} disabled:cursor-not-allowed disabled:text-[color:var(--color-text-disabled)] disabled:hover:bg-transparent`;

/**
 * The founding story: its two headings, the paragraphs that tell it, the
 * archive photograph beside them, and the dark document card laid over that
 * photograph.
 *
 * ── Why the paragraphs are not an `AboutListField` ────────────────────────
 *
 * That list's rows carry an identity and a visibility of their own. A
 * paragraph has neither: the schema stores the story as bare bilingual
 * strings, printed in order, and a paragraph the editor does not want printed
 * is one they delete. So the list here is smaller — move, add, remove — and
 * every paragraph stays open, because the approved editor draws them open:
 * two to four textareas are the section, not a wall hiding it.
 *
 * ── An empty story is a hidden story ──────────────────────────────────────
 *
 * With no paragraphs left, the page leaves the whole section out (ADR-0101
 * D4): a heading with nothing under it would tell a reader something is
 * there. The pre-submission panel does not list that, so the editor is told
 * here, in the same blue information panel the timeline uses for a withheld
 * milestone. Nothing is wrong; the section is simply not printed.
 */
export const StoryFields = ({
  value,
  patch,
  disabled,
  images,
  canReadMedia,
  locale,
  onUploaded,
}: SectionFieldsProps<"story">) => {
  const t = useTranslations("AboutFederation");
  const { docCard } = value;

  const patchCard = (change: Partial<AboutDraft["story"]["docCard"]>) => patch({ docCard: { ...docCard, ...change } });

  return (
    <>
      <SectionHeadings idPrefix="about-story" value={value} patch={patch} disabled={disabled} withDescription={false} />

      <StoryParagraphs
        paragraphs={value.paragraphs}
        onChange={(paragraphs) => patch({ paragraphs })}
        disabled={disabled}
      />

      <MediaField
        id="about-story-image"
        label={t("story.image")}
        value={value.imageId}
        images={images}
        canReadMedia={canReadMedia}
        disabled={disabled}
        locale={locale}
        onChange={(imageId) => patch({ imageId })}
        onUploaded={onUploaded}
        // The photograph fills the story's second column, a little over 600px
        // at the widest composition, so the floor is twice that (ADR-0086 D4).
        minSourcePx={1200}
      />

      <fieldset className="flex flex-col gap-4">
        <legend className="text-label font-bold">{t("story.docCard")}</legend>
        <p className="text-caption text-[color:var(--color-text-muted)]">{t("story.docCardHint")}</p>

        <BilingualField
          id="about-story-doccard-label"
          labelAr={t("story.docCardLabel")}
          labelEn={t("story.docCardLabel")}
          valueAr={docCard.label.ar}
          valueEn={docCard.label.en}
          onChangeAr={(ar) => patchCard({ label: { ...docCard.label, ar } })}
          onChangeEn={(en) => patchCard({ label: { ...docCard.label, en } })}
          disabled={disabled}
          required
        />

        <BilingualField
          id="about-story-doccard-title"
          labelAr={t("story.docCardTitle")}
          labelEn={t("story.docCardTitle")}
          valueAr={docCard.title.ar}
          valueEn={docCard.title.en}
          onChangeAr={(ar) => patchCard({ title: { ...docCard.title, ar } })}
          onChangeEn={(en) => patchCard({ title: { ...docCard.title, en } })}
          disabled={disabled}
          required
        />

        {/* Free text in each language rather than a date picker: the card
            prints the date the way the document is remembered ("April 1974"),
            and the two languages do not write it the same way. */}
        <BilingualField
          id="about-story-doccard-date"
          labelAr={t("story.docCardDate")}
          labelEn={t("story.docCardDate")}
          valueAr={docCard.date.ar}
          valueEn={docCard.date.en}
          onChangeAr={(ar) => patchCard({ date: { ...docCard.date, ar } })}
          onChangeEn={(en) => patchCard({ date: { ...docCard.date, en } })}
          disabled={disabled}
          required
          hint={t("story.docCardDateHint")}
        />
      </fieldset>
    </>
  );
};

/**
 * The paragraphs, in the order they print.
 *
 * - **Every control is a button**, so a keyboard and a screen reader reach
 *   the same moves a pointer does, and every move is announced with the
 *   paragraph's new position.
 * - **Focus follows the paragraph.** A paragraph carried to either end of the
 *   list lands on a move button that is disabled there, and a disabled button
 *   drops focus to the page; so focus goes to the same button at the new
 *   position if it can still be pressed, and to its partner if not.
 * - **Deleting asks first only when there is writing to lose.** A paragraph
 *   added by mistake and never written goes at once; one with text in it asks,
 *   as a milestone does, because prose is the expensive thing to redo.
 */
const StoryParagraphs = ({
  paragraphs,
  onChange,
  disabled,
}: {
  paragraphs: readonly LocalizedText[];
  onChange: (paragraphs: LocalizedText[]) => void;
  disabled: boolean;
}) => {
  const t = useTranslations("AboutFederation");
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const moveButtons = useRef(new Map<string, HTMLButtonElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<PendingFocus | null>(null);
  const full = paragraphs.length >= MAX_PARAGRAPHS;
  const hintId = "about-story-paragraphs-hint";

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (!target) {
      return;
    }
    if (target.kind === "move") {
      const same = moveButtons.current.get(`${target.index}-${target.direction}`);
      const partner = moveButtons.current.get(`${target.index}-${target.direction === "up" ? "down" : "up"}`);
      (same && !same.disabled ? same : partner)?.focus();
      return;
    }
    if (target.kind === "field") {
      // The first half in reading order: an editor who pressed "add" wants to
      // start writing, not to find where the new paragraph went.
      document.getElementById(`${paragraphId(target.index)}-ar`)?.focus();
      return;
    }
    // The removed paragraph's own controls are gone; "add" is the one control
    // of this list that is always there.
    addButton.current?.focus();
  }, [paragraphs]);

  const move = (from: number, direction: Direction) => {
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= paragraphs.length) {
      return;
    }
    const next = [...paragraphs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    pendingFocus.current = { kind: "move", index: to, direction };
    setAnnouncement(t("story.paragraphMoved", { position: to + 1, total: paragraphs.length }));
    onChange(next);
  };

  const patchAt = (index: number, change: Partial<LocalizedText>) =>
    onChange(paragraphs.map((paragraph, position) => (position === index ? { ...paragraph, ...change } : paragraph)));

  const add = () => {
    // The button is disabled at the ceiling; this is the backstop, read when
    // the press lands rather than when the button was drawn.
    if (paragraphs.length >= MAX_PARAGRAPHS) {
      return;
    }
    pendingFocus.current = { kind: "field", index: paragraphs.length };
    onChange([...paragraphs, emptyText()]);
  };

  const remove = (index: number) => {
    setPendingRemoval(null);
    pendingFocus.current = { kind: "add" };
    setAnnouncement(t("story.paragraphRemoved"));
    onChange(paragraphs.filter((_, position) => position !== index));
  };

  const requestRemoval = (index: number) => {
    if (hasWriting(paragraphs[index])) {
      setPendingRemoval(index);
    } else {
      remove(index);
    }
  };

  const registerMove = (key: string) => (node: HTMLButtonElement | null) => {
    if (node) {
      moveButtons.current.set(key, node);
    } else {
      moveButtons.current.delete(key);
    }
  };

  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="text-label font-bold">{t("story.paragraphs")}</legend>
        <p id={hintId} className="text-caption text-[color:var(--color-text-muted)]">
          {t("story.paragraphsHint", { max: MAX_PARAGRAPHS })}
        </p>

        {paragraphs.length === 0 ? (
          <p className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-semantic-info)_10%,transparent)] px-3.5 py-3 text-label leading-relaxed text-[color:var(--color-semantic-info-text)]">
            <InfoIcon />
            {t("story.paragraphsEmpty")}
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {paragraphs.map((paragraph, index) => {
              const number = index + 1;

              return (
                // Keyed by position: a paragraph has no id to key by. Safe
                // because every input in the row is controlled and keeps no
                // state of its own, and focus, the one thing the DOM would
                // carry across a reorder, is placed explicitly above.
                <li
                  key={index}
                  className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4"
                >
                  <div className="flex items-center gap-1">
                    {/* The number is already in the fields' labels and in the
                        list's own position; drawn here for the eye only. */}
                    <span
                      aria-hidden="true"
                      className="me-auto inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--color-surface-sunken)] text-label font-bold text-[color:var(--color-text-secondary)]"
                    >
                      {number}
                    </span>

                    <button
                      type="button"
                      ref={registerMove(`${index}-up`)}
                      className={BUTTON_ICON}
                      aria-label={t("story.paragraphMoveUp", { number })}
                      disabled={disabled || index === 0}
                      onClick={() => move(index, "up")}
                    >
                      <ChevronIcon up />
                    </button>
                    <button
                      type="button"
                      ref={registerMove(`${index}-down`)}
                      className={BUTTON_ICON}
                      aria-label={t("story.paragraphMoveDown", { number })}
                      disabled={disabled || index === paragraphs.length - 1}
                      onClick={() => move(index, "down")}
                    >
                      <ChevronIcon />
                    </button>

                    <button
                      type="button"
                      className={REMOVE_BUTTON}
                      aria-label={t("story.paragraphRemoveNamed", { number })}
                      disabled={disabled}
                      onClick={() => requestRemoval(index)}
                    >
                      {t("story.paragraphRemove")}
                    </button>
                  </div>

                  <BilingualField
                    id={paragraphId(index)}
                    labelAr={t("story.paragraph", { number })}
                    labelEn={t("story.paragraph", { number })}
                    valueAr={paragraph.ar}
                    valueEn={paragraph.en}
                    onChangeAr={(ar) => patchAt(index, { ar })}
                    onChangeEn={(en) => patchAt(index, { en })}
                    disabled={disabled}
                    required
                    multiline
                    hint={t("emphasisHint")}
                  />
                </li>
              );
            })}
          </ol>
        )}

        <div>
          <button
            type="button"
            ref={addButton}
            className={BUTTON_SECONDARY}
            aria-describedby={hintId}
            disabled={disabled || full}
            onClick={add}
          >
            {t("story.paragraphAdd")}
          </button>
        </div>

        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </fieldset>

      {/* Outside the fieldset, so the dialog is not announced as part of the
          paragraphs' group when it opens. */}
      <ConfirmDialog
        open={pendingRemoval !== null}
        title={t("story.paragraphRemoveTitle")}
        confirmLabel={t("story.paragraphRemove")}
        cancelLabel={t("story.paragraphCancel")}
        tone="destructive"
        onConfirm={() => {
          // Read at the moment the action runs, never from the value the flow
          // opened with (CLAUDE.md §31).
          if (pendingRemoval !== null && pendingRemoval < paragraphs.length) {
            remove(pendingRemoval);
          } else {
            setPendingRemoval(null);
          }
        }}
        onCancel={() => setPendingRemoval(null)}
      >
        {t("story.paragraphRemoveBody")}
      </ConfirmDialog>
    </>
  );
};

/* Lucide paths, inlined per ADR-0068 D6.1 — no icon library. */

const ChevronIcon = ({ up = false }: { up?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

const InfoIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className="mt-0.5 shrink-0"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v5h1" />
  </svg>
);
