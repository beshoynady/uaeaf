"use client";

import { Fragment, useEffect, useState } from "react";
import type { ElementType } from "react";

/**
 * A heading that arrives one word at a time.
 *
 * -- Why the words are split on the client ---------------------------------
 *
 * The server renders the heading as one plain string. Only after mount is it
 * split into spans -- so a reader whose script never arrives, and every
 * crawler, gets an ordinary heading rather than a pile of `<span>`s at
 * `opacity: 0`. That is the same trade the cinematic sponsor row makes, and it
 * is what keeps the animation from being able to hide the content.
 *
 * -- Arabic ----------------------------------------------------------------
 *
 * Splitting on spaces is safe for both languages here: Arabic words are
 * space-separated, and each span is `display: inline-block`, which does not
 * break the shaping WITHIN a word. Splitting on characters would -- an
 * inline-block per letter severs the cursive joins and renders Arabic as a row
 * of isolated forms. That is the reason this animates words and not letters,
 * beyond it being what the brief asks for.
 */
export const CinematicHeading = ({
  text,
  as: Tag = "h2",
  className = "",
}: {
  text: string;
  as?: ElementType;
  className?: string;
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimate(true);
  }, []);

  if (!animate) {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(" ");

  return (
    <Tag className={className}>
      {words.map((word, index) => (
        // The separator is a text node BETWEEN the spans, never inside one.
        // A trailing space inside an `inline-block` is collapsed away by the
        // layout, and the words render touching — "من قلب" became "منقلب" on
        // the homepage before this was measured in a browser.
        <Fragment key={`${word}-${index}`}>
          <span className="vs-word" style={{ ["--vs-word-index" as string]: index }}>
            {word}
          </span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
};
