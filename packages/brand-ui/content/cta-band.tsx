import type { ReactNode } from "react";

import { Surface } from "../surface/surface";

export type CtaBandProps = {
  title: ReactNode;
  description?: ReactNode;
  /** The action. A `Button` from this package, usually. */
  action: ReactNode;
  tone?: "red" | "green";
  /**
   * `band` is full-bleed on the identity ground. `card` insets that ground into
   * a canvas section, so the canvas shows on all four sides.
   *
   * **`card` is not a style preference.** ADR-0098 §8.6: where a red CTA would
   * otherwise land against a green section, the two grounds measure 1.15:1 from
   * each other and read as one band with no boundary anywhere in it. Insetting
   * one of them makes the canvas gutter the separator — a boundary a reader
   * sees, rather than the hairline ADR-0059 D2's mandatory separator token
   * provides. Where both must be full-bleed the token is still required; where
   * one can be inset, insetting is preferred.
   */
  layout?: "band" | "card";
  className?: string;
};

/**
 * A call to action on an identity ground.
 *
 * Its text is white on both tones, one tier, with hierarchy from size and
 * weight — the surface publishes exactly that (ADR-0098 §8.2), so nothing here
 * chooses a colour.
 *
 * Server Component.
 */
export const CtaBand = ({
  title,
  description,
  action,
  tone = "red",
  layout = "band",
  className,
}: CtaBandProps) => {
  const kind = tone === "red" ? "brand-red" : "brand-green";

  const content = (
    <div className="brand-cta-band__inner" data-layout={layout}>
      <div className="brand-cta-band__text">
        <p className="brand-cta-band__title">{title}</p>
        {description === undefined ? null : (
          <p className="brand-cta-band__description">{description}</p>
        )}
      </div>
      <div className="brand-cta-band__action">{action}</div>
    </div>
  );

  if (layout === "band") {
    return (
      <Surface kind={kind} className={["brand-cta-band", className].filter(Boolean).join(" ")}>
        {content}
      </Surface>
    );
  }

  /*
   * The inset form: a canvas section holding a brand-ground card. Two nested
   * surfaces, which is exactly what the mechanism is for — the inner one
   * republishes the on-surface variables, so the Button inside it inverts to a
   * white plate without knowing it moved.
   */
  return (
    <Surface kind="canvas" className={["brand-cta-band-holder", className].filter(Boolean).join(" ")}>
      <Surface kind={kind} as="div" className="brand-cta-band">
        {content}
      </Surface>
    </Surface>
  );
};
