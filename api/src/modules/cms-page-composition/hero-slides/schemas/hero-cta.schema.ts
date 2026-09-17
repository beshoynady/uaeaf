import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HeroText, HeroTextSchema } from './hero-text.schema.js';

/**
 * One of a slide's two calls to action (owner decision 2026-09-16).
 *
 * `isVisible` is a separate field from the label and the URL, and keeping
 * them separate is the requirement, not an implementation detail: hiding a
 * button must not erase what it said. An editor who takes the second button
 * down for a campaign and puts it back a week later should find their words
 * where they left them, which a nullable `label` would not give them.
 *
 * So a hidden button may hold anything, including nothing. A **visible** one
 * is validated — both language halves and a usable URL — by
 * `HeroSlidesService`, which is where a conditional rule of this shape can be
 * expressed at all.
 */
@Schema({ _id: false })
export class HeroCta {
  @Prop({ type: Boolean, default: false })
  isVisible: boolean;

  /** Either half may be empty while the button is hidden; a visible button
   *  needs both (`assertCtaUsable`). */
  @Prop({ type: HeroTextSchema, default: null })
  label: HeroText | null;

  @Prop({ type: String, default: null })
  url: string | null;
}

export const HeroCtaSchema = SchemaFactory.createForClass(HeroCta);

/**
 * The longest a button label may be, in characters, per language.
 *
 * Derived from the narrowest frame the button is drawn in rather than chosen:
 * at 390 the container leaves 358px of content (`px-4` on each side), the
 * button recipe spends 32px of that on its own horizontal padding, and the
 * label is `text-body-sm` at `--typography-body-sm-mobile`. 32 characters of
 * Alexandria at that size sits inside the remaining 326px in both languages
 * with room to spare, and a longer label either wraps the button to two lines
 * or pushes it past the screen — neither of which the approved composition
 * has a state for.
 *
 * Confirmed against the rendered button at 390 in both languages; the
 * measurement is recorded in `docs/engineering/how-hero-works.md`.
 */
export const HERO_CTA_LABEL_MAX = 32;

/**
 * Where a hero button may point.
 *
 * Two shapes only, and everything else is refused with its own error code
 * rather than stored and discovered later by a visitor:
 *
 * - **Internal** — begins with a single `/`. The locale is added by the site
 *   when the link is drawn, so an editor writes `/championships` once and
 *   both languages route correctly. A stored `/ar/...` would pin the link to
 *   one language and send an English reader into Arabic.
 * - **External** — an absolute `https://` URL. Plain `http` is refused: the
 *   federation's site is served over TLS, and a link that downgrades it is a
 *   defect the editor cannot see but every browser will.
 *
 * `//host` is deliberately not internal — a protocol-relative URL leaves the
 * site while looking like a path, which is exactly the confusion a closed
 * rule exists to prevent.
 */
export const isInternalCtaUrl = (url: string): boolean => /^\/(?!\/)/.test(url);

export const isExternalCtaUrl = (url: string): boolean => {
  if (!/^https:\/\//i.test(url)) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

export const isUsableCtaUrl = (url: string): boolean => isInternalCtaUrl(url) || isExternalCtaUrl(url);
