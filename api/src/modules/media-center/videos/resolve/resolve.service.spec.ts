import { jest } from '@jest/globals';
import { resolveVideo } from './resolve.service.js';
import { VIDEO_TITLE_MAX_LENGTH } from '../schemas/video.schema.js';

/**
 * What the editor gets back from pasting a link.
 *
 * Three outcomes, and the third is the one worth designing for: a supported
 * platform whose oEmbed we cannot call. Instagram and Facebook require a Meta
 * app token, which this deployment may not have, and an editor meeting that
 * should be asked for a title — not shown an error about a token they cannot
 * obtain. So an unresolvable-but-supported link is a `fallback`, and the
 * drawer treats it as a form to fill rather than a failure.
 */
const jsonResponse = (body: unknown) =>
  ({
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const mockFetch = () => {
  const fetchMock = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  return fetchMock;
};

const ORIGINAL_TOKEN = process.env.META_OEMBED_TOKEN;

afterEach(() => {
  jest.restoreAllMocks();
  if (ORIGINAL_TOKEN === undefined) delete process.env.META_OEMBED_TOKEN;
  else process.env.META_OEMBED_TOKEN = ORIGINAL_TOKEN;
});

describe('resolveVideo', () => {
  it('refuses a link no platform claims', async () => {
    const fetchMock = mockFetch();

    await expect(resolveVideo('https://evil.test/watch?v=a')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves a YouTube link through the public oEmbed endpoint', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ title: '100m final', thumbnail_url: 'https://i.ytimg.com/vi/abc/hq.jpg', width: 480, height: 270 }),
    );

    await expect(resolveVideo('https://www.youtube.com/watch?v=abc')).resolves.toEqual({
      platform: 'youtube',
      externalId: 'abc',
      kind: 'video',
      title: '100m final',
      thumbnailUrl: 'https://i.ytimg.com/vi/abc/hq.jpg',
    });
  });

  it('hands back a fallback when Instagram has no token to call with', async () => {
    delete process.env.META_OEMBED_TOKEN;
    const fetchMock = mockFetch();

    await expect(resolveVideo('https://www.instagram.com/reel/XYZ/')).resolves.toEqual({
      fallback: true,
      platform: 'instagram',
      externalId: 'XYZ',
      kind: 'reel',
    });
    // Nothing is called: there is no endpoint to call without a token, and a
    // request that is certain to be refused is one the editor waits for.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hands back a fallback when the platform answers badly', async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ nothing: 'useful' }));

    await expect(resolveVideo('https://www.youtube.com/watch?v=abc')).resolves.toEqual({
      fallback: true,
      platform: 'youtube',
      externalId: 'abc',
      kind: 'video',
    });
  });

  it('corrects the shape from the reply when the URL was ambiguous', async () => {
    // A TikTok URL says "reel" by its path. A YouTube /watch URL says nothing,
    // so a portrait oEmbed is how a Short posted as /watch is recognised.
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ title: 'vertical', thumbnail_url: 'https://i.ytimg.com/vi/abc/hq.jpg', width: 405, height: 720 }),
    );

    const resolved = (await resolveVideo('https://www.youtube.com/watch?v=abc')) as { kind: string };

    expect(resolved.kind).toBe('reel');
  });

  it('trims a remote title to the cap rather than refusing the whole video', async () => {
    // Refusing here would mean a long-titled video cannot be added at all,
    // which punishes the editor for the platform's verbosity. Trimming keeps
    // the link usable and leaves the title editable in the drawer.
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ title: 'x'.repeat(VIDEO_TITLE_MAX_LENGTH + 50) }));

    const resolved = (await resolveVideo('https://www.youtube.com/watch?v=abc')) as { title: string };

    expect(resolved.title).toHaveLength(VIDEO_TITLE_MAX_LENGTH);
  });

  it('drops a thumbnail URL the platform chose but the CDN rule refuses', async () => {
    // The SSRF guard for this value lived only inside `fetchThumbnailBytes`.
    // The editor's drawer renders it as an <img src> preview, so an unvalidated
    // value makes the EDITOR'S browser fetch an attacker-chosen URL from inside
    // the federation's network. The guarantee has to travel with the value.
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ title: 'ok', thumbnail_url: 'http://169.254.169.254/latest/meta-data/' }),
    );

    const resolved = (await resolveVideo('https://www.youtube.com/watch?v=abc')) as {
      title: string;
      thumbnailUrl: string | null;
    };

    // The video still resolves — only the picture is dropped.
    expect(resolved.title).toBe('ok');
    expect(resolved.thumbnailUrl).toBeNull();
  });

  it('asks the platform about the URL the editor actually pasted', async () => {
    // The canonical URL was rebuilt from parts, which invented '@uaeaf' into
    // every TikTok link and rewrote Facebook /videos/<id> as /watch/?v=<id>.
    // If either endpoint validates the handle or the path, every such link
    // degrades to a fallback and the editor never learns why.
    const pasted = 'https://www.tiktok.com/@someone_else/video/7300';
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValue(jsonResponse({ title: 'clip' }));

    await resolveVideo(pasted);

    const [endpoint] = fetchMock.mock.calls[0] as [string];
    expect(decodeURIComponent(endpoint)).toContain(pasted);
  });

  it('resolves a short TikTok link by following it first', async () => {
    const fetchMock = mockFetch();
    fetchMock
      .mockResolvedValueOnce({
        status: 302,
        headers: new Headers({ location: 'https://www.tiktok.com/@uaeaf/video/7300' }),
        text: async () => '',
      } as unknown as Response)
      .mockResolvedValueOnce(jsonResponse({ title: 'clip', thumbnail_url: 'https://p16.tiktokcdn.com/x.jpg' }));

    await expect(resolveVideo('https://vm.tiktok.com/ZMabc/')).resolves.toEqual({
      platform: 'tiktok',
      externalId: '7300',
      kind: 'reel',
      title: 'clip',
      thumbnailUrl: 'https://p16.tiktokcdn.com/x.jpg',
    });
  });
});
