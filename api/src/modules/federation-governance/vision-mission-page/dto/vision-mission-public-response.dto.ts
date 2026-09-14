import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import {
  PublicContentBlockDto,
  PublicImageDto,
  PublicSeoDto,
  PublicValueDto,
} from '../../../../common/dto/public-page.dto.js';

/**
 * What `/about/governance/vision-mission` receives — an explicit list of
 * fields, built field by field from the published snapshot, for the reason
 * ADR-0069 D3 gives: a projection that must be edited to EXPOSE a field fails
 * closed. The stored row also carries `federationId`, `revisionId`, the
 * editors and the timestamps, and none of them reaches a visitor.
 */
export class VisionMissionPublicResponseDto {
  @ApiProperty({ type: LocalizedTextDto }) heroTitle: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) heroSubtitle: LocalizedTextDto;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  heroImage: PublicImageDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  visionTitle: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto }) visionText: LocalizedTextDto;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  visionImage: PublicImageDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  missionTitle: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto }) missionText: LocalizedTextDto;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  missionImage: PublicImageDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  goalsTitle: LocalizedTextDto | null;

  @ApiProperty({ type: [PublicContentBlockDto] }) strategicGoals: PublicContentBlockDto[];
  @ApiProperty({ type: [PublicValueDto] }) coreValues: PublicValueDto[];

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  valuesImage: PublicImageDto | null;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  ctaImage: PublicImageDto | null;

  @ApiProperty({ type: PublicSeoDto, required: false, nullable: true })
  seo: PublicSeoDto | null;

  @ApiProperty({ description: 'When the Live version was published, from the publication, never stored.' })
  publishedAt: string;
}
