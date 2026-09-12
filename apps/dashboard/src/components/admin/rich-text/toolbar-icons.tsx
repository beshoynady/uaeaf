/**
 * The toolbar's glyphs.
 *
 * Every one is `aria-hidden`: the accessible name lives on the button, and an
 * icon that also announced itself would say the same thing twice.
 *
 * Character-level controls are set as letterforms and block-level ones as
 * drawn icons. That is the arrangement every editor an author has used
 * already has, and it is doing real work — "B" and "H2" name themselves
 * across both languages, where a drawn glyph for *heading level two* would
 * have to be learned.
 *
 * Drawn at 16px on `currentColor`, so a control inherits its own state's ink
 * rather than carrying a second palette (Chapter 8 L1: a 16px inline glyph).
 */

import type { ReactElement } from "react";

function Glyph({ children }: { children: string }): ReactElement {
  return (
    <span aria-hidden="true" className="text-label font-bold leading-none">
      {children}
    </span>
  );
}

function Drawn({ children }: { children: ReactElement }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const Bold = () => <Glyph>B</Glyph>;

export const Italic = () => (
  <span aria-hidden="true" className="text-label font-serif italic leading-none">
    I
  </span>
);

export const Heading = ({ level }: { level: 2 | 3 }) => <Glyph>{`H${level}`}</Glyph>;

export const BulletList = () => (
  <Drawn>
    <g>
      <circle cx="2.5" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M6 4h8M6 8h8M6 12h8" />
    </g>
  </Drawn>
);

export const OrderedList = () => (
  <Drawn>
    <g>
      <path d="M6 4h8M6 8h8M6 12h8" />
      <path d="M1.5 2.6 2.6 2v3M1.4 7h1.8L1.4 9.4h1.9M1.4 10.8h1.8l-1 1.1h.2a.8.8 0 1 1-.9 1" />
    </g>
  </Drawn>
);

export const Quote = () => (
  <Drawn>
    <g>
      <path d="M2 3.5v9" strokeWidth="2" />
      <path d="M6 5h8M6 8h8M6 11h5" />
    </g>
  </Drawn>
);

export const Rule = () => (
  <Drawn>
    <g>
      <path d="M1.5 8h13" strokeWidth="2" />
      <path d="M3 4h10M3 12h10" opacity="0.45" />
    </g>
  </Drawn>
);

export const Link = () => (
  <Drawn>
    <g>
      <path d="M6.6 9.4a2.8 2.8 0 0 0 4 0l2.1-2.1a2.8 2.8 0 0 0-4-4l-1 1" />
      <path d="M9.4 6.6a2.8 2.8 0 0 0-4 0L3.3 8.7a2.8 2.8 0 0 0 4 4l1-1" />
    </g>
  </Drawn>
);

export const Unlink = () => (
  <Drawn>
    <g>
      <path d="M7 9a2.8 2.8 0 0 0 3.9 0l1.3-1.3a2.8 2.8 0 0 0-3.9-4L7.6 4.4" />
      <path d="M9 7a2.8 2.8 0 0 0-3.9 0L3.8 8.3a2.8 2.8 0 0 0 3.9 4l.7-.7" />
      <path d="M2 2l12 12" />
    </g>
  </Drawn>
);

export const Undo = () => (
  <Drawn>
    <g>
      <path d="M3 7h7a3.5 3.5 0 0 1 0 7H6" />
      <path d="M5.5 4.5 3 7l2.5 2.5" />
    </g>
  </Drawn>
);

export const Redo = () => (
  <Drawn>
    <g>
      <path d="M13 7H6a3.5 3.5 0 0 0 0 7h4" />
      <path d="M10.5 4.5 13 7l-2.5 2.5" />
    </g>
  </Drawn>
);
