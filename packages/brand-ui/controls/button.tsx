import Link from "next/link";
import type { ComponentPropsWithRef, ElementType, ReactNode } from "react";

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

/**
 * The component that renders an internal href.
 *
 * Defaults to `next/link`, which is correct for an absolute external URL and
 * **wrong for an internal route in this project**: `localePrefix: "always"`
 * means `/media/videos` has no locale, so the middleware supplies one from a
 * cookie — and a reader on the English page can be sent to the Arabic article.
 * An internal href therefore passes the application's locale-aware `Link`
 * here.
 */
type LinkComponent = { linkComponent?: ElementType };

/*
 * `WithRef`, not `WithoutRef`: a menu trigger has to be focusable from code —
 * a popover that traps focus must be able to give it back to the control that
 * opened it. React 19 passes `ref` to a function component as an ordinary prop,
 * so it reaches `<button>` through the same spread as everything else and this
 * needs no `forwardRef`.
 */
type AsButton = Common &
  Omit<ComponentPropsWithRef<"button">, keyof Common> & { href?: undefined };

type AsLink = Common &
  LinkComponent &
  Omit<ComponentPropsWithRef<typeof Link>, keyof Common> & { href: string };

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
    const { href, linkComponent: Anchor = Link, ...linkRest } = rest as AsLink;
    return (
      <Anchor
        href={href}
        className={classes}
        data-variant={variant}
        data-size={size}
        {...linkRest}
      >
        <span className="brand-button__label">{children}</span>
      </Anchor>
    );
  }

  const { type = "button", ...buttonRest } = rest as AsButton;
  return (
    <button type={type} className={classes} data-variant={variant} data-size={size} {...buttonRest}>
      <span className="brand-button__label">{children}</span>
    </button>
  );
};
