import { jest } from '@jest/globals';
import { isAllowedThumbnailHost, fetchThumbnailBytes } from './thumbnail.service.js';

/**
 * Review Focus 6 — the thumbnail URL is a second, independent untrusted input.
 *
 * `url-allowlist.ts` guards the link the *editor* typed. This URL was chosen
 * by the *remote oEmbed service*, so a compromised or merely hostile platform
 * reply can point `thumbnail_url` at `http://169.254.169.254/` and the server
 * will fetch it — from inside the network, with no human involved.
 *
 * The host rule here differs from the one in `url-allowlist.ts` on purpose.
 * CDNs mint unpredictable subdomains (`scontent-lhr8-1.cdninstagram.com`), so
 * exact matching is impossible and this matches by **suffix on the registered
 * domain**. A suffix match is only safe when it is dot-anchored and anchored
 * to the end, which is exactly what the refusals below pin: without the dot,
 * `evil-cdninstagram.com` passes; without the end anchor,
 * `cdninstagram.com.evil.test` does.
 */
const mockFetch = () => {
  const fetchMock = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  return fetchMock;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('isAllowedThumbnailHost', () => {
  it.each([
    'i.ytimg.com',
    'i9.ytimg.com',
    'ytimg.com',
    'pbs.twimg.com',
    'scontent-lhr8-1.cdninstagram.com',
    'scontent.cdninstagram.com',
    'p16-sign-va.tiktokcdn.com',
    'scontent.xx.fbcdn.net',
  ])('accepts the CDN host %s', (host) => {
    expect(isAllowedThumbnailHost(host)).toBe(true);
  });

  it.each([
    // Without a dot anchor, this passes a naive `endsWith`.
    'evil-cdninstagram.com',
    'notytimg.com',
    // Without an end anchor, this passes a naive `includes`.
    'cdninstagram.com.evil.test',
    'ytimg.com.attacker.test',
    // The addresses this guard exists for.
    'localhost',
    '127.0.0.1',
    '169.254.169.254',
    '10.0.0.5',
    '172.16.0.1',
    '192.168.1.1',
    '[::1]',
    'evil.test',
    '',
    // '.ytimg.com'.endsWith('.ytimg.com') is true, and new URL parses it
    // happily. Unreachable in practice — an empty DNS label resolves nowhere
    // and nobody can register it — but the module's comment claims the suffix
    // rule is anchored in both directions, and this is the case where it is
    // not.
    '.ytimg.com',
    '.cdninstagram.com',
  ])('refuses %s', (host) => {
    expect(isAllowedThumbnailHost(host)).toBe(false);
  });
});

describe('fetchThumbnailBytes', () => {
  const imageResponse = (bytes: number, contentType = 'image/jpeg') =>
    ({
      status: 200,
      headers: new Headers({ 'content-type': contentType }),
      arrayBuffer: async () => new ArrayBuffer(bytes),
    }) as unknown as Response;

  it('fetches a thumbnail on an allowed CDN', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(imageResponse(2048));

    const result = await fetchThumbnailBytes('https://i.ytimg.com/vi/abc/hq.jpg');

    expect(result).not.toBeNull();
    expect(result!.buffer.byteLength).toBe(2048);
    expect(result!.mimeType).toBe('image/jpeg');
  });

  it('refuses a host off the list without opening a socket to it', async () => {
    // The assertion that matters is the second one: refusing after the fetch
    // would already have made the request this guard exists to prevent.
    const fetchMock = mockFetch();

    await expect(fetchThumbnailBytes('https://evil.test/x.jpg')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses an internal address without opening a socket to it', async () => {
    const fetchMock = mockFetch();

    await expect(fetchThumbnailBytes('http://169.254.169.254/latest/meta-data/')).resolves.toBeNull();
    await expect(fetchThumbnailBytes('https://127.0.0.1/x.jpg')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    // The host here is 127.0.0.1 — refused by the host rule alone.
    'https://i.ytimg.com@127.0.0.1/x.jpg',
    // …and these carry credentials on a host that IS allowed, which is the
    // only shape that isolates the userinfo guard from the host rule.
    'https://user:pass@i.ytimg.com/x.jpg',
    'https://user@scontent.cdninstagram.com/x.jpg',
  ])('refuses %s without opening a socket', async (url) => {
    const fetchMock = mockFetch();

    await expect(fetchThumbnailBytes(url)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not follow a redirect, wherever it points', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      status: 302,
      headers: new Headers({ location: 'http://169.254.169.254/' }),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response);

    await expect(fetchThumbnailBytes('https://i.ytimg.com/vi/abc/hq.jpg')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['text/html', 'application/json', 'image/svg+xml', 'image/gif', ''])(
    'refuses a reply typed %s',
    async (contentType) => {
      // 'image/svg+xml' is the one that matters: it starts with 'image/' and
      // would pass a prefix check, but an SVG is a script-bearing document and
      // `upload-constraints.ts` excludes it by explicit decision. Stored on
      // this platform's own origin it would be served same-origin.
      const fetchMock = mockFetch();
      fetchMock.mockResolvedValue(imageResponse(2048, contentType));

      await expect(fetchThumbnailBytes('https://i.ytimg.com/vi/abc/hq.jpg')).resolves.toBeNull();
    },
  );

  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts a reply typed %s', async (contentType) => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(imageResponse(2048, contentType));

    await expect(fetchThumbnailBytes('https://i.ytimg.com/vi/abc/hq.jpg')).resolves.not.toBeNull();
  });

  it('refuses a body past the upload ceiling', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(imageResponse(11 * 1024 * 1024));

    await expect(fetchThumbnailBytes('https://i.ytimg.com/vi/abc/hq.jpg')).resolves.toBeNull();
  });

  it('answers null rather than throwing when the CDN is unreachable', async () => {
    // A thumbnail is the one part of a video that can be missing without the
    // row being useless, so a failure here must never block the save.
    const fetchMock = mockFetch();
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));

    await expect(fetchThumbnailBytes('https://i.ytimg.com/vi/abc/hq.jpg')).resolves.toBeNull();
  });
});
