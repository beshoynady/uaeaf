import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MediaAssetPublicResponseDto } from './dto/media-asset-public-response.dto.js';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto.js';
import { MediaAssetSchema } from './schemas/media-asset.schema.js';

/**
 * The provenance mark never reaches a visitor.
 *
 * The owner's decision is that `isAiGenerated` is an internal editorial
 * signal: a "temporary" chip and a filter in the dashboard, and nothing at
 * all in public — no caption, no badge, no attribute, nothing in the HTML.
 *
 * `MediaAssetsService.toPublicResponse()` builds its shape field by field, so
 * the guarantee already holds by construction. This test is what keeps it
 * holding: it fails the day someone adds the field to the public DTO, which
 * is the only way it could start leaking, and it fails loudly enough that the
 * decision is re-read rather than re-discovered.
 */
describe('mediaAssets provenance', () => {
  it('is stored on the asset, defaulting to false', () => {
    const path = MediaAssetSchema.path('isAiGenerated');

    expect(path).toBeDefined();
    expect(path.options.default).toBe(false);
  });

  it('is absent from the public response shape', () => {
    // Read from the DTO's own declared properties rather than from an
    // instance: the class carries no runtime fields until one is assigned.
    const declared = Object.getOwnPropertyNames(new MediaAssetPublicResponseDto());
    expect(declared).not.toContain('isAiGenerated');

    // And the belt to that brace: the class source itself must not name it.
    expect(MediaAssetPublicResponseDto.toString()).not.toContain('isAiGenerated');
  });

  describe('on upload, where every multipart part is text', () => {
    const upload = (isAiGenerated: unknown) =>
      plainToInstance(UploadMediaAssetDto, {
        caption: { ar: 'ع', en: 'C' },
        altText: { ar: 'ع', en: 'A' },
        isAiGenerated,
      });

    it.each([
      ['true', true],
      ['false', false],
      [true, true],
    ])('reads %p as %p', async (sent, stored) => {
      const dto = upload(sent);

      expect(await validate(dto)).toEqual([]);
      expect(dto.isAiGenerated).toBe(stored);
    });

    it('refuses anything else rather than guessing', async () => {
      const errors = await validate(upload('yes'));

      expect(errors.map((error) => error.property)).toContain('isAiGenerated');
    });
  });
});
