import { StarterKit } from "@tiptap/starter-kit";
// `@tiptap/react` re-exports all of `@tiptap/core`, which is its own pinned
// peer dependency — so this costs no extra package and nothing undeclared.
import { Extension } from "@tiptap/react";
import type { Extensions } from "@tiptap/react";

/**
 * The editor's half of the rich-text contract.
 *
 * The API's `rich-text-allowlist.ts` is the contract itself, and it is
 * enforced on every write — this module does not relax it and cannot. What
 * it does is make the editor unable to produce a document the API would
 * refuse, so an author is never told at save time that the thing the toolbar
 * just offered them is not allowed.
 *
 * `allowlist.spec.ts` imports the API's own file and asserts that parity, so
 * a rule tightened upstream fails here rather than in production.
 */

export type RichTextLang = "ar" | "en";

/** Mirrors `RICH_TEXT_LINK_SCHEMES`; the parity test asserts the two agree. */
const LINK_SCHEMES = ["https:", "http:", "mailto:"];

/** Mirrors `RICH_TEXT_HEADING_LEVELS`. The page's single H1 is the hero's. */
const HEADING_LEVELS = [2, 3];

/**
 * Whether a link may point here.
 *
 * The same predicate the API applies: an absolute URL on one of three
 * schemes. TipTap's own default accepts ten — `tel:`, `ftp:`, `sms:`,
 * `xmpp:` and more — so without this the editor would create links the save
 * then refuses, reporting only that rich text was not allowed.
 *
 * A relative href is refused because `new URL` cannot resolve one, which is
 * the outcome wanted: stored content is rendered on the public site, where
 * "/about" means something different from what it meant in the dashboard.
 */
export function isAllowedLinkHref(href: string): boolean {
  try {
    return LINK_SCHEMES.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

/**
 * A way out of the text that does not edit it on the way.
 *
 * WCAG 2.1.2. TipTap binds `Tab` inside a list to indent and `Shift-Tab` to
 * outdent, so from any list item forward tabbing never leaves the editor and
 * backward tabbing leaves it only by unmaking the author's list. Neither is
 * an exit, and a rich-text field an author cannot tab out of is a keyboard
 * trap.
 *
 * Escape is the exit. 2.1.2 permits a method other than plain Tab provided
 * the user is told what it is, which is why `rich-text-editor.tsx` renders a
 * hint naming it and points `aria-describedby` at it — an exit only the
 * people who already knew can find is not one.
 *
 * The priority puts this above every list binding, so nothing can claim the
 * key first.
 */
const LeaveWithEscape = Extension.create({
  name: "leaveWithEscape",
  priority: 1_000,
  addKeyboardShortcuts() {
    return {
      Escape: () => {
        this.editor.commands.blur();
        return true;
      },
    };
  },
});

/**
 * The extensions registered for one language.
 *
 * Every entry the API refuses is `false`, not hidden. An extension that is
 * registered but unbuttoned still carries its keyboard shortcut, its input
 * rule and its paste parser — `Mod-B` for a mark with no button still marks
 * text — so removing the button would leave three other ways in.
 */
export function richTextExtensions(lang: RichTextLang): Extensions {
  return [
    LeaveWithEscape,
    StarterKit.configure({
      heading: { levels: HEADING_LEVELS as (1 | 2 | 3 | 4 | 5 | 6)[] },

      // Not in `RICH_TEXT_NODES`/`RICH_TEXT_MARKS`. This is editorial prose,
      // not documentation: there is no rendering for code on the public page
      // and no reason for an author to reach for one.
      code: false,
      codeBlock: false,

      // Not in `RICH_TEXT_MARKS`. Strikethrough records an edit rather than
      // stating something, and underline is indistinguishable from a link.
      strike: false,
      underline: false,

      // Chapter 4 §4.6: synthetic obliquing breaks the letter joins Arabic is
      // read by, so the Arabic editor does not register the extension at all.
      // English keeps it. `RICH_TEXT_MARKS_REFUSED_BY_LANG` says the same
      // thing on the API side, and the parity test reads it from there.
      italic: lang === "ar" ? false : {},

      // Appends an empty paragraph after the last block so there is always
      // somewhere to type. Off here because the stored document *is* the
      // published document — there is no render-time cleanup between them —
      // and an editor that adds a node the author did not write makes the two
      // differ. `gapcursor`, which stays on, covers escaping a trailing
      // blockquote or rule without touching the content.
      trailingNode: false,

      link: {
        // A link in an editor is content, not navigation: clicking it must
        // place the caret, not leave the page with unsaved work on it.
        openOnClick: false,
        defaultProtocol: "https",
        isAllowedUri: (href: string) => isAllowedLinkHref(href),
        // These become the stored attribute defaults, not just render-time
        // attributes. TipTap's own default `rel` is
        // "noopener noreferrer nofollow", which `RICH_TEXT_LINK_RELS` does
        // not list — every link the editor made would have been refused.
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer", class: null },
      },
    }),
  ];
}
