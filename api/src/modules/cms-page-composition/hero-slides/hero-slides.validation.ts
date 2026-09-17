import { BadRequestException } from '@nestjs/common';
import { HERO_CTA_LABEL_MAX, isUsableCtaUrl } from './schemas/hero-cta.schema.js';
import type { HeroCtaDto } from './dto/hero-slide-parts.dto.js';
import { HERO_TEXT_LIMITS, heroTextLength } from './schemas/hero-text.schema.js';

/**
 * What a hero slide's two buttons must satisfy before they are stored.
 *
 * Separated from the service because these are rules about a shape, not about
 * a collection: they are the same whether the shape arrived on a create, on a
 * patch, or merged from both, and a rule that reads the request rather than
 * the resulting slide is the bug this module exists to make impossible.
 *
 * Each refusal carries its own code (`api-error-code.ts`) because each has a
 * different fix — write the missing half, shorten what you wrote, correct the
 * link — and a single `badRequest` would show an editor one sentence for all
 * three.
 */

/** Which of the two a message is about, so the dashboard can point at the
 *  right field rather than at the slide. */
export type HeroCtaSlot = 'primaryCta' | 'secondaryCta';

const filled = (value: string | undefined | null): boolean => typeof value === 'string' && value.trim().length > 0;

/**
 * A button a visitor can see must be complete.
 *
 * A hidden one is not checked at all, and that asymmetry is the requirement:
 * hiding a button must not erase its words, so a half-written hidden button
 * has to remain storable.
 *
 * @throws BadRequestException `incompleteCta` · `ctaLabelTooLong` · `invalidCtaUrl`
 */
export const assertCtaUsable = (slot: HeroCtaSlot, cta: HeroCtaDto | undefined): void => {
  if (!cta?.isVisible) return;

  const ar = cta.label?.ar;
  const en = cta.label?.en;

  if (!filled(ar) || !filled(en) || !filled(cta.url)) {
    throw new BadRequestException({
      code: 'incompleteCta',
      message: `"${slot}" is visible, so it needs a label in both languages and a URL.`,
      field: slot,
      missing: [
        filled(ar) ? null : 'label.ar',
        filled(en) ? null : 'label.en',
        filled(cta.url) ? null : 'url',
      ].filter(Boolean),
    });
  }

  for (const [language, text] of [
    ['ar', ar!],
    ['en', en!],
  ] as const) {
    // Counted as a reader counts, by grapheme, the same count as the texts and
    // the dashboard: a vowel mark is not another character on the button.
    if (heroTextLength(text) > HERO_CTA_LABEL_MAX) {
      throw new BadRequestException({
        code: 'ctaLabelTooLong',
        message: `"${slot}" label (${language}) is ${heroTextLength(text)} characters; at most ${HERO_CTA_LABEL_MAX} fit the button at 390px.`,
        field: `${slot}.label.${language}`,
        limit: HERO_CTA_LABEL_MAX,
      });
    }
  }

  if (!isUsableCtaUrl(cta.url!.trim())) {
    throw new BadRequestException({
      code: 'invalidCtaUrl',
      message: `"${slot}" must point either at an internal path beginning with a single "/" or at an absolute https:// URL.`,
      field: `${slot}.url`,
    });
  }
};

/** Counts grapheme-ish length the same way the guard above does, exported so
 *  the dashboard can show the identical count beside the field rather than a
 *  UTF-16 one that disagrees with the server on emoji and on some Arabic
 *  presentation forms. */
export const ctaLabelLength = (text: string): number => [...text.trim()].length;

/** The bilingual texts a slide carries, as the request or the stored slide
 *  holds them. */
interface SlideTexts {
  eyebrow?: { ar?: string; en?: string } | null;
  title?: { ar?: string; en?: string } | null;
  subtitle?: { ar?: string; en?: string } | null;
}

/**
 * No hero text may be longer than its field holds at 390px (`HERO_TEXT_LIMITS`,
 * measured). Checked on hidden slides too: the limit is about the layout, and a
 * slide shown tomorrow is laid out with today's words.
 *
 * @throws BadRequestException (`heroTextTooLong`, naming the field and its limit).
 */
export const assertHeroTexts = (slide: SlideTexts): void => {
  for (const field of ['eyebrow', 'title', 'subtitle'] as const) {
    const limit = HERO_TEXT_LIMITS[field];
    for (const language of ['ar', 'en'] as const) {
      const text = slide[field]?.[language];
      if (typeof text === 'string' && heroTextLength(text) > limit) {
        throw new BadRequestException({
          code: 'heroTextTooLong',
          message: `"${field}.${language}" is ${heroTextLength(text)} characters; at most ${limit} fit at 390px.`,
          field: `${field}.${language}`,
          limit,
        });
      }
    }
  }
};

/**
 * A slide a visitor can see is complete: a title and a subtitle in both
 * languages, and its picture. A hidden slide may be half written, which is how
 * an editor works on one before showing it; the dashboard's save is a publish
 * (owner decisions 2026-09-17). Every gap is named at once, so an editor fixes
 * them in one pass rather than one refusal at a time.
 *
 * @throws BadRequestException (`incompleteSlide`, with `missing`).
 */
export const assertVisibleSlideComplete = (
  slide: SlideTexts & { active: boolean; mediaType: string; imageAssetId: string | null },
): void => {
  if (!slide.active) return;
  const missing: string[] = [];
  for (const field of ['title', 'subtitle'] as const) {
    for (const language of ['ar', 'en'] as const) {
      if (!filled(slide[field]?.[language])) missing.push(`${field}.${language}`);
    }
  }
  if (slide.mediaType === 'IMAGE' && !slide.imageAssetId) missing.push('imageAssetId');
  if (missing.length > 0) {
    throw new BadRequestException({
      code: 'incompleteSlide',
      message: `A visible slide needs ${missing.join(', ')}.`,
      missing,
    });
  }
};

/**
 * A slide's window may be open at either end, or close at the moment it opens,
 * but never close before it opens: that slide would never show, and an editor
 * would only see it as "scheduled". Checked on the slide as it would be stored,
 * so moving one bound past the other stored one is refused too.
 *
 * @throws BadRequestException (`scheduleEndsBeforeStart`, naming `scheduledTo`).
 */
export const assertScheduleOrder = (scheduledFrom: Date | null, scheduledTo: Date | null): void => {
  if (!scheduledFrom || !scheduledTo || scheduledTo.getTime() >= scheduledFrom.getTime()) return;
  throw new BadRequestException({
    code: 'scheduleEndsBeforeStart',
    message: 'scheduledTo must not be earlier than scheduledFrom.',
    field: 'scheduledTo',
  });
};
