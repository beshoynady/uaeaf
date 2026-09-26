/**
 * The chain-link glyph on the album pages' two link buttons: the hero's «نسخ
 * رابط الألبوم» and the viewer's «رابط الصورة». One drawing, so the two read
 * as the same kind of action.
 *
 * Decorative: each button's words, or its `aria-label`, are its name. Sized by
 * the caller — `size-4` beside a word, or the kit's 20px glyph box inside an
 * `IconButton`, which it fills when given no class.
 */
export const LinkIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </svg>
);
