import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SponsorsService } from './sponsors.service.js';
import { SponsorsRepository } from './sponsors.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import type { SponsorDocument } from './schemas/sponsor.schema.js';

/**
 * The sponsor is the organisation; the sponsorship is the contract (ADR-0077
 * D1). What this suite protects: a name the organisation writes in one
 * language is enough, and the `restricted` sub-document — contact, contract
 * value, contract document — never leaves the server in a public shape.
 */
describe('SponsorsService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(async (data: unknown) => ({ _id: new Types.ObjectId(), ...(data as object) })),
      find: jest.fn(async () => []),
      findById: jest.fn(),
      findByIds: jest.fn(async () => []),
      updateById: jest.fn(async () => ({})),
    }) as unknown as jest.Mocked<SponsorsRepository>;

  const makeMedia = () =>
    ({
      assertUsableImage: jest.fn(async () => undefined),
      resolvePublicImages: jest.fn(async () => new Map()),
    }) as unknown as jest.Mocked<MediaAssetsService>;

  const ready = () => {
    const repository = makeRepository();
    const media = makeMedia();
    return { repository, media, service: new SponsorsService(repository, media) };
  };

  const logoId = new Types.ObjectId().toString();

  it('stores an English-only name with the Arabic side null', async () => {
    const { repository, service } = ready();

    await service.create({ name: { en: 'Ultimate Power Solution' }, logoId });

    expect((repository.create.mock.calls[0][0] as { name: unknown }).name).toEqual({
      ar: null,
      en: 'Ultimate Power Solution',
    });
  });

  it('refuses a sponsor with no name on either side, naming the field', async () => {
    const { service } = ready();

    await expect(service.create({ name: { ar: ' ', en: '' }, logoId })).rejects.toMatchObject({
      response: { code: 'missingRequiredField', field: 'name' },
    });
  });

  it('requires a logo, as the specification does, and checks it is a usable image', async () => {
    const { repository, media, service } = ready();

    await service.create({ name: { en: 'Elite Co' }, logoId });
    expect(media.assertUsableImage).toHaveBeenCalledWith(logoId);
    expect((repository.create.mock.calls[0][0] as { logoId: Types.ObjectId }).logoId.toString()).toBe(logoId);

    await expect(service.create({ name: { en: 'No Logo Co' } } as never)).rejects.toMatchObject({
      response: { code: 'missingRequiredField', field: 'logoId' },
    });
  });

  it('refuses an update that clears the logo', async () => {
    const { repository, service } = ready();
    repository.findById.mockResolvedValue({ _id: new Types.ObjectId() } as never);

    await expect(service.update('any', { logoId: null } as never)).rejects.toMatchObject({
      response: { code: 'missingRequiredField', field: 'logoId' },
    });
  });

  it('accepts an http or https website and refuses any other scheme', async () => {
    const { service } = ready();

    await expect(service.create({ name: { en: 'A' }, logoId, website: 'https://upsgenerator.com/' })).resolves.toBeDefined();
    await expect(service.create({ name: { en: 'A' }, logoId, website: 'javascript:alert(1)' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('never writes isDemo from a request: a demo mark is the seed\'s alone', async () => {
    const { repository, service } = ready();

    await service.create({ name: { en: 'A' }, logoId, isDemo: true } as never);

    expect((repository.create.mock.calls[0][0] as { isDemo: unknown }).isDemo).toBe(false);
  });

  it('projects a sponsor for the public without its restricted sub-document', async () => {
    const { media, service } = ready();
    const logoId = new Types.ObjectId();
    media.resolvePublicImages.mockResolvedValue(
      new Map([[logoId.toString(), { url: 'https://cdn/logo.png', altText: { ar: 'شعار', en: 'Logo' }, width: 284, height: 284 }]]),
    );
    const sponsor = {
      _id: new Types.ObjectId(),
      name: { ar: null, en: 'Ultimate Power Solution' },
      logoId,
      website: 'https://upsgenerator.com/',
      categoryLabel: null,
      restricted: { contactEmail: 'x@y.z', contactPhone: '+971', contractValue: 1000, contractDocId: null },
      isDemo: false,
    } as unknown as SponsorDocument;

    const [projected] = await service.toPublicResponses([sponsor]);

    expect(projected).toEqual({
      id: sponsor._id.toString(),
      name: { ar: null, en: 'Ultimate Power Solution' },
      logo: { url: 'https://cdn/logo.png', altText: { ar: 'شعار', en: 'Logo' }, width: 284, height: 284 },
      website: 'https://upsgenerator.com/',
      categoryLabel: null,
    });
    expect(JSON.stringify(projected)).not.toContain('x@y.z');
    expect(JSON.stringify(projected)).not.toContain('restricted');
  });
});
