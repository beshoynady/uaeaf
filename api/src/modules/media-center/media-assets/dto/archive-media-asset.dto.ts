import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Request body for `DELETE /media-assets/:id`.
 *
 * Empty on the first attempt. When the archive is refused because the image
 * is still used elsewhere — or because that could not be checked —
 * `acknowledgeReferences: true` archives it anyway: the operator has seen
 * what was found and wants to proceed regardless.
 */
export class ArchiveMediaAssetDto {
  @ApiPropertyOptional({
    description:
      'Confirms the operator has seen every place this image is used (or that the check for that ' +
      'could not complete) and wants to archive it anyway. Omit or false on the first attempt.',
  })
  @IsOptional()
  @IsBoolean()
  acknowledgeReferences?: boolean;
}
