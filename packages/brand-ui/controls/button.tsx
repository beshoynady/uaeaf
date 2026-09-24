import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * `primary` is solid green (ADR-0050: green is the action colour), `secondary`
 * carries a tricolour edge that fills on hover, `ghost` is text only.
 *
 * On the two brand surfaces `primary` inverts automatically to a white plate
 * with coloured ink — a green button on a green ground is not a button. That
 * inversion is a surface variable, not a prop, so no call site has to know.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type AsButton = Common &
  Omit<ComponentPropsWithoutRef<"button">, keyof Common> & { href?: undefined };

type AsLink = Common &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof Common> & { href: string };

export type ButtonProps = AsButton | AsLink;

/**
 * One button, rendered as a `<button>` or a `<Link>` depending on whether it
 * has an `href`.
 *
 * The union is discriminated on `href` rather than on an `as` prop so that a
 * link cannot be given `type="submit"` and a button cannot be given
 * `prefetch` — the two prop sets stay separate in the type system instead of
 * being merged into one bag that accepts nonsense.
 *
 * Server Component: every state is CSS. The fill on `secondary` is a
 * pseudo-element's opacity, not a class someone toggles.
 */
export const Button = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) => {
  // `brand-ring` only paints where a rule sets `--brand-ring-paint`, and only
  // the secondary variant does — so primary and ghost carry the class without
  // carrying an edge, and the three variants share one stylesheet path.
  const classes = ["brand-button", "brand-ring", className].filter(Boolean).join(" ");

  if (rest.href !== undefined) {
    const { href, ...linkRest } = rest as AsLink;
    return (
      <Link
        href={href}
        className={classes}
        data-variant={variant}
        data-size={size}
        {...linkRest}
      >
        <span className="brand-button__label">{children}</span>
      </Link>
    );
  }

  const { type = "button", ...buttonRest } = rest as AsButton;
  return (
    <button type={type} className={classes} data-variant={variant} data-size={size} {...buttonRest}>
      <span className="brand-button__label">{children}</span>
    </button>
  );
};
