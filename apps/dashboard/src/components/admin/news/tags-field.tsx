"use client";

import { useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { CharCounter } from "@/components/ui/char-counter";
import { ARTICLE_TAG_LENGTH, ARTICLE_TAG_MAX } from "@/lib/admin/article-editor";

/**
 * The free labels on an article, entered as marks rather than as a string.
 *
 * ── Why not a comma-separated text field ───────────────────────────────────
 *
 * Because a comma-separated field is a format the author has to remember and
 * the screen never confirms. They cannot see how many tags they have, cannot
 * remove the third one without editing around it, and cannot tell a trailing
 * comma from an empty tag. Each mark here is a thing they can count and
 * remove.
 *
 * ── Why the input stays after the marks ────────────────────────────────────
 *
 * Typing is the repeated act: a newsroom adds three or four labels in a row.
 * The field keeps focus after each one so the next is one word and one Enter
 * away, and the mark that was just added appears beside the others rather
 * than under the cursor.
 *
 * ── Why the limits are shown before they are hit ───────────────────────────
 *
 * The API refuses more than `ARTICLE_TAG_MAX` and a label longer than
 * `ARTICLE_TAG_LENGTH`. Both are counted here as the author types, so the
 * refusal is a control that stops rather than a save that fails — the same
 * pairing the address field and the approval policy already use.
 */
export const TagsField = ({
  id,
  tags,
  onChange,
  disabled = false,
}: {
  id: string;
  tags: readonly string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) => {
  const t = useTranslations("Newsroom");
  const [draft, setDraft] = useState("");

  const full = tags.length >= ARTICLE_TAG_MAX;
  const trimmed = draft.trim();
  const tooLong = trimmed.length > ARTICLE_TAG_LENGTH;
  // Case-insensitively, because the API de-duplicates that way: accepting
  // "Relay" beside "relay" here would show two marks and store one.
  const duplicate = tags.some((tag) => tag.toLocaleLowerCase() === trimmed.toLocaleLowerCase());
  const canAdd = trimmed !== "" && !full && !tooLong && !duplicate;

  const add = () => {
    if (!canAdd) return;
    onChange([...tags, trimmed]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(tags.filter((held) => held !== tag));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter and comma both commit: one is what a typist reaches for, the
    // other is what somebody pasting a list already typed. Enter is also
    // prevented from reaching a surrounding form, where it would submit.
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    }
  };

  const error = tooLong ? t("errorTagLength") : duplicate ? t("errorTagDuplicate") : null;

  return (
    <div className="flex flex-col gap-3">
      {/* No "add" button beside the input. Enter and comma already commit,
          and a button that only repeats a key the hint now names is a second
          control for one action — it also had to be reached past the field on
          every tag, which is the opposite of how a row of labels is typed. */}
      <TextField
        id={id}
        label={t("fieldTags")}
        value={draft}
        disabled={disabled || full}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        hint={full ? t("hintTagsFull", { max: ARTICLE_TAG_MAX }) : t("hintTags", { max: ARTICLE_TAG_MAX })}
        error={error}
      />

      {/* How many of the allowance are used, so the ceiling is visible before
          it is hit rather than announced by a field that stops accepting. */}
      <CharCounter
        lang="en"
        over={full}
        text={t("tagCount", { count: tags.length, max: ARTICLE_TAG_MAX })}
      />

      {tags.length > 0 ? (
        <ul className="flex list-none flex-wrap gap-2 p-0">
          {tags.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-strong)] py-1 ps-3 pe-1 text-label text-[color:var(--color-text-primary)]">
                {tag}
                {/* The mark's own name is in the button's label, so a screen
                    reader on a row of eight says which one each removes
                    rather than "remove" eight times. */}
                <Button
                  variant="icon"
                  disabled={disabled}
                  aria-label={t("removeTag", { tag })}
                  onClick={() => remove(tag)}
                >
                  <span aria-hidden>×</span>
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
