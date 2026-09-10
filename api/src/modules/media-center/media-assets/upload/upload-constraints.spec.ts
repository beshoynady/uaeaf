import { BadRequestException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_PIXELS, MAX_UPLOAD_BYTES, MIN_EDGE, assertUploadable } from './upload-constraints.js';

/**
 * The gate every upload passes before any of its bytes leave this process.
 *
 * The limits are not chosen by taste: they are the provider's own documented
 * ceilings, restated here so a file the provider would refuse is refused
 * locally, with a message naming what was wrong, instead of costing an
 * upload and coming back as someone else's error string.
 */

const DESIGN_ASSETS = join(process.cwd(), '..', 'apps', 'web', 'public', 'design-assets', 'contact');

const hero = readFileSync(join(DESIGN_ASSETS, 'contact-hero-2616-1382.png'));

const file = (overrides: Partial<{ buffer: Buffer; size: number; originalname: string }> = {}) => ({
  buffer: hero,
  size: hero.length,
  originalname: 'contact-hero.png',
  ...overrides,
});

describe('assertUploadable', () => {
  it('accepts the hero the design handed us and reports what it really is', () => {
    expect(assertUploadable(file())).toEqual({
      mimeType: 'image/png',
      width: 1536,
      height: 672,
    });
  });

  it('refuses a file whose bytes are not one of the three accepted formats', () => {
    // Named `.png`, declared `image/png` by the browser, and still not one.
    // This is the whole reason the check reads bytes rather than headers.
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>x()</script></svg>');
    expect(() => assertUploadable(file({ buffer: svg, size: svg.length }))).toThrow(
      UnsupportedMediaTypeException,
    );
  });

  it('refuses a file over the provider ceiling before sending it', () => {
    expect(() => assertUploadable(file({ size: MAX_UPLOAD_BYTES + 1 }))).toThrow(
      PayloadTooLargeException,
    );
  });

  it('accepts a file exactly at the ceiling', () => {
    expect(() => assertUploadable(file({ size: MAX_UPLOAD_BYTES }))).not.toThrow();
  });

  it('refuses an image too small to be a page picture', () => {
    const tiny = Buffer.from(hero);
    tiny.writeUInt32BE(MIN_EDGE - 1, 16); // IHDR width
    expect(() => assertUploadable(file({ buffer: tiny }))).toThrow(BadRequestException);
  });

  it('refuses an image past the provider megapixel ceiling', () => {
    const huge = Buffer.from(hero);
    huge.writeUInt32BE(9000, 16);
    huge.writeUInt32BE(9000, 20);
    expect(9000 * 9000).toBeGreaterThan(MAX_PIXELS);
    expect(() => assertUploadable(file({ buffer: huge }))).toThrow(BadRequestException);
  });

  it('names the offending file in every refusal', () => {
    // An editor uploading a batch needs to know which one was rejected; a
    // bare "invalid image" sends them back through the whole selection.
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(() =>
      assertUploadable(file({ buffer: svg, size: svg.length, originalname: 'logo.svg' })),
    ).toThrow(/logo\.svg/);
  });

  it('refuses an empty upload rather than treating it as a missing optional', () => {
    expect(() => assertUploadable(file({ buffer: Buffer.alloc(0), size: 0 }))).toThrow(
      UnsupportedMediaTypeException,
    );
  });
});
