/** What an image's own bytes say it is. */
export interface ProbedImage {
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Reads type and dimensions from an image's header, trusting nothing the
 * client said about the file.
 *
 * The upload path needs this before it sends anything to storage: a file
 * rejected only at the far end has already spent the bandwidth, and on a
 * metered plan the quota. `Express.Multer.File.mimetype` cannot answer the
 * question — it is the browser's claim, derived from the extension, and an
 * SVG renamed to `.png` reports `image/png` with a straight face.
 *
 * Only the three formats the platform accepts are parsed, and only their
 * headers. Nothing here decodes pixel data, so a malformed body cannot do
 * more than fail to parse. Anything not recognised returns `null`, which the
 * caller turns into a refusal — the default is reject, never "assume it is
 * fine".
 */
export function probeImage(bytes: Buffer): ProbedImage | null {
  return png(bytes) ?? jpeg(bytes) ?? webp(bytes);
}

/** A dimension of zero means a truncated or corrupt header, not a real
 *  picture. Every caller treats these numbers as trustworthy, so a header
 *  that cannot supply real ones supplies none. */
function sized(mimeType: string, width: number, height: number): ProbedImage | null {
  return width > 0 && height > 0 ? { mimeType, width, height } : null;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Signature, then the IHDR chunk that the format requires to come first:
 *  4-byte length, the tag, then width and height. */
function png(bytes: Buffer): ProbedImage | null {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (bytes.toString('latin1', 12, 16) !== 'IHDR') return null;
  return sized('image/png', bytes.readUInt32BE(16), bytes.readUInt32BE(20));
}

/** The frame-header markers that carry dimensions. Baseline, extended and
 *  progressive, minus the four that are restart or arithmetic-coding
 *  markers rather than frames. */
const JPEG_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/** Walks the segment chain from SOI to the first frame header. The
 *  dimensions are not at a fixed offset — the number and size of the
 *  segments before the frame vary with the encoder — so the chain has to be
 *  followed rather than indexed into. */
function jpeg(bytes: Buffer): ProbedImage | null {
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // Padding between segments is legal and encodes nothing.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (JPEG_FRAME_MARKERS.has(marker)) {
      if (offset + 9 > bytes.length) return null;
      return sized('image/jpeg', bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5));
    }
    // Start of scan: entropy-coded data follows, not another segment, and a
    // frame header can no longer appear ahead of it.
    if (marker === 0xda) return null;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

/** RIFF envelope, then whichever of the three bitstream chunks the encoder
 *  wrote. Each keeps its dimensions in a different place, so all three are
 *  read separately rather than through one offset that happens to work for
 *  the common case. */
function webp(bytes: Buffer): ProbedImage | null {
  if (bytes.length < 30) return null;
  if (bytes.toString('latin1', 0, 4) !== 'RIFF') return null;
  if (bytes.toString('latin1', 8, 12) !== 'WEBP') return null;

  const chunk = bytes.toString('latin1', 12, 16);

  if (chunk === 'VP8 ') {
    // Lossy: a 3-byte frame tag, the fixed start code, then two 14-bit
    // dimensions whose top two bits are the scaling factor, not size.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return sized('image/webp', bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff);
  }

  if (chunk === 'VP8L') {
    // Lossless: 14 bits of width then 14 of height, packed across four
    // bytes after the signature byte, each stored one less than its value.
    if (bytes[20] !== 0x2f) return null;
    const packed = bytes.readUInt32LE(21);
    return sized('image/webp', (packed & 0x3fff) + 1, ((packed >> 14) & 0x3fff) + 1);
  }

  if (chunk === 'VP8X') {
    // Extended: canvas size as two 24-bit little-endian values, each also
    // stored one less than its value.
    const width = bytes.readUIntLE(24, 3) + 1;
    const height = bytes.readUIntLE(27, 3) + 1;
    return sized('image/webp', width, height);
  }

  return null;
}
