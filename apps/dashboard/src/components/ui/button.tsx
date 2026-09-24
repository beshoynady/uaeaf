import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button as BrandButton } from "@uaeaf/brand-ui";
import {
  BUTTON_DESTRUCTIVE,
  BUTTON_GHOST,
  BUTTON_ICON,
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
} from "./interactive";

/**
 * CMP-BUTTON-001 with its loading state built in.
 *
 * The class strings already lived in `interactive.ts`; what did not exist was
 * the state the chapter spends a whole paragraph on. Every screen wrote it by
 * hand — `disabled={saving}` and a swapped label — and a swapped label is the
 * one thing the chapter forbids: "the Label MUST NOT jump or suddenly
 * disappear", because a button that reads "Publish" and then "Publishing…"
 * changes width mid-press and moves whatever sits beside it.
 *
 * So the label stays exactly where it is and fades out, and the spinner is
 * drawn over the space it reserved. Width and height do not move.
 *
 * `opacity-0` rather than `invisible` for that fade: `visibility: hidden`
 * takes the text out of the accessibility tree, and a button that loses its
 * name the moment it is pressed is announced as an unnamed button for the
 * whole operation.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon" | "destructive";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: BUTTON_PRIMARY,
  secondary: BUTTON_SECONDARY,
  // Chapter 8 L1 calls this variant `Tertiary` under ADR-0068 D3, which is
  // still open. The token keeps its current name until that ADR lands.
  ghost: BUTTON_GHOST,
  icon: BUTTON_ICON,
  destructive: BUTTON_DESTRUCTIVE,
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  /** Disables the button and draws a spinner over the label. */
  loading?: boolean;
  /** Extra layout classes — width, alignment, margin. Never interaction
   *  states: those come from the variant, which is the whole point of it. */
  className?: string;
  children?: ReactNode;
}

/**
 * The two variants the shared library owns.
 *
 * `primary` and `secondary` render the library's `Button` so a dashboard
 * action and a public-site action are one control (ADR-0098 D7): the solid
 * green plate, and the tricolour edge on the companion action. `ghost`,
 * `icon` and `destructive` have no library counterpart and keep the local
 * class strings — a destructive action in the error family is not something
 * the identity layer should restyle.
 *
 * The loading contract below is this component's, not the library's, so it
 * wraps the library button rather than being replaced by it: the label keeps
 * its width and the spinner is drawn over it, exactly as before.
 */
const LIBRARY_VARIANTS = new Set<ButtonVariant>(["primary", "secondary"]);

export const Button = ({
  variant = "primary",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  children,
  ...rest
}: ButtonProps) => {
  const body = (
    <>
      <span className={loading ? "pointer-events-none opacity-0" : undefined}>{children}</span>
      {loading ? <ButtonSpinner /> : null}
    </>
  );

  if (LIBRARY_VARIANTS.has(variant)) {
    return (
      <BrandButton
        variant={variant as "primary" | "secondary"}
        type={type}
        // Loading disables too: the operation is already running, and the
        // second press is the one that publishes twice.
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={className || undefined}
        {...rest}
      >
        {body}
      </BrandButton>
    );
  }

  return (
    <button
      // `type` defaults to "button", not the platform's "submit". A button
      // inside a form with no explicit type submits it, which is how a
      // "Cancel" beside a form ends up saving.
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {body}
    </button>
  );
};

/**
 * CMP-SPINNER-001, `Inline` variant — 16px, centred over the label it hides.
 *
 * Two readings of that component's spec are worth stating, because both are
 * departures on their face:
 *
 * - `currentColor`, not `color.semantic.info`. Info blue on the filled green
 *   primary button is barely visible; inheriting the label's own colour is
 *   legible on all five variants, which is what the token was reaching for.
 * - `aria-hidden`, not `role="status"`. That row belongs to the `Standalone`
 *   variant: inside a button, a live region would append its text to the
 *   button's accessible name and announce it over the button's own label.
 *   The busy state is already carried by `aria-busy` on the button, which is
 *   what the Button spec itself asks for.
 *
 * The rotation is the documented exception to "no endless motion" (Chapter 5
 * §Anti-Patterns) because it reports a real ongoing wait — and it stops, while
 * staying visible, under reduced motion, exactly as the spec requires.
 */
const ButtonSpinner = () => (
    <span className="absolute inset-0 flex items-center justify-center">
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="size-[var(--icon-size-xs)] animate-spin duration-[var(--motion-duration-slower)] motion-reduce:animate-none"
      >
        <circle cx="10" cy="10" r="7.5" className="opacity-30" />
        <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" />
      </svg>
    </span>
);
