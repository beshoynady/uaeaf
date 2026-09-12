"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { useToast } from "@/components/ui/toast";
import { richTextExtensions } from "./allowlist";
import type { RichTextLang } from "./allowlist";
import { PASTE_REMOVAL_KINDS, cleanPastedHtml, pasteRemovalTotal } from "./paste-cleanup";
import type { PasteRemovals } from "./paste-cleanup";
import { RichTextToolbar } from "./toolbar";

/**
 * One language's half of a rich-text field.
 *
 * A `fieldset` rather than a labelled control, because the thing being named
 * is a *group* — a toolbar and an editable region — and that is the pattern
 * this dashboard already uses for grouped controls (`media-picker.tsx`). The
 * editable region carries the same name again through `aria-labelledby`: a
 * legend names the group, and a reader who tabs straight into the text would
 * otherwise land in an unnamed box.
 *
 * `role="textbox"` with `aria-multiline` on the editable region follows the
 * convention audited rich-text editors settled on. A bare `contenteditable`
 * has no role in HTML-AAM, so a name put on it has nothing to attach to.
 */
export interface RichTextEditorProps {
  id: string;
  label: string;
  lang: RichTextLang;
  value: JSONContent | null;
  onChange: (value: JSONContent) => void;
  disabled?: boolean;
  /** An element describing this field — a paragraph-count warning, a hint. */
  describedBy?: string;
}

export function RichTextEditor({
  id,
  label,
  lang,
  value,
  onChange,
  disabled = false,
  describedBy,
}: RichTextEditorProps) {
  const t = useTranslations("RichText");
  const toast = useToast();
  const labelId = `${id}-label`;
  const hintId = `${id}-exit-hint`;
  // The way out is always described; a warning about the field joins it when
  // there is one. `aria-describedby` takes a list, so neither displaces the
  // other.
  const describedByIds = [hintId, describedBy].filter(Boolean).join(" ");

  /**
   * What the editor last handed the parent.
   *
   * The parent stores exactly that object, so the sync effect below can tell
   * its own echo from a genuinely new document by identity alone — no deep
   * compare on every keystroke, and no caret reset while someone is typing.
   */
  const emitted = useRef<JSONContent | null>(value);

  /**
   * What to say after a paste that lost something.
   *
   * `useEditor` builds its options once, so a handler closing over `t` and
   * `toast` would keep whichever pair existed at mount — and go on using a
   * stale catalogue after a language change. The editor calls through a ref
   * that is re-pointed after every render instead.
   */
  const reportPaste = useCallback(
    (removed: PasteRemovals) => {
      if (pasteRemovalTotal(removed) === 0) {
        return;
      }

      const description = PASTE_REMOVAL_KINDS.filter((kind) => removed[kind] > 0)
        .map((kind) => t(pasteMessageKey(kind), { count: removed[kind] }))
        .join(" · ");

      toast.show({
        tone: "warning",
        title: t("pasteTitle"),
        description,
        source: "validation",
        // One message per paste, however many kinds it touched (FB.16).
        dedupeKey: `paste-cleanup:${id}`,
      });
    },
    [id, t, toast],
  );

  const report = useRef(reportPaste);

  useEffect(() => {
    report.current = reportPaste;
  }, [reportPaste]);

  const editor = useEditor({
    extensions: richTextExtensions(lang),
    content: value ?? "",
    editable: !disabled,
    // Next renders this route on the server first; ProseMirror needs a DOM.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        "aria-describedby": describedByIds,
        dir: lang === "ar" ? "rtl" : "ltr",
        lang,
        class:
          "min-h-40 px-3 py-3 text-body text-[color:var(--color-text-primary)] outline-none [&_h2]:text-h4 [&_h3]:text-label [&_h2]:font-bold [&_h3]:font-bold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_blockquote]:border-s-2 [&_blockquote]:border-[color:var(--color-border-strong)] [&_blockquote]:ps-3 [&_a]:underline",
      },
      transformPastedHTML: (html) => {
        const result = cleanPastedHtml(html, lang);
        report.current(result.removed);
        return result.html;
      },
    },
    onUpdate: ({ editor: current }) => {
      const json = current.getJSON();
      emitted.current = json;
      onChange(json);
    },
  });

  // A document replaced from outside — a restored revision, a reload. The
  // editor's own emissions are skipped by identity, so this never fires while
  // someone is typing.
  useEffect(() => {
    if (!editor || value === emitted.current) {
      return;
    }
    emitted.current = value;
    editor.commands.setContent(value ?? "", { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend
        id={labelId}
        className="text-label font-medium text-[color:var(--color-text-secondary)]"
      >
        {label}
      </legend>

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] focus-within:border-[color:var(--color-brand-primary)] focus-within:ring-2 focus-within:ring-[color:var(--a11y-focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--a11y-focus-offset)]">
        {editor ? (
          <>
            <RichTextToolbar editor={editor} lang={lang} disabled={disabled} />
            <EditorContent editor={editor} />
          </>
        ) : (
          <p className="px-3 py-6 text-body text-[color:var(--color-text-muted)]">{t("loading")}</p>
        )}
      </div>

      <p id={hintId} className="text-caption text-[color:var(--color-text-muted)]">
        {t("keyboardExit")}
      </p>
    </fieldset>
  );
}

function pasteMessageKey(kind: (typeof PASTE_REMOVAL_KINDS)[number]): string {
  return `paste${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}
