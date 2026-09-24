import { jest } from '@jest/globals';
import { MAX_OEMBED_BYTES, fetchOembed, followShortLink } from './oembed-client.js';

/**
 * Everything this module does is talk to a machine we do not control, so every
 * test here is about a reply behaving badly rather than a reply being wrong.
 *
 * A remote endpoint can be slow forever, can answer HTML where JSON was asked
 * for, can stream until memory runs out, and can redirect somewhere it should
 * not. None of those is exotic; all four are what a compromised or merely
 * broken third party looks like from here. The contract is the same for all of
 * them: return `null`, never throw, never read without a bound.
 */
const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2Fabc&format=json';

const jsonResponse = (body: unknown, init: { status?: number } = {}) =>
  ({
    status: init.status ?? 200,
    headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const textResponse = (body: string, contentType: string) =>
  ({
    status: 200,
    headers: new Headers({ 'content-type': contentType }),
    text: async () => body,
  }) as unknown as Response;

const redirectResponse = (location: string) =>
  ({
    status: 302,
    headers: new Headers({ location }),
    text: async () => '',
  }) as unknown as Response;

const mockFetch = () => {
  const fetchMock = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  return fetchMock;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchOembed', () => {
  it('reads a well-formed reply', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ title: '100m final', thumbnail_url: 'https://i.ytimg.com/vi/abc/hq.jpg', width: 480, height: 270 }),
    );

    await expect(fetchOembed(YOUTUBE_OEMBED)).resolves.toEqual({
      title: '100m final',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc/hq.jpg',
      width: 480,
      height: 270,
    });
  });

  it('gives up when the endpoint answers HTML instead of JSON', async () => {
    // A platform that is rate-limiting or erroring usually answers with its
    // own error page, at status 200, and JSON.parse on that throws.
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(textResponse('<html>Too many requests</html>', 'text/html'));

    await expect(fetchOembed(YOUTUBE_OEMBED)).resolves.toBeNull();
  });

  it('refuses on the declared length, before a byte of the body is read', async () => {
    // The previous version of this test handed the mock an already-materialised
    // string and asserted on a length check that ran AFTER the whole body was
    // in memory. It would have passed against an implementation that buffered
    // 10GB, which is exactly what it was named to rule out.
    let bodyRead = false;
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue({
      status: 200,
      headers: new Headers({
        'content-type': 'application/json',
        'content-length': String(MAX_OEMBED_BYTES + 1),
      }),
      text: async () => {
        bodyRead = true;
        return '{}';
      },
    } as unknown as Response);

    await expect(fetchOembed(YOUTUBE_OEMBED)).resolves.toBeNull();
    expect(bodyRead).toBe(false);
  });

  it('caps on BYTES, not on string length', async () => {
    // A body of 3-byte UTF-8 characters reaches ~768KB at a 256K "cap" if the
    // check counts UTF-16 code units, which is what `String.length` returns.
    const threeByteChar = '\u0639'; // Arabic ain
    const body = threeByteChar.repeat(MAX_OEMBED_BYTES - 10);
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(textResponse(body, 'application/json'));

    await expect(fetchOembed(YOUTUBE_OEMBED)).resolves.toBeNull();
  });

  it('gives up when the remote never answers', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'TimeoutError' }));

    await expect(fetchOembed(YOUTUBE_OEMBED)).resolves.toBeNull();
  });

  it('asks for a bounded, non-following request', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ title: 't' }));

    await fetchOembed(YOUTUBE_OEMBED);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.redirect).toBe('manual');
    expect(init.signal).toBeDefined();
  });

  it('does not follow a redirect off the endpoint', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(redirectResponse('http://169.254.169.254/latest/meta-data/'));

    await expect(fetchOembed(YOUTUBE_OEMBED)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats a reply with no title as unusable', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ thumbnail_url: 'https://i.ytimg.com/vi/abc/hq.jpg' }));

    await expect(fetchOembed(YOUTUBE_OEMBED)).resolves.toBeNull();
  });
});

describe('followShortLink', () => {
  it('follows a short link to the canonical URL it names', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(redirectResponse('https://www.tiktok.com/@uaeaf/video/7300'));

    await expect(followShortLink('https://vm.tiktok.com/ZMabc/')).resolves.toEqual({
      platform: 'tiktok',
      externalId: '7300',
      kind: 'reel',
    });
  });

  it('refuses a redirect that leaves the allowlist, without following it', async () => {
    // The whole point: each hop is checked BEFORE a socket is opened to it.
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(redirectResponse('http://169.254.169.254/latest/meta-data/'));

    await expect(followShortLink('https://vm.tiktok.com/ZMabc/')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up rather than following a redirect loop forever', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(redirectResponse('https://vm.tiktok.com/ZMabc/'));

    await expect(followShortLink('https://vm.tiktok.com/ZMabc/')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('refuses to start from a URL that is not an allowed short link', async () => {
    const fetchMock = mockFetch();

    await expect(followShortLink('https://evil.test/ZMabc/')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
