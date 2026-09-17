import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { isUsableCtaUrl } from '../hero-slides/schemas/hero-cta.schema.js';

/**
 * The SPONSORS section's own settings (ADR-0077 D2, ADR-0085 D5):
 *
 * - `configuration.bannerSponsorshipId`: which sponsorship the banner prefers
 *   among those of the highest tier present (D5.1). Never a way to put a lower
 *   tier in the banner.
 * - `ctaText` + `ctaUrl` (the section's own fields): the partnership call to
 *   action. No page describes the programme yet, so it is shown only when both
 *   are written, and only to a link the site allows (the hero buttons' rule).
 */

type Localized = { ar?: unknown; en?: unknown } | null | undefined;

const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

interface SponsorsSectionLike {
  configuration?: Record<string, unknown> | null;
  ctaText?: Localized;
  ctaUrl?: string | null;
}

/** @throws BadRequestException (`badRequest` on the banner id, `incompleteCta`,
 *  `invalidCtaUrl`). */
export const assertSponsorsSectionSettings = (section: SponsorsSectionLike): void => {
  const bannerId = section.configuration?.bannerSponsorshipId;
  if (bannerId !== undefined && bannerId !== null && !(typeof bannerId === 'string' && Types.ObjectId.isValid(bannerId))) {
    throw new BadRequestException({
      code: 'badRequest',
      message: 'configuration.bannerSponsorshipId must be a sponsorship id or null.',
      field: 'configuration.bannerSponsorshipId',
    });
  }

  const hasText = filled(section.ctaText?.ar) && filled(section.ctaText?.en);
  const hasAnyText = filled(section.ctaText?.ar) || filled(section.ctaText?.en);
  const hasUrl = filled(section.ctaUrl);
  if ((hasAnyText || hasUrl) && !(hasText && hasUrl)) {
    throw new BadRequestException({
      code: 'incompleteCta',
      message: 'The partnership call to action needs its text in both languages and its link, or neither.',
      field: hasUrl ? 'ctaText' : 'ctaUrl',
    });
  }
  if (hasUrl && !isUsableCtaUrl(section.ctaUrl!.trim())) {
    throw new BadRequestException({
      code: 'invalidCtaUrl',
      message: 'ctaUrl must be a path on the site (/…) or an https:// address.',
      field: 'ctaUrl',
    });
  }
};
