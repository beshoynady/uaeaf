import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { storeResolvedThumbnail } from './store-thumbnail.js';

/**
 * A still is a nice-to-have; going on air is not.
 *
 * Every step of this can fail for a reason the editor cannot act on — a
 * platform that answers nothing, an oEmbed reply with no picture, a CDN
 * timeout, a storage provider having a bad minute. This file exists to hold
 * the rule that none of them may reach the caller, because the caller is
 * `start()` and throwing there would take a live broadcast off the air over a
 * missing picture.
 */
const fetchMock = jest.fn<(...args: unknown[]) => Promise<Response>>();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const oembed = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

/** A 1×1 JPEG, so the upload guard sees real image bytes. */
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);

const describe_ = { caption: { ar: 'عنوان', en: 'Title' }, altText: { ar: 'عنوان', en: 'Title' } };

/** Only the shape `storeResolvedThumbnail` actually uses. Typing the mock
 *  against the full service would drag the whole DTO surface in for a call
 *  that reads one field off the file it is handed. */
type Upload = (file: { originalname: string }, ...rest: unknown[]) => Promise<{ _id: Types.ObjectId }>;

describe('storeResolvedThumbnail', () => {
  it('copies the platform\'s still into the library and answers its id', async () => {
    const id = new Types.ObjectId();
    fetchMock
      .mockResolvedValueOnce(oembed({ title: 'Final day', thumbnail_url: 'https://i.ytimg.com/vi/LIVEID/hq.jpg' }))
      .mockResolvedValueOnce(new Response(JPEG, { status: 200, headers: { 'content-type': 'image/jpeg' } }));

    const uploadAndCreate = jest.fn<Upload>().mockResolvedValue({ _id: id });

    const result = await storeResolvedThumbnail(
      'https://www.youtube.com/live/LIVEID',
      { uploadAndCreate } as never,
      describe_,
    );

    expect(result).toBe(id);
    // Named after the video, so the library does not fill with rows called
    // `thumbnail`.
    expect(uploadAndCreate.mock.calls[0][0].originalname).toBe('youtube-LIVEID.jpg');
  });

  it('answers null when the platform names no picture, and does not throw', async () => {
    // Meta's oEmbed needs an app token this deployment may not have, so a
    // fallback answer identifying the video with no still is an ordinary day.
    fetchMock.mockResolvedValueOnce(oembed({ title: 'Final day' }));
    const uploadAndCreate = jest.fn<Upload>();

    await expect(
      storeResolvedThumbnail('https://www.youtube.com/live/LIVEID', { uploadAndCreate } as never, describe_),
    ).resolves.toBeNull();
    expect(uploadAndCreate).not.toHaveBeenCalled();
  });

  it('answers null when the CDN refuses the picture', async () => {
    fetchMock
      .mockResolvedValueOnce(oembed({ title: 'Final day', thumbnail_url: 'https://i.ytimg.com/vi/LIVEID/hq.jpg' }))
      .mockResolvedValueOnce(new Response('nope', { status: 500 }));

    await expect(
      storeResolvedThumbnail('https://www.youtube.com/live/LIVEID', { uploadAndCreate: jest.fn<Upload>() } as never, describe_),
    ).resolves.toBeNull();
  });

  it('answers null when storing the bytes fails, rather than throwing at the caller', async () => {
    // The case that would otherwise take a broadcast off the air: the picture
    // was fetched, and the storage provider refused it.
    fetchMock
      .mockResolvedValueOnce(oembed({ title: 'Final day', thumbnail_url: 'https://i.ytimg.com/vi/LIVEID/hq.jpg' }))
      .mockResolvedValueOnce(new Response(JPEG, { status: 200, headers: { 'content-type': 'image/jpeg' } }));

    const uploadAndCreate = jest.fn<Upload>().mockRejectedValue(new Error('provider down') as never);

    await expect(
      storeResolvedThumbnail('https://www.youtube.com/live/LIVEID', { uploadAndCreate } as never, describe_),
    ).resolves.toBeNull();
  });

  it('answers null for a link no platform in the allowlist serves', async () => {
    await expect(
      storeResolvedThumbnail('https://evil.test/watch?v=a', { uploadAndCreate: jest.fn<Upload>() } as never, describe_),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
