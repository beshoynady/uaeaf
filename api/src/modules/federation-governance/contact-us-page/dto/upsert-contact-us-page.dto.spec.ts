import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertContactUsPageDto } from './upsert-contact-us-page.dto.js';

/**
 * A social link may carry its own icon (owner request 2026-09-21): an optional
 * reference to an uploaded image, used instead of the platform's built-in
 * artwork. Checked through the same `class-validator` pipeline the global
 * `ValidationPipe` runs, with its `forbidNonWhitelisted` setting — without a
 * decorator on the field, every save that sent an icon would be refused.
 */
const linkErrors = async (socialLinks: unknown[]) => {
  const errors = await validate(plainToInstance(UpsertContactUsPageDto, { socialLinks }), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.filter((error) => error.property === 'socialLinks');
};

const link = (extra: Record<string, unknown> = {}) => ({
  platform: 'Instagram',
  url: 'https://www.instagram.com/uaeaf',
  ...extra,
});

describe('UpsertContactUsPageDto — social links', () => {
  it('accepts a link with no icon, as every saved link has today', async () => {
    expect(await linkErrors([link()])).toHaveLength(0);
  });

  it('accepts a link whose icon names an uploaded image', async () => {
    expect(await linkErrors([link({ iconId: '6aa1d5c24a3f231870e29d89' })])).toHaveLength(0);
  });

  it('accepts an icon cleared back to nothing', async () => {
    expect(await linkErrors([link({ iconId: null })])).toHaveLength(0);
  });

  it('refuses an icon that is not an id', async () => {
    expect(await linkErrors([link({ iconId: 'https://example.test/icon.png' })])).not.toHaveLength(0);
  });
});

/**
 * The map is a live map drawn at the page's own coordinates (owner request
 * 2026-09-22), and the still picture it replaced is no longer a field.
 */
describe('UpsertContactUsPageDto — the map', () => {
  const mapErrors = async (map: Record<string, unknown>) => {
    const errors = await validate(plainToInstance(UpsertContactUsPageDto, { map }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return errors.filter((error) => error.property === 'map');
  };

  it('accepts the federation\'s coordinates', async () => {
    expect(await mapErrors({ latitude: 25.286069, longitude: 55.3642228 })).toHaveLength(0);
  });

  it('refuses a latitude or a longitude outside the globe', async () => {
    expect(await mapErrors({ latitude: 91, longitude: 55.3642228 })).not.toHaveLength(0);
    expect(await mapErrors({ latitude: 25.286069, longitude: 181 })).not.toHaveLength(0);
  });

  it('refuses a coordinate sent as text', async () => {
    expect(await mapErrors({ latitude: '25.286069', longitude: 55.3642228 })).not.toHaveLength(0);
  });

  it('refuses the map picture it no longer has', async () => {
    expect(await mapErrors({ imageId: '6aa1d5c24a3f231870e29d89' })).not.toHaveLength(0);
  });
});
