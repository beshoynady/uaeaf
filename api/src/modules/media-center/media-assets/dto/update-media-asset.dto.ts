import { PartialType, PickType } from '@nestjs/swagger';
import { CreateMediaAssetDto } from './create-media-asset.dto.js';

/**
 * Request body for PATCH /media-assets/:id. Every field optional; omitting
 * one leaves it unchanged.
 *
 * Deliberately `PickType`, not the mechanical `PartialType(CreateDto)` every
 * other resource in this batch uses: `CreateMediaAssetDto` also carries
 * `albumId` and `file`, and both are wrong to expose on a metadata edit.
 * `file` is provenance — its `storageKey`/`checksum`/dimensions come only
 * from the bytes and the storage provider's own answer (see
 * `MediaAssetsService.uploadAndCreate`'s doc comment), never from a
 * request — and a client-writable `file` here would let a PATCH overwrite
 * that with an arbitrary URL. `albumId` reassignment has to keep the old
 * and new album's denormalized `assetCount` in step (see `create()`/
 * `remove()`), which this mechanical route does not attempt — moving an
 * asset between albums stays a job for a dedicated operation, not a side
 * door on the general metadata patch.
 */
export class UpdateMediaAssetDto extends PartialType(
  PickType(CreateMediaAssetDto, ['caption', 'altText', 'displayOrder', 'isVisible', 'isFeatured', 'isAiGenerated'] as const),
  { skipNullProperties: false },
) {}
