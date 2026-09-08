import type { CSSProperties } from "react";

/**
 * The federation mark.
 *
 * Inlined rather than referenced as a file so its fills can be bound to the
 * brand tokens. Every committed copy of this artwork carried colours that are
 * not the official ones — `#008542` for Federation Green (`#00843D`),
 * `#c8202f` for Federation Red (`#C8102E`), `#1b1718` for Black — which the
 * federation's guide §9.1 prohibits outright ("do not change the emblem's
 * colours") and Chapter 1 §Do & Don't restates ("do not invent colors that are
 * merely 'close' to the official colors"). ADR-0059 §D7.2 recorded the drift
 * and named binding to tokens as the root-cause fix, because a file carrying
 * hardcoded hex drifts again. `brand-asset-contract.spec.ts` now fails if any
 * committed asset reintroduces an unofficial value.
 *
 * Two further §9.1 prohibitions are enforced by construction rather than by
 * documentation:
 *
 *  - The exported file carried `preserveAspectRatio="none"`, which lets the
 *    mark stretch to whatever box it is given. §9.1's first prohibition is
 *    stretching. The attribute is dropped, so the default `xMidYMid meet`
 *    applies and the mark keeps its proportions in any container.
 *  - §9.1 also prohibits outlining and drop shadows, so this component takes
 *    no border, ring or shadow of its own and the contract test rejects those
 *    utilities on its call sites.
 *
 * Variant follows guide §6.1: the full-colour mark where the ground is white
 * or clearly contrasting, the monochrome mark otherwise. `mono` inherits
 * `currentColor`, so a coloured section sets it once on the parent.
 */
export function UaeafLogo({
  variant = "color",
  className,
  style,
  title,
}: {
  /** §6.1. `mono` takes `currentColor` — use it on any non-white ground. */
  variant?: "color" | "mono";
  className?: string;
  style?: CSSProperties;
  /** Give this only where the mark is the sole accessible name for its
   *  context. Inside a link that already carries an `aria-label`, leaving it
   *  undefined keeps the mark decorative and avoids a doubled announcement. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
      className={className}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M7.32175 45.2473C8.13997 45.7175 9.20106 46.0784 10.4761 46.3199C11.763 46.5642 13.3515 46.688 15.1962 46.688H15.6664C17.5104 46.688 19.0982 46.5642 20.3859 46.3199C21.6609 46.078 22.7156 45.7175 23.5225 45.2481C24.3294 44.7783 24.9295 44.1911 25.3079 43.5022C25.6906 42.8049 25.884 41.9911 25.884 41.0819V33.8176H20.0322V41.0819C20.0322 41.6321 19.9326 42.0962 19.7349 42.4605C19.5337 42.8312 19.2429 43.1353 18.8708 43.3639C18.4931 43.5952 18.0491 43.7609 17.5507 43.8558C17.0656 43.9488 16.5333 43.9957 15.9686 43.9957H14.8934C14.3293 43.9957 13.792 43.9488 13.2971 43.8562C12.7839 43.7609 12.3384 43.5944 11.972 43.362C11.6134 43.1345 11.3239 42.832 11.1121 42.4628C10.9025 42.0993 10.7966 41.6348 10.7966 41.0819V33.8176H4.94401V41.0819C4.94401 41.9907 5.13816 42.8049 5.5208 43.5022C5.89849 44.1904 6.50422 44.7779 7.32175 45.2473Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-black)"}
      />
      <path
        d="M46.9561 46.688V33.8176H40.9058C39.5631 33.8176 38.433 33.8672 37.5464 33.9651C36.6809 34.0611 35.9298 34.2361 35.3157 34.485C34.6987 34.7354 34.1404 35.0879 33.6568 35.5331C33.1627 35.9881 32.6432 36.5823 32.113 37.2996L25.1761 46.688H31.3852L32.9643 44.5056H41.1719V46.688H46.9561ZM34.9324 41.8126L36.8623 39.1618C37.4744 38.3241 38.0927 37.691 38.7012 37.2794C39.3344 36.851 40.0629 36.5995 40.8655 36.5313L41.1719 36.505V41.8126H34.9324Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-black)"}
      />
      <path
        d="M55.9809 43.9949C55.4903 43.9949 55.1655 43.9378 54.9876 43.8196C54.821 43.7098 54.7398 43.5338 54.7398 43.2815V41.6087H64.4518V38.8969H54.7398V37.2241C54.7398 36.9722 54.821 36.7961 54.9883 36.6856C55.1662 36.5678 55.491 36.5107 55.9809 36.5107H66.132V33.8176H52.4864C51.1203 33.8176 50.1722 33.9922 49.6681 34.3367C49.1507 34.6904 48.888 35.2438 48.888 35.9824V44.5419C48.888 45.2683 49.1507 45.8156 49.6681 46.1689C50.1722 46.5134 51.1203 46.688 52.4864 46.688H63.3449L65.3364 43.9949H55.9809Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-black)"}
      />
      <path
        d="M87.216 46.688V33.8176H81.1657C79.8231 33.8176 78.6929 33.8672 77.8063 33.9651C76.9402 34.0611 76.1898 34.2361 75.5756 34.485C74.9587 34.7354 74.401 35.0879 73.9168 35.5331C73.4219 35.9889 72.9024 36.5831 72.373 37.2996L65.436 46.688H71.6452L73.2243 44.5056H81.4318V46.688H87.216ZM75.1923 41.8126L77.1223 39.1618C77.7336 38.3245 78.3527 37.691 78.9612 37.2794C79.5944 36.851 80.3229 36.5995 81.1255 36.5313L81.4318 36.505V41.8126H75.1923Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-black)"}
      />
      <path
        d="M104.563 39.3859H95.023V37.2241C95.023 36.9726 95.1034 36.7965 95.27 36.686C95.4479 36.5678 95.7732 36.5107 96.2631 36.5107H106.008V33.8176H92.7694C91.4037 33.8176 90.4558 33.9922 89.9511 34.3367C89.4338 34.69 89.172 35.2438 89.172 35.9824V46.688H95.023V42.079H104.563V39.3859Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-black)"}
      />
      <path
        d="M95.8376 25.4882C96.7543 25.1332 96.9838 24.4301 96.3489 23.917C95.7147 23.4044 94.4568 23.2764 93.5401 23.631C93.4044 23.6836 93.2809 23.7449 93.1721 23.8142L83.256 31.2512L95.8376 25.4882Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-secondary)"}
      />
      <path
        d="M34.7834 20.4367C35.6099 20.0295 35.6903 19.3248 34.9633 18.862C34.2363 18.3992 32.9765 18.3543 32.1492 18.7615C32.0801 18.7958 32.0144 18.8327 31.9537 18.8719L14.1 31.2512L34.7834 20.4367Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-secondary)"}
      />
      <path
        d="M77.559 9.32826C78.7294 8.69277 78.7583 7.64695 77.6233 6.99164C76.4882 6.33672 74.619 6.32033 73.4487 6.95583C73.3746 6.99583 73.3047 7.03812 73.2383 7.0827L37.1521 31.2448L77.559 9.32826Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-primary)"}
      />
      <path
        d="M88.5438 16.397C89.6436 15.8248 89.7071 14.8616 88.685 14.246C87.6622 13.6303 85.9419 13.5948 84.8414 14.1671C84.749 14.2155 84.6621 14.2673 84.5824 14.3222L60.204 31.2448L88.5438 16.397Z"
        fill={variant === "mono" ? "currentColor" : "var(--color-brand-black)"}
      />
    </svg>
  );
}
