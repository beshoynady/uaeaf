import type { ComponentPropsWithRef, ReactNode } from "react";

export type IconButtonProps = Omit<ComponentPropsWithRef<"button">, "aria-label" | "children"> & {
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
  /**
   * `circle` is the shape a media control takes — a player's dismiss, a rail's
   * two arrows. Nothing else about the control changes: same floor size, same
   * edge, same focus indicator. It exists because the alternative was each of
   * those call sites writing `rounded-full` beside its own edge and its own
   * ring, which is how the video system lost the ring on three of them.
   */
  shape?: "square" | "circle";
};

/**
 * A square control with an icon and no visible text.
 *
 * Sized from `--space-*` to at least 44x44 (Chapter 6 §6.9, WCAG 2.5.5). That
 * floor is the reason the smallest size here is larger than the icon it holds.
 */
export const IconButton = ({
  tone = "neutral",
  shape = "square",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    className={["brand-icon-button", className].filter(Boolean).join(" ")}
    data-tone={tone}
    data-shape={shape}
    {...rest}
  >
    <span className="brand-icon-button__glyph" aria-hidden="true">
      {children}
    </span>
  </button>
);
