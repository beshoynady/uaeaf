import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type IconButtonProps = Omit<ComponentPropsWithoutRef<"button">, "aria-label" | "children"> & {
  /**
   * Required by the type, not by a lint rule that can be disabled.
   *
   * An icon-only control has no accessible name unless someone supplies one,
   * and a default like "button" is worse than nothing — it satisfies the
   * checker and tells a screen-reader user nothing. Making it a required prop
   * means the compiler asks the question at every call site.
   */
  "aria-label": string;
  /** The icon. Decorative: the label above is the accessible name. */
  children: ReactNode;
  tone?: "neutral" | "brand";
};

/**
 * A square control with an icon and no visible text.
 *
 * Sized from `--space-*` to at least 44x44 (Chapter 6 §6.9, WCAG 2.5.5). That
 * floor is the reason the smallest size here is larger than the icon it holds.
 */
export const IconButton = ({
  tone = "neutral",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    className={["brand-icon-button", className].filter(Boolean).join(" ")}
    data-tone={tone}
    {...rest}
  >
    <span className="brand-icon-button__glyph" aria-hidden="true">
      {children}
    </span>
  </button>
);
