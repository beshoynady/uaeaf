import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PublicImageDto, PublicSeoDto } from '../../../../common/dto/public-page.dto.js';

/**
 * The public list items. Each carries its `id` as a string so the page can
 * key its rendering on something stable across publications; hidden items
 * never appear here, and each list arrives sorted by `displayOrder`.
 */
export class PublicPlanItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) description: LocalizedTextDto;
  @ApiProperty() displayOrder: number;
}

export class PublicPlanPhaseDto extends PublicPlanItemDto {
  @ApiProperty({ description: 'One of the four approved phase icon keys.' }) iconKey: string;
}

export class PublicPlanMetricDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Free text, e.g. "2030" or "+30%".' }) value: string;
  @ApiProperty({ type: LocalizedTextDto }) label: LocalizedTextDto;
  @ApiProperty() displayOrder: number;
}

export class PublicPlanStepDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  description: LocalizedTextDto | null;

  @ApiProperty() displayOrder: number;
}

/**
 * What `/about/governance/strategic-plan` receives — an explicit list of
 * fields, built field by field from the published snapshot, for the reason
 * ADR-0069 D3 gives: a projection that must be edited to EXPOSE a field fails
 * closed. The stored row also carries `federationId`, `revisionId`, the
 * editors, the timestamps and the hidden items, and none of them reaches a
 * visitor.
 */
export class StrategicPlanPublicResponseDto {
  @ApiProperty({ type: LocalizedTextDto }) heroTitle: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) heroSubtitle: LocalizedTextDto;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  heroImage: PublicImageDto | null;

  @ApiProperty({ type: LocalizedTextDto }) introHeading: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) introText: LocalizedTextDto;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  introImage: PublicImageDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  phasesTitle: LocalizedTextDto | null;

  @ApiProperty({ type: [PublicPlanPhaseDto] }) phases: PublicPlanPhaseDto[];

  @ApiProperty({ type: LocalizedTextDto }) pillarsTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  pillarsText: LocalizedTextDto | null;

  @ApiProperty({ type: [PublicPlanItemDto] }) pillars: PublicPlanItemDto[];

  @ApiProperty({ type: LocalizedTextDto }) objectivesTitle: LocalizedTextDto;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  objectivesImage: PublicImageDto | null;

  @ApiProperty({ type: [PublicPlanItemDto] }) objectives: PublicPlanItemDto[];

  @ApiProperty({ type: LocalizedTextDto }) metricsTitle: LocalizedTextDto;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  metricsImage: PublicImageDto | null;

  @ApiProperty({ type: [PublicPlanMetricDto] }) metrics: PublicPlanMetricDto[];

  @ApiProperty({ type: LocalizedTextDto }) executionTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  executionText: LocalizedTextDto | null;

  @ApiProperty({ type: [PublicPlanStepDto] }) executionSteps: PublicPlanStepDto[];

  @ApiProperty({ type: LocalizedTextDto }) ctaTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  ctaText: LocalizedTextDto | null;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  ctaImage: PublicImageDto | null;

  @ApiProperty({ type: PublicSeoDto, required: false, nullable: true })
  seo: PublicSeoDto | null;

  @ApiProperty({ description: 'When the Live version was published, from the publication, never stored.' })
  publishedAt: string;
}
