"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { KeyboardEvent, ReactNode } from "react";
import { BUTTON_ICON, BUTTON_SECONDARY } from "@/components/ui/interactive";
import { TextField } from "@/components/auth/text-field";
import { isAllowedLinkHref } from "./allowlist";
import type { RichTextLang } from "./allowlist";
import * as Icon from "./toolbar-icons";

/**
 * The formatting controls, built to WAI-ARIA's toolbar pattern.
 *
 * Two rules shape everything here.
 *
 * **One tab stop, arrows within.** A control per tab stop would put a dozen
 * stops between the page and the text an author came to write. So exactly one
 * button is tabbable and the arrows move along the row — the arrow that
 * points *into* the reading direction being the one that advances, which is
 * `ArrowLeft` in Arabic.
 *
 * **An unavailable control keeps its place.** Undo on an untouched document
 * is `aria-disabled`, not `disabled`: a natively disabled button is
 * unfocusable, so the number of arrow stops would change as the document
 * changed and a reader navigating by count would be following a moving
 * target.
 *
 * Which controls exist at all is not decided here — `allowlist.ts` decides it,
 * and for Arabic it does not register italic in the first place. A button this
 * file did not render for a mark the editor still knows would leave `Mod-I`
 * working with nothing on screen to explain it.
 */

interface ToolbarItem {
  /** Also the message key for the control's accessible name. */
  key: string;
  icon: ReactNode;
  run: (editor: Editor) => void;
  /** Toggles report `aria-pressed`; actions do not. */
  pressed?: (state: ToolbarState) => boolean;
  available?: (state: ToolbarState) => boolean;
  /** The one control that opens a panel instead of running a command. */
  opensLinkForm?: boolean;
}

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  heading2: boolean;
  heading3: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  link: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const ITEMS: ToolbarItem[] = [
  {
    key: "bold",
    icon: <Icon.Bold />,
    run: (editor) => editor.chain().focus().toggleBold().run(),
    pressed: (state) => state.bold,
  },
  {
    key: "italic",
    icon: <Icon.Italic />,
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    pressed: (state) => state.italic,
  },
  {
    key: "heading2",
    icon: <Icon.Heading level={2} />,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    pressed: (state) => state.heading2,
  },
  {
    key: "heading3",
    icon: <Icon.Heading level={3} />,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    pressed: (state) => state.heading3,
  },
  {
    key: "bulletList",
    icon: <Icon.BulletList />,
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    pressed: (state) => state.bulletList,
  },
  {
    key: "orderedList",
    icon: <Icon.OrderedList />,
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    pressed: (state) => state.orderedList,
  },
  {
    key: "blockquote",
    icon: <Icon.Quote />,
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    pressed: (state) => state.blockquote,
  },
  {
    key: "horizontalRule",
    icon: <Icon.Rule />,
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    key: "link",
    icon: <Icon.Link />,
    run: () => {},
    pressed: (state) => state.link,
    opensLinkForm: true,
  },
  {
    key: "unlink",
    icon: <Icon.Unlink />,
    run: (editor) => editor.chain().focus().extendMarkRange("link").unsetLink().run(),
    available: (state) => state.link,
  },
  {
    key: "undo",
    icon: <Icon.Undo />,
    run: (editor) => editor.chain().focus().undo().run(),
    available: (state) => state.canUndo,
  },
  {
    key: "redo",
    icon: <Icon.Redo />,
    run: (editor) => editor.chain().focus().redo().run(),
    available: (state) => state.canRedo,
  },
];

export function RichTextToolbar({
  editor,
  lang,
  disabled = false,
}: {
  editor: Editor;
  lang: RichTextLang;
  disabled?: boolean;
}) {
  const t = useTranslations("RichText");
  const linkFormId = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const linkRef = useRef<HTMLButtonElement | null>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }): ToolbarState => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      heading2: current.isActive("heading", { level: 2 }),
      heading3: current.isActive("heading", { level: 3 }),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      blockquote: current.isActive("blockquote"),
      link: current.isActive("link"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  // Italic is not registered for Arabic, so there is nothing for the control
  // to toggle and no shortcut behind it either.
  const items = useMemo(
    () => ITEMS.filter((item) => item.key !== "italic" || lang !== "ar"),
    [lang],
  );

  const move = useCallback(
    (next: number) => {
      const index = (next + items.length) % items.length;
      setActive(index);
      refs.current[index]?.focus();
    },
    [items.length],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // The arrow that advances is the one pointing into the reading direction.
    const forward = lang === "ar" ? "ArrowLeft" : "ArrowRight";
    const back = lang === "ar" ? "ArrowRight" : "ArrowLeft";

    const target =
      event.key === forward
        ? active + 1
        : event.key === back
          ? active - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : null;

    if (target === null) {
      return;
    }
    event.preventDefault();
    move(target);
  };

  const closeLinkForm = useCallback(() => {
    setLinkOpen(false);
    linkRef.current?.focus();
  }, []);


  return (
    <div className="flex flex-col border-b border-[color:var(--color-border-default)]">
      <div
        role="toolbar"
        aria-label={t("toolbarLabel")}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="flex flex-wrap items-center gap-1 p-1"
      >
        {items.map((item, position) => (
          <ToolbarButton
            key={item.key}
            ref={(node) => {
              refs.current[position] = node;
              if (item.opensLinkForm) {
                linkRef.current = node;
              }
            }}
            index={position}
            active={active}
            label={t(item.key)}
            icon={item.icon}
            pressed={item.pressed ? item.pressed(state) : undefined}
            unavailable={disabled || (item.available ? !item.available(state) : false)}
            expanded={item.opensLinkForm ? linkOpen : undefined}
            controls={item.opensLinkForm && linkOpen ? linkFormId : undefined}
            onActivate={() => {
              if (item.opensLinkForm) {
                setLinkOpen((open) => !open);
                return;
              }
              item.run(editor);
            }}
            onFocused={setActive}
          />
        ))}
      </div>

      {linkOpen ? (
        <LinkForm
          id={linkFormId}
          initial={editor.getAttributes("link").href ?? ""}
          onApply={(href) => {
            editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
            closeLinkForm();
          }}
          onCancel={closeLinkForm}
        />
      ) : null}
    </div>
  );
}

function ToolbarButton({
  ref,
  index,
  active,
  label,
  icon,
  pressed,
  unavailable,
  expanded,
  controls,
  onActivate,
  onFocused,
}: {
  ref: (node: HTMLButtonElement | null) => void;
  index: number;
  active: number;
  label: string;
  icon: ReactNode;
  pressed?: boolean;
  unavailable: boolean;
  expanded?: boolean;
  controls?: string;
  onActivate: () => void;
  onFocused: (index: number) => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-disabled={unavailable || undefined}
      aria-expanded={expanded}
      aria-controls={controls}
      tabIndex={index === active ? 0 : -1}
      onFocus={() => onFocused(index)}
      // Keeps the selection the command is about to act on. Without it the
      // editor blurs on mousedown and the command applies to nothing.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (!unavailable) {
          onActivate();
        }
      }}
      className={`${BUTTON_ICON} aria-pressed:bg-[color:var(--color-surface-skeleton)] aria-pressed:text-[color:var(--color-text-primary)] aria-disabled:cursor-not-allowed aria-disabled:text-[color:var(--color-text-disabled)]`}
    >
      {icon}
    </button>
  );
}

/**
 * Where a link's address is typed.
 *
 * Not `window.prompt`: it cannot be translated, cannot carry a validation
 * message, and is suppressed outright by some browsers — which would leave
 * the control silently dead. The address is checked against the same
 * predicate the API applies, so an unusable one is refused here, next to the
 * field, rather than at save time as an error about rich text.
 */
function LinkForm({
  id,
  initial,
  onApply,
  onCancel,
}: {
  id: string;
  initial: string;
  onApply: (href: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("RichText");
  const inputId = `${id}-url`;
  const [href, setHref] = useState(initial);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const apply = () => {
    if (!isAllowedLinkHref(href)) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    onApply(href);
  };

  return (
    <div
      id={id}
      className="flex flex-wrap items-end gap-2 p-2"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
        if (event.key === "Enter") {
          event.preventDefault();
          apply();
        }
      }}
    >
      <div className="min-w-48 flex-1">
        {/* The dashboard's one text-entry pattern, not a hand-rolled input:
            it carries the notched label, the invalid edge, and the wiring
            that makes the message below the field this field's description
            rather than a loose paragraph near it. */}
        <TextField
          id={inputId}
          ref={inputRef}
          label={t("linkUrlLabel")}
          type="url"
          dir="ltr"
          // An address is read left to right in both languages.
          lang="en"
          value={href}
          error={error ? t("linkInvalid") : null}
          onChange={(event) => {
            setHref(event.target.value);
            setError(false);
          }}
        />
      </div>

      <button type="button" className={BUTTON_SECONDARY} onClick={apply}>
        {t("linkApply")}
      </button>
    </div>
  );
}
