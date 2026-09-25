import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { AboutLinkDto, ProseTextDto, TitleTextDto } from './about-text.dto.js';
import {
  AchievementDto,
  AtMostOneFeatured,
  FactDto,
  GovernanceCardDto,
  MilestoneDto,
  PioneerDto,
} from './about-list-items.dto.js';
import { HIDEABLE_SECTION_KEYS } from '../schemas/about-sections.schema.js';
import type { HideableSectionKey } from '../schemas/about-sections.schema.js';

/**
 * Request body for `PATCH /about-federation-page/:id` — the editable surface
 * of the page.
 *
 * Three things a caller cannot send, each for its own reason:
 *
 * - `isActive` is operational state with its own route and its own grant
 *   (`PATCH :id/active`, Publish). Taking a page off the site is not a draft
 *   edit, and it must not ride along inside one.
 * - `publicationState` is denormalized from `publications` (ADR-0020): a
 *   consequence of publishing, never an instruction from a client.
 * - `sectionOrder` does not exist. The printed order is the page's own
 *   (ADR-0101).
 *
 * Every field is optional and applied only when its key is present, so a
 * partial save touches nothing it did not name. A list sent here replaces the
 * stored list.
 */

/** Four cards stand in one row in the approved composition. */
export const MAX_FACTS = 4;

/** What the approved leadership panel draws beside the portrait. */
export const MAX_PRIORITIES = 4;

/** Three cards stand in one row. */
export const MAX_GOVERNANCE_CARDS = 3;

/** The story is two paragraphs in the approved composition; a third is
 *  allowed, a wall of text is not. */
export const MAX_STORY_PARAGRAPHS = 4;

export class HeroSectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  eyebrow?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: ProseTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProseTextDto)
  description?: ProseTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  imageId?: string | null;
}

export class FactsSectionDto {
  @ApiProperty({ type: [FactDto], required: false, maxItems: MAX_FACTS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_FACTS)
  @ValidateNested({ each: true })
  @Type(() => FactDto)
  items?: FactDto[];
}

export class StoryDocCardDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  label?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  date?: TitleTextDto;
}

export class StorySectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  eyebrow?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: [ProseTextDto], required: false, maxItems: MAX_STORY_PARAGRAPHS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_STORY_PARAGRAPHS)
  @ValidateNested({ each: true })
  @Type(() => ProseTextDto)
  paragraphs?: ProseTextDto[];

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  imageId?: string | null;

  @ApiProperty({ type: StoryDocCardDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => StoryDocCardDto)
  docCard?: StoryDocCardDto;
}

/** The three list-bearing sections share a heading trio; each declares it
 *  rather than inheriting, so Swagger prints the fields on the section it
 *  belongs to. */
export class TimelineSectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  eyebrow?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: ProseTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProseTextDto)
  description?: ProseTextDto;

  @ApiProperty({ type: [MilestoneDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  items?: MilestoneDto[];
}

export class AchievementsSectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  eyebrow?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: ProseTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProseTextDto)
  description?: ProseTextDto;

  @ApiProperty({ type: [AchievementDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AchievementDto)
  items?: AchievementDto[];
}

export class PioneersSectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  eyebrow?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: [PioneerDto], required: false })
  @IsOptional()
  @IsArray()
  @AtMostOneFeatured()
  @ValidateNested({ each: true })
  @Type(() => PioneerDto)
  items?: PioneerDto[];
}

export class LeadershipSectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  eyebrow?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: ProseTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProseTextDto)
  quote?: ProseTextDto;

  @ApiProperty({ type: [TitleTextDto], required: false, maxItems: MAX_PRIORITIES })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PRIORITIES)
  @ValidateNested({ each: true })
  @Type(() => TitleTextDto)
  priorities?: TitleTextDto[];
}

export class GovernanceSectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  eyebrow?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: ProseTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProseTextDto)
  description?: ProseTextDto;

  @ApiProperty({ type: [GovernanceCardDto], required: false, maxItems: MAX_GOVERNANCE_CARDS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_GOVERNANCE_CARDS)
  @ValidateNested({ each: true })
  @Type(() => GovernanceCardDto)
  cards?: GovernanceCardDto[];

  @ApiProperty({ type: AboutLinkDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AboutLinkDto)
  link?: AboutLinkDto;
}

/** Its numbers are counted at request time and its node links are the site's
 *  own routes, so only the heading is stored. */
export class EcosystemSectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  eyebrow?: TitleTextDto;

  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;
}

export class CtaSectionDto {
  @ApiProperty({ type: TitleTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TitleTextDto)
  title?: TitleTextDto;

  @ApiProperty({ type: ProseTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProseTextDto)
  description?: ProseTextDto;

  @ApiProperty({ type: AboutLinkDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AboutLinkDto)
  primary?: AboutLinkDto;

  @ApiProperty({ type: AboutLinkDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AboutLinkDto)
  secondary?: AboutLinkDto;
}

export class UpdateAboutFederationPageDto {
  @ApiProperty({
    required: false,
    isArray: true,
    enum: HIDEABLE_SECTION_KEYS,
    description:
      'The content sections switched off. The hero always prints; leadership and the ecosystem follow their source (ADR-0101).',
  })
  @IsOptional()
  @IsArray()
  @IsIn(HIDEABLE_SECTION_KEYS, { each: true })
  hiddenSections?: HideableSectionKey[];

  @ApiProperty({ type: HeroSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroSectionDto)
  hero?: HeroSectionDto;

  @ApiProperty({ type: FactsSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FactsSectionDto)
  facts?: FactsSectionDto;

  @ApiProperty({ type: StorySectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => StorySectionDto)
  story?: StorySectionDto;

  @ApiProperty({ type: TimelineSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimelineSectionDto)
  timeline?: TimelineSectionDto;

  @ApiProperty({ type: AchievementsSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AchievementsSectionDto)
  achievements?: AchievementsSectionDto;

  @ApiProperty({ type: PioneersSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PioneersSectionDto)
  pioneers?: PioneersSectionDto;

  @ApiProperty({ type: LeadershipSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LeadershipSectionDto)
  leadership?: LeadershipSectionDto;

  @ApiProperty({ type: GovernanceSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GovernanceSectionDto)
  governance?: GovernanceSectionDto;

  @ApiProperty({ type: EcosystemSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => EcosystemSectionDto)
  ecosystem?: EcosystemSectionDto;

  @ApiProperty({ type: CtaSectionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CtaSectionDto)
  cta?: CtaSectionDto;

  @ApiProperty({ type: PageSeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;
}
