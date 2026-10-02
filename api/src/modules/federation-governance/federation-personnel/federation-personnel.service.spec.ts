import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationPersonnelsService } from './federation-personnel.service.js';
import { FederationPersonnelsRepository } from './federation-personnel.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

/**
 * Fix round 1 (CLAUDE.md §31): `create()`'s `photoId` check
 * (`mediaAssetsService.assertUsableImage`) is re-run on `update()` when the
 * field is sent to a real value, mirroring `HeroSlidesService`'s
 * established convention for image references. Before this round,
 * `update()` never called `mediaAssetsService` at all — a patch could set
 * `photoId` to an archived or non-image asset with nothing to refuse it.
 */
describe('FederationPersonnelsService.update', () => {
  const id = new Types.ObjectId().toString();

  // `update()` now loads the existing row first (to refuse a changed slug —
  // see the describe block below), so every row here needs a truthy
  // `findById` result or it would fail on NotFoundException before ever
  // reaching the photoId behaviour under test.
  const makeRepository = () =>
    ({
      updateById: jest.fn(),
      findById: jest.fn(async () => ({ slug: 'existing-slug' })),
    }) as unknown as jest.Mocked<FederationPersonnelsRepository>;
  const makeMediaAssetsService = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  it('validates a changed photoId via MediaAssetsService.assertUsableImage before writing', async () => {
    const repository = makeRepository();
    const mediaAssetsService = makeMediaAssetsService();
    mediaAssetsService.assertUsableImage.mockRejectedValue(new ConflictException());
    const service = new FederationPersonnelsService(repository, mediaAssetsService);
    const photoId = new Types.ObjectId().toString();

    await expect(service.update(id, { photoId } as never)).rejects.toThrow(ConflictException);
    expect(mediaAssetsService.assertUsableImage).toHaveBeenCalledWith(photoId);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('clears the photo with photoId: null without calling MediaAssetsService', async () => {
    const repository = makeRepository();
    const mediaAssetsService = makeMediaAssetsService();
    repository.updateById.mockResolvedValue({ photoId: null } as never);
    const service = new FederationPersonnelsService(repository, mediaAssetsService);

    await service.update(id, { photoId: null } as never);

    expect(mediaAssetsService.assertUsableImage).not.toHaveBeenCalled();
    expect(repository.updateById).toHaveBeenCalledWith(id, { photoId: null });
  });

  it('writes a patch that does not touch photoId without calling MediaAssetsService', async () => {
    const repository = makeRepository();
    const mediaAssetsService = makeMediaAssetsService();
    repository.updateById.mockResolvedValue({ status: 'Inactive' } as never);
    const service = new FederationPersonnelsService(repository, mediaAssetsService);

    await service.update(id, { status: 'Inactive' } as never);

    expect(mediaAssetsService.assertUsableImage).not.toHaveBeenCalled();
    expect(repository.updateById).toHaveBeenCalledWith(id, { status: 'Inactive' });
  });
});

/**
 * Task 4: `slug` backs the public profile page and is fixed after creation
 * (`assertSlugFree` on `create()`, a same-value-or-omitted check on
 * `update()`) — the same pattern `CommitteesService` already applies.
 */
describe('FederationPersonnelsService — slug', () => {
  const makeRepository = () =>
    ({
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<FederationPersonnelsRepository>;
  const makeService = (repository: FederationPersonnelsRepository) =>
    new FederationPersonnelsService(
      repository,
      ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>,
    );

  it('refuses a slug already held by another live person', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue({ _id: new Types.ObjectId() } as never);
    const service = makeService(repository);

    await expect(service.create({ slug: 'taken', fullName: { ar: 'أ', en: 'A' } } as never)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('keeps the slug fixed after creation', async () => {
    const repository = makeRepository();
    const existing = new Types.ObjectId();
    repository.findById.mockResolvedValue({ _id: existing, slug: 'original' } as never);
    const service = makeService(repository);

    await expect(service.update(existing.toString(), { slug: 'changed' } as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts an update that leaves the slug out', async () => {
    const repository = makeRepository();
    const existing = new Types.ObjectId();
    repository.findById.mockResolvedValue({ _id: existing, slug: 'original' } as never);
    repository.updateById.mockResolvedValue({ _id: existing } as never);
    const service = makeService(repository);

    await expect(
      service.update(existing.toString(), { honorific: { ar: 'د.', en: 'Dr.' } } as never),
    ).resolves.toBeDefined();
  });

  it('leaves showPublicContact off unless the admin turns it on', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    repository.create.mockResolvedValue({} as never);
    const service = makeService(repository);

    await service.create({
      slug: 'free',
      fullName: { ar: 'أ', en: 'A' },
      nationalityId: new Types.ObjectId().toString(),
    } as never);

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ showPublicContact: false }));
  });

  it('lets a slug freed by archiving be taken again', async () => {
    const repository = makeRepository();
    // findOne scopes to live rows, so an archived holder reads as absent.
    repository.findOne.mockResolvedValue(null as never);
    repository.create.mockResolvedValue({} as never);
    const service = makeService(repository);

    await expect(
      service.create({
        slug: 'recycled',
        fullName: { ar: 'أ', en: 'A' },
        nationalityId: new Types.ObjectId().toString(),
      } as never),
    ).resolves.toBeDefined();
  });
});
