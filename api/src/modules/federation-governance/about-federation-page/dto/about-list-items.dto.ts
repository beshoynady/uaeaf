import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
  ValidateNested,
  registerDecorator,
} from 'class-validator';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { ProseTextDto, TitleTextDto } from './about-text.dto.js';
import {
  DATE_PRECISIONS,
  FACT_TONES,
  CARD_TONES,
  MEDAL_KINDS,
  MILESTONE_CATEGORIES,
} from '../schemas/about-sections.schema.js';
import type { DatePrecision } from '../schemas/about-sections.schema.js';

/**
 * Request shapes for the About page's four editable lists.
 *
 * `_id` is optional on every item, exactly as the strategic plan's are: an
 * item carrying an id the stored list already holds keeps it, anything else
 * is treated as new, so the dashboard never has to know which rows are new.
 * `isVisible` left out means visible. `displayOrder` is not sent — the array's
 * own order is the order, and the service renumbers from it.
 */

/** Which date parts each precision claims to know. The one place this is
 *  written; the validator below reads it rather than repeating the list. */
const REQUIRED_DATE_PARTS: Record<DatePrecision, readonly ('year' | 'month' | 'day')[]> = {
  year: ['year'],
  monthYear: ['year', 'month'],
  fullDate: ['year', 'month', 'day'],
  unknown: [],
};

/**
 * A milestone carries exactly the date parts its precision claims.
 *
 * Without this the page prints dates the federation never confirmed: a
 * milestone at `fullDate` holding only a year renders a day out of nothing,
 * and one at `year` holding none renders a card with a blank where its date
 * belongs. `unknown` is the deliberate opposite — it claims nothing, so it
 * requires nothing, and the service withholds the milestone until an editor
 * raises its precision.
 */
const HasItsDateParts = (options?: ValidationOptions) => (object: object, propertyName: string) =>
  registerDecorator({
    name: 'hasItsDateParts',
    target: object.constructor,
    propertyName,
    options,
    validator: {
      validate(precision: unknown, args: ValidationArguments) {
        if (typeof precision !== 'string' || !(precision in REQUIRED_DATE_PARTS)) {
          return false;
        }
        const item = args.object as Record<string, unknown>;
        return REQUIRED_DATE_PARTS[precision as DatePrecision].every(
          (part) => typeof item[part] === 'number',
        );
      },
      defaultMessage(args: ValidationArguments) {
        const precision = (args.object as { datePrecision?: string }).datePrecision ?? '';
        const parts = REQUIRED_DATE_PARTS[precision as DatePrecision];
        return parts
          ? `A "${precision}" date needs ${parts.join(', ')}.`
          : `datePrecision must be one of: ${DATE_PRECISIONS.join(', ')}.`;
      },
    },
  });

/**
 * At most one item in the list is the featured one.
 *
 * The approved composition draws the featured entry as a single wide card
 * beside the rest; a second one has nowhere to go, and the page would silently
 * print whichever the loop reached first.
 */
export const AtMostOneFeatured = (options?: ValidationOptions) => (object: object, propertyName: string) =>
  registerDecorator({
    name: 'atMostOneFeatured',
    target: object.constructor,
    propertyName,
    options,
    validator: {
      validate(items: unknown) {
        if (!Array.isArray(items)) {
          return true;
        }
        return items.filter((item) => (item as { featured?: unknown })?.featured === true).length <= 1;
      },
      defaultMessage: () => 'Only one entry can be the featured one.',
    },
  });

/** What every item in every list carries. */
abstract class AboutListItemDto {
  @ApiProperty({ required: false, description: "The item's id when it already exists; omitted for a new item." })
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @ApiProperty({ required: false, default: true, description: 'False hides the item from the public page.' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class FactDto extends AboutListItemDto {
  @ApiProperty({ description: 'Printed as given — "1974", "+50".' })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  badge: TitleTextDto;

  @ApiProperty()
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  label: TitleTextDto;

  @ApiProperty({ description: 'Kept as text: the card prints "1974" today and may print "+50" later.' })
  @IsDefined()
  @Type(() => String)
  value: string;

  @ApiProperty({ enum: FACT_TONES })
  @IsIn(FACT_TONES)
  tone: (typeof FACT_TONES)[number];
}

export class MilestoneDto extends AboutListItemDto {
  @ApiProperty({ enum: DATE_PRECISIONS, description: 'How much of the date the federation has confirmed.' })
  @HasItsDateParts()
  datePrecision: DatePrecision;

  @ApiProperty({ required: false, minimum: 1900, maximum: 2200 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  year?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 31 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number;

  @ApiProperty({ enum: MILESTONE_CATEGORIES })
  @IsIn(MILESTONE_CATEGORIES)
  category: (typeof MILESTONE_CATEGORIES)[number];

  @ApiProperty({ type: TitleTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title: TitleTextDto;

  @ApiProperty({ type: ProseTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProseTextDto)
  description: ProseTextDto;

  @ApiProperty({ required: false, default: false, description: 'The dark card in the approved composition.' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  imageId?: string | null;
}

export class AchievementDto extends AboutListItemDto {
  @ApiProperty({ minimum: 1900, maximum: 2200 })
  @IsInt()
  @Min(1900)
  @Max(2200)
  year: number;

  @ApiProperty({ type: TitleTextDto, description: 'Where it happened.' })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  place: TitleTextDto;

  @ApiProperty({ enum: MEDAL_KINDS })
  @IsIn(MEDAL_KINDS)
  medalKind: (typeof MEDAL_KINDS)[number];

  @ApiProperty({
    type: TitleTextDto,
    required: false,
    nullable: true,
    description: 'What the badge prints when the kind alone cannot say it — "5 golds".',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  medalLabel?: TitleTextDto | null;

  @ApiProperty({ type: TitleTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title: TitleTextDto;

  @ApiProperty({ type: ProseTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProseTextDto)
  description: ProseTextDto;

  @ApiProperty({ required: false, nullable: true, description: "ref → athletes, where the athlete has a record." })
  @IsOptional()
  @IsMongoId()
  athleteId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  imageId?: string | null;
}

export class PioneerDto extends AboutListItemDto {
  @ApiProperty({ type: TitleTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  name: TitleTextDto;

  @ApiProperty({ type: TitleTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  badge: TitleTextDto;

  @ApiProperty({ type: ProseTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProseTextDto)
  description: ProseTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  imageId?: string | null;

  @ApiProperty({ required: false, default: false, description: 'The wide card. At most one.' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

export class GovernanceCardDto extends AboutListItemDto {
  @ApiProperty({ type: TitleTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title: TitleTextDto;

  @ApiProperty({ type: ProseTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ProseTextDto)
  text: ProseTextDto;

  @ApiProperty({ enum: CARD_TONES })
  @IsIn(CARD_TONES)
  tone: (typeof CARD_TONES)[number];
}
