"use client";

import { useState } from "react";

import type { ReactNode } from "react";

type Theme = "light" | "dark" | "high-contrast";
type Direction = "rtl" | "ltr";

const THEMES: readonly Theme[] = ["light", "dark", "high-contrast"];
const DIRECTIONS: readonly Direction[] = ["rtl", "ltr"];

/**
 * The Brand Kit's theme and direction switch.
 *
 * `data-theme` and `dir` are stamped on a wrapper rather than on `<html>`,
 * which works because every token selector is attribute-based
 * (`[data-theme="dark"]`, `[dir="rtl"]`) rather than element-scoped. That is
 * what makes a switch possible on one page at all: the real site stamps the
 * attribute on the document, and a reviewer here can put two themes on one
 * screen without two windows.
 *
 * The one thing it cannot reproduce is `prefers-reduced-motion`, which is a
 * media feature and not an attribute. That has to be emulated in the browser's
 * own settings, and the page says so rather than pretending otherwise.
 */
export const BrandKitStage = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [direction, setDirection] = useState<Direction>("rtl");

  return (
    <>
      <div className="brand-kit-toolbar" role="group" aria-label="Brand Kit display controls">
        <fieldset>
          <legend>Theme</legend>
          {THEMES.map((option) => (
            <label key={option}>
              <input
                className="brand-kit-control"
                type="radio"
                name="brand-kit-theme"
                value={option}
                checked={theme === option}
                onChange={() => setTheme(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Direction</legend>
          {DIRECTIONS.map((option) => (
            <label key={option}>
              <input
                className="brand-kit-control"
                type="radio"
                name="brand-kit-direction"
                value={option}
                checked={direction === option}
                onChange={() => setDirection(option)}
              />
              {option}
            </label>
          ))}
        </fieldset>

        <p className="brand-kit-toolbar__note">
          Reduced motion is a media feature, not an attribute — emulate it in the browser to
          check that every rotation stops and every border stays.
        </p>
      </div>

      <div data-theme={theme} dir={direction} className="brand-kit-stage">
        {children}
      </div>
    </>
  );
};
