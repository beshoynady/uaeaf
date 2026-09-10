import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { probeImage } from './image-probe.js';

/**
 * Reading a picture's real type and size from its own bytes.
 *
 * The upload path has to reject a file *before* it is sent anywhere: an
 * oversized or mislabelled image that fails only at the far end has already
 * cost the bandwidth and, on a metered plan, the quota. The check therefore
 * cannot trust `Express.Multer.File.mimetype`, which is the browser's claim
 * about the file, not a fact about it — renaming `payload.svg` to `.png`
 * changes that header and nothing else.
 *
 * Every format below is parsed from its own header rather than through an
 * image library. The three the platform accepts have short, stable headers,
 * and a decoder that never decodes pixel data cannot be attacked through
 * one.
 */

const DESIGN_ASSETS = join(
  process.cwd(),
  '..',
  'apps',
  'web',
  'public',
  'design-assets',
  'contact',
);

/** A minimal but structurally valid JPEG: SOI, an APP0/JFIF segment, then a
 *  baseline SOF0 frame header carrying the dimensions. Hand-built rather
 *  than committed as a fixture so the bytes under test are visible here. */
function jpegOf(width: number, height: number): Buffer {
  const sof = Buffer.alloc(20);
  sof.writeUInt16BE(0xffd8, 0); // SOI
  sof.writeUInt16BE(0xffe0, 2); // APP0
  sof.writeUInt16BE(7, 4); // APP0 length
  sof.write('JFIF\0', 6, 'latin1');
  sof.writeUInt16BE(0xffc0, 11); // SOF0
  sof.writeUInt16BE(11, 13); // SOF0 length
  sof.writeUInt8(8, 15); // sample precision
  sof.writeUInt16BE(height, 16);
  sof.writeUInt16BE(width, 18);
  return sof;
}

/** A minimal lossy WebP: the RIFF envelope plus a VP8 bitstream header,
 *  whose 14-bit width and height sit after the 3-byte start code. */
function webpOf(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'latin1');
  buffer.writeUInt32LE(22, 4); // file size - 8
  buffer.write('WEBP', 8, 'latin1');
  buffer.write('VP8 ', 12, 'latin1');
  buffer.writeUInt32LE(10, 16); // chunk size
  buffer.writeUInt8(0x9d, 23);
  buffer.writeUInt8(0x01, 24);
  buffer.writeUInt8(0x2a, 25);
  buffer.writeUInt16LE(width, 26);
  buffer.writeUInt16LE(height, 28);
  return buffer;
}

describe('probeImage', () => {
  it('reads a real PNG the design handed us', () => {
    const bytes = readFileSync(join(DESIGN_ASSETS, 'contact-hero-2616-1382.png'));
    expect(probeImage(bytes)).toEqual({ mimeType: 'image/png', width: 1536, height: 672 });
  });

  it('reads the second real PNG, so the first is not a coincidence', () => {
    const bytes = readFileSync(join(DESIGN_ASSETS, 'contact-map-2616-1382.png'));
    expect(probeImage(bytes)).toEqual({ mimeType: 'image/png', width: 1248, height: 832 });
  });

  it('reads a baseline JPEG frame header', () => {
    expect(probeImage(jpegOf(800, 600))).toEqual({
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
    });
  });

  it('reads a lossy WebP bitstream header', () => {
    expect(probeImage(webpOf(1024, 768))).toEqual({
      mimeType: 'image/webp',
      width: 1024,
      height: 768,
    });
  });

  it('refuses an SVG, however it was named', () => {
    // The reason this function exists. SVG is a script-bearing document, and
    // the browser-supplied mimetype is the attacker's to choose.
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    expect(probeImage(svg)).toBeNull();
  });

  it('refuses a PNG signature with no readable header behind it', () => {
    // A truncated upload must not be read as a 0x0 image; every consumer of
    // the result treats the dimensions as trustworthy.
    expect(probeImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull();
  });

  it('refuses an empty buffer', () => {
    expect(probeImage(Buffer.alloc(0))).toBeNull();
  });

  it('refuses a PNG whose header declares a zero dimension', () => {
    const bytes = readFileSync(join(DESIGN_ASSETS, 'contact-map-2616-1382.png'));
    const broken = Buffer.from(bytes);
    broken.writeUInt32BE(0, 20); // IHDR height
    expect(probeImage(broken)).toBeNull();
  });
});
