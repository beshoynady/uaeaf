import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { ContactUsPagesService } from './contact-us-page.service.js';
import { ContactUsPagesRepository } from './contact-us-page.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import type { UpsertContactUsPageDto } from './dto/upsert-contact-us-page.dto.js';

/**
 * The page carries three groups the contact form and map render from —
 * `cardLabels`, `form` and `map`. They are asserted here because the singleton
 * upsert writes a whole document every time: a field the service forgets to
 * copy is silently erased on the editor's next save, and nothing else in the
 * stack would notice.
 */
describe('ContactUsPagesService', () => {
  const makeRepository = () =>
    ({
      findOne: jest.fn(),
      create: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<ContactUsPagesRepository>;

  const makeMedia = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  const heroImageId = new Types.ObjectId().toString();

  const baseDto = (): UpsertContactUsPageDto =>
    ({
      heroTitle: { ar: 'تواصل معنا', en: 'Contact Us' },
      heroSubtitle: { ar: 'نحن هنا', en: 'We are here' },
      email: 'info@example.test',
    }) as UpsertContactUsPageDto;

  it('persists the location summary shown on the third contact card', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const service = new ContactUsPagesService(repository, makeMedia());

    await service.upsert({
      ...baseDto(),
      locationSummary: { ar: 'أبوظبي، الإمارات', en: 'Abu Dhabi, UAE' },
    } as UpsertContactUsPageDto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        locationSummary: { ar: 'أبوظبي، الإمارات', en: 'Abu Dhabi, UAE' },
      }),
    );
  });

  it('persists the three card labels the page does not already own', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const service = new ContactUsPagesService(repository, makeMedia());

    await service.upsert({
      ...baseDto(),
      cardLabels: {
        email: { ar: 'البريد الإلكتروني', en: 'Email' },
        location: { ar: 'الموقع', en: 'Location' },
        officeHours: { ar: 'ساعات العمل', en: 'Working Hours' },
      },
    } as UpsertContactUsPageDto);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cardLabels: expect.objectContaining({ location: { ar: 'الموقع', en: 'Location' } }),
      }),
    );
  });

  it('persists the form heading, consent note and message-type labels', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const service = new ContactUsPagesService(repository, makeMedia());

    await service.upsert({
      ...baseDto(),
      form: {
        title: { ar: 'أرسل لنا رسالة', en: 'Send Us a Message' },
        consentNote: { ar: 'بإرسال هذا النموذج', en: 'By sending this form' },
        messageTypeLabels: [
          { value: 'Suggestion', label: { ar: 'اقتراح', en: 'Suggestion' } },
          { value: 'Complaint', label: { ar: 'شكوى', en: 'Complaint' } },
        ],
      },
    } as UpsertContactUsPageDto);

    const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
    const form = written.form as { messageTypeLabels: unknown[]; title: unknown };
    expect(form.title).toEqual({ ar: 'أرسل لنا رسالة', en: 'Send Us a Message' });
    expect(form.messageTypeLabels).toHaveLength(2);
  });

  it('persists every map element, the coordinates the live map is drawn at included', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const service = new ContactUsPagesService(repository, makeMedia());

    await service.upsert({
      ...baseDto(),
      map: {
        title: { ar: 'موقعنا', en: 'Our Location' },
        latitude: 25.286069,
        longitude: 55.3642228,
        pinTitle: { ar: 'المقر', en: 'Headquarters' },
        pinSubtitle: { ar: 'دبي', en: 'Dubai' },
        directionsUrl: 'https://example.test/directions',
        note: { ar: 'ملاحظة', en: 'Note' },
      },
    } as UpsertContactUsPageDto);

    const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
    expect(written.map).toEqual({
      title: { ar: 'موقعنا', en: 'Our Location' },
      latitude: 25.286069,
      longitude: 55.3642228,
      pinTitle: { ar: 'المقر', en: 'Headquarters' },
      pinSubtitle: { ar: 'دبي', en: 'Dubai' },
      directionsUrl: 'https://example.test/directions',
      note: { ar: 'ملاحظة', en: 'Note' },
    });
  });

  it('stores no coordinates when the editor gave none', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const service = new ContactUsPagesService(repository, makeMedia());

    await service.upsert({ ...baseDto(), map: { title: { ar: 'موقعنا', en: 'Our Location' } } } as UpsertContactUsPageDto);

    const map = (repository.create.mock.calls[0][0] as unknown as { map: Record<string, unknown> }).map;
    expect(map).toMatchObject({ latitude: null, longitude: null });
  });

  it('checks the hero image only: the map is live and has no picture of its own', async () => {
    // The map still was replaced by the live map (owner request 2026-09-22).
    // A save must not write the field back, or the next save's whole-document
    // upsert would carry a reference nothing reads.
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const media = makeMedia();
    const service = new ContactUsPagesService(repository, media);

    await service.upsert({ ...baseDto(), heroImageId, map: { title: { ar: 'موقعنا', en: 'Our Location' } } } as UpsertContactUsPageDto);

    expect(media.assertUsableImage.mock.calls).toEqual([[heroImageId]]);
    const map = (repository.create.mock.calls[0][0] as unknown as { map: Record<string, unknown> }).map;
    expect(map).not.toHaveProperty('imageId');
  });

  describe('a social link with its own icon', () => {
    const iconId = new Types.ObjectId().toString();

    it('stores the icon as a reference to a usable image', async () => {
      const repository = makeRepository();
      repository.findOne.mockResolvedValue(null as never);
      const media = makeMedia();
      const service = new ContactUsPagesService(repository, media);

      await service.upsert({
        ...baseDto(),
        socialLinks: [{ platform: 'Instagram', url: 'https://www.instagram.com/uaeaf', iconId }],
      } as UpsertContactUsPageDto);

      // Checked like the hero image: an icon that is not an image,
      // or is gone, would leave the public site drawing a broken picture.
      expect(media.assertUsableImage).toHaveBeenCalledWith(iconId);
      const written = repository.create.mock.calls[0][0] as { socialLinks: { iconId: Types.ObjectId }[] };
      expect(written.socialLinks[0].iconId).toBeInstanceOf(Types.ObjectId);
      expect(written.socialLinks[0].iconId.toString()).toBe(iconId);
    });

    it('keeps a link without an icon as it was, with the icon explicitly empty', async () => {
      const repository = makeRepository();
      repository.findOne.mockResolvedValue(null as never);
      const media = makeMedia();
      const service = new ContactUsPagesService(repository, media);

      await service.upsert({
        ...baseDto(),
        socialLinks: [{ platform: 'X', url: 'https://x.com/uaeaf' }],
      } as UpsertContactUsPageDto);

      // Written as null rather than left out: the singleton upsert replaces
      // the whole document, so an icon removed in the editor must not survive.
      const written = repository.create.mock.calls[0][0] as { socialLinks: unknown[] };
      expect(written.socialLinks).toEqual([{ platform: 'X', url: 'https://x.com/uaeaf', iconId: null }]);
      expect(media.assertUsableImage).not.toHaveBeenCalled();
    });

    it('saves nothing when an icon is not a usable image', async () => {
      const repository = makeRepository();
      repository.findOne.mockResolvedValue(null as never);
      const media = makeMedia();
      media.assertUsableImage.mockRejectedValue(new Error('not an image') as never);
      const service = new ContactUsPagesService(repository, media);

      await expect(
        service.upsert({
          ...baseDto(),
          socialLinks: [{ platform: 'Instagram', url: 'https://www.instagram.com/uaeaf', iconId }],
        } as UpsertContactUsPageDto),
      ).rejects.toThrow('not an image');
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  it('writes explicit empty values when a group is absent, so a save cannot leave stale content', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const service = new ContactUsPagesService(repository, makeMedia());

    await service.upsert(baseDto());

    const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
    expect(written.locationSummary).toBeNull();
    expect(written.cardLabels).toBeNull();
    expect(written.map).toBeNull();
    expect(written.form).toEqual({ title: null, consentNote: null, messageTypeLabels: [] });
  });
});
