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
  const mapImageId = new Types.ObjectId().toString();

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

  it('persists every map element, including the placeholder image and the pin', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const media = makeMedia();
    const service = new ContactUsPagesService(repository, media);

    await service.upsert({
      ...baseDto(),
      map: {
        title: { ar: 'موقعنا', en: 'Our Location' },
        imageId: mapImageId,
        pinTitle: { ar: 'المقر', en: 'Headquarters' },
        pinSubtitle: { ar: 'أبوظبي', en: 'Abu Dhabi' },
        directionsUrl: 'https://example.test/directions',
        note: { ar: 'ملاحظة', en: 'Note' },
      },
    } as UpsertContactUsPageDto);

    const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
    const map = written.map as { imageId: Types.ObjectId; directionsUrl: string };
    expect(map.imageId).toBeInstanceOf(Types.ObjectId);
    expect(map.imageId.toString()).toBe(mapImageId);
    expect(map.directionsUrl).toBe('https://example.test/directions');
  });

  it('checks the map image is a usable image, not only the hero image', async () => {
    const repository = makeRepository();
    repository.findOne.mockResolvedValue(null as never);
    const media = makeMedia();
    const service = new ContactUsPagesService(repository, media);

    await service.upsert({
      ...baseDto(),
      heroImageId,
      map: { imageId: mapImageId },
    } as UpsertContactUsPageDto);

    expect(media.assertUsableImage).toHaveBeenCalledWith(heroImageId);
    expect(media.assertUsableImage).toHaveBeenCalledWith(mapImageId);
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
