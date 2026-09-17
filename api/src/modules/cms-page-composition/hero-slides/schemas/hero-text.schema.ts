import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * How long each hero text may be, measured at 390px with the site's own
 * elements, fonts and column width, the smaller of Arabic and English
 * (progress log §٢٧.٣).
 *
 * The web and the dashboard read the same numbers from `@uaeaf/content/hero`
 * (`limits.ts`). The API cannot import that workspace (its compiled root is
 * `src`), so the numbers are repeated here, and `hero-slides.visible.spec.ts`
 * fails the day the two copies disagree.
 */
export const HERO_TEXT_LIMITS = {
  eyebrow: 52,
  title: 44,
  subtitle: 116,
  eventName: 52,
  eventLabel: 52,
  eventVenue: 35,
} as const;

/** Characters as a reader counts them: grapheme clusters, ends trimmed. */
export const heroTextLength = (text: string): number => {
  const trimmed = text.trim();
  return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)].length;
};

/**
 * A slide's bilingual text, which may be empty while the slide is hidden.
 *
 * Not the shared `LocalizedText`, whose halves are required: the dashboard's
 * save is a publish, so a slide an editor is still writing is saved hidden and
 * half written, and only showing it demands both halves
 * (`assertVisibleSlideComplete`). The shared schema keeps its guarantee for
 * every other field in the platform.
 */
@Schema({ _id: false })
export class HeroText {
  @Prop({ type: String, default: '' })
  ar: string;

  @Prop({ type: String, default: '' })
  en: string;
}

export const HeroTextSchema = SchemaFactory.createForClass(HeroText);

export const EMPTY_HERO_TEXT: Readonly<HeroText> = { ar: '', en: '' };
