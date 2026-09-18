import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsMongoId, IsOptional } from 'class-validator';
import {
  SPONSOR_STRIP_DISPLAY_MODES,
  SPONSOR_STRIP_ORDERS,
  SPONSOR_STRIP_SELECTIONS,
  SPONSOR_STRIP_SPEEDS,
} from '../schemas/sponsor-strip.schema.js';
import type {
  SponsorStripDisplayMode,
  SponsorStripOrder,
  SponsorStripSelection,
  SponsorStripSpeed,
} from '../schemas/sponsor-strip.schema.js';

/** Request body for PUT /site-settings/sponsor-strip — the whole strip, every
 *  field present, the way the dashboard's settings panel saves it; and the
 *  shape the public settings carry. */
export class SponsorStripSettingsDto {
  @ApiProperty() @IsBoolean() isVisible: boolean;

  @ApiProperty({ enum: SPONSOR_STRIP_DISPLAY_MODES })
  @IsIn(SPONSOR_STRIP_DISPLAY_MODES)
  displayMode: SponsorStripDisplayMode;

  @ApiProperty({ enum: SPONSOR_STRIP_SELECTIONS })
  @IsIn(SPONSOR_STRIP_SELECTIONS)
  selection: SponsorStripSelection;

  @ApiProperty({ type: [String], description: 'Read only when selection is manual, in this order.' })
  @IsArray()
  @IsMongoId({ each: true })
  sponsorshipIds: string[];

  @ApiProperty({ enum: SPONSOR_STRIP_ORDERS }) @IsIn(SPONSOR_STRIP_ORDERS) order: SponsorStripOrder;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The one sponsorship held still at the head of the strip; null when none is (ADR-0086 D2).',
  })
  @IsOptional()
  @IsMongoId()
  pinnedSponsorshipId: string | null;

  @ApiProperty({ enum: SPONSOR_STRIP_SPEEDS }) @IsIn(SPONSOR_STRIP_SPEEDS) speed: SponsorStripSpeed;
}
