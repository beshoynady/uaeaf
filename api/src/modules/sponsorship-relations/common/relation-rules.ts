import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PublicImageDto } from '../../../common/dto/public-page.dto.js';
import type { OrganizationName } from '../../../common/schemas/organization-name.schema.js';

/**
 * The rules the four relationship collections share (ADR-0085): a window
 * that cannot end before it starts, a website that is a web address, a demo
 * record that never reaches the public in production, and the one card shape
 * partners and memberships both draw.
 */

/** @throws BadRequestException `sponsorshipEndsBeforeStart`. */
export const assertWindowOrder = (startDate: Date | null, endDate: Date | null): void => {
  if (startDate && endDate && endDate < startDate) {
    throw new BadRequestException({
      code: 'sponsorshipEndsBeforeStart',
      message: 'endDate must not be earlier than startDate.',
      field: 'endDate',
    });
  }
};

/** `07-Mongoose-Schema-Specification.md` Domain 9: `match: /^https?:\/\/.+/`. */
export const WEBSITE_PATTERN = /^https?:\/\/.+/;

/** @throws BadRequestException when the address is not http(s). */
export const assertWebsite = (website: string | null | undefined): void => {
  if (website && !WEBSITE_PATTERN.test(website)) {
    throw new BadRequestException({
      code: 'badRequest',
      message: 'website must start with http:// or https://.',
      field: 'website',
    });
  }
};

/** Demo records are hidden from every public read in production only
 *  (ADR-0085 D2.1): outside production they are what the homepage is built
 *  and reviewed with. */
export const hidesDemoRecords = (config: ConfigService): boolean => config.get<string>('NODE_ENV') === 'production';

/** The date a request sends, or `null` for an omitted one. */
export const dateOrNull = (value: string | null | undefined): Date | null => (value ? new Date(value) : null);

/** The public name shape: each side as stored, `null` where the organisation
 *  has no name in that language. Never a copy of the other side. */
export interface PublicOrganizationName {
  ar: string | null;
  en: string | null;
}

export const publicName = (name: OrganizationName): PublicOrganizationName => ({
  ar: name?.ar ?? null,
  en: name?.en ?? null,
});

/** One logo-plus-name card, as partners and memberships both draw it. */
export interface PublicOrganizationCard {
  id: string;
  name: PublicOrganizationName;
  logo: PublicImageDto | null;
  displayOrder: number;
}

export const toOrganizationCard = (
  id: string,
  name: OrganizationName,
  logoId: unknown,
  images: Map<string, PublicImageDto>,
  displayOrder: number,
): PublicOrganizationCard => ({
  id,
  name: publicName(name),
  logo: logoId ? (images.get(String(logoId)) ?? null) : null,
  displayOrder,
});
