import { jest } from '@jest/globals';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { CloudinaryStorageProvider, type CloudinaryUploader } from './cloudinary-storage.provider.js';
import { STORAGE_FOLDERS } from './storage-provider.js';

/**
 * The provider's own logic, with the network standing in as a fake.
 *
 * What is worth testing here is not that Cloudinary works — it is what this
 * class does with what Cloudinary returns: which fields become the record,
 * what happens when the call fails, and what happens when a destroy targets
 * something already gone. Those are the paths that decide whether a record
 * can describe an object that is not there.
 */

const RESULT = {
  secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/uaeaf/pages/hero_ab12.png',
  public_id: 'uaeaf/pages/hero_ab12',
  width: 1536,
  height: 672,
  bytes: 1_639_225,
  format: 'png',
};

function fake(overrides: Partial<CloudinaryUploader> = {}): CloudinaryUploader {
  return {
    upload_stream: jest.fn(),
    upload: jest.fn().mockResolvedValue(RESULT),
    destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    ...overrides,
  } as CloudinaryUploader;
}

const request = {
  buffer: Buffer.from([1, 2, 3]),
  folder: STORAGE_FOLDERS.pages,
  originalName: 'contact hero.PNG',
};

describe('CloudinaryStorageProvider', () => {
  /** The provider's message is the only diagnosis a failed upload leaves
   *  behind, so the failure paths assert that it was written rather than
   *  letting it print into the test output. */
  let logged: jest.SpiedFunction<typeof Logger.prototype.error>;

  beforeEach(() => {
    logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logged.mockRestore();
  });

  it('returns the provider’s own measurements, not the caller’s claims', async () => {
    // The record must describe the stored object. A provider may normalise
    // on ingest, and a row that disagrees with the file is worse than none.
    const uploader = fake();
    const stored = await new CloudinaryStorageProvider(uploader).upload(request);

    expect(stored).toEqual({
      url: RESULT.secure_url,
      storageKey: RESULT.public_id,
      width: 1536,
      height: 672,
      bytes: 1_639_225,
      mimeType: 'image/png',
    });
  });

  it('files the object in the folder it was asked for', async () => {
    const uploader = fake();
    await new CloudinaryStorageProvider(uploader).upload(request);

    const options = (uploader.upload as jest.Mock).mock.calls[0][1];
    expect(options.folder).toBe('uaeaf/pages');
  });

  it('derives a readable identifier from the filename without trusting it', async () => {
    // The filename reaches a URL, so it cannot carry spaces, case, an
    // extension, or anything that would need escaping.
    const uploader = fake();
    await new CloudinaryStorageProvider(uploader).upload(request);

    const options = (uploader.upload as jest.Mock).mock.calls[0][1];
    expect(options.public_id).toMatch(/^contact-hero-[a-z0-9]+$/);
  });

  it('never lets the client choose the resource type', async () => {
    // `resource_type: 'auto'` would let a disguised file be stored as raw
    // and served back as whatever it really is.
    const uploader = fake();
    await new CloudinaryStorageProvider(uploader).upload(request);

    const options = (uploader.upload as jest.Mock).mock.calls[0][1];
    expect(options.resource_type).toBe('image');
  });

  it('reports a provider failure as unavailability, not as a bad request', async () => {
    const uploader = fake({ upload: jest.fn().mockRejectedValue(new Error('rate limited')) });
    await expect(new CloudinaryStorageProvider(uploader).upload(request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('rate limited'));
  });

  it('destroys by storage key', async () => {
    const uploader = fake();
    await new CloudinaryStorageProvider(uploader).destroy('uaeaf/pages/hero_ab12');
    expect(uploader.destroy).toHaveBeenCalledWith('uaeaf/pages/hero_ab12', {
      resource_type: 'image',
      invalidate: true,
    });
  });

  it('treats an already-absent object as destroyed', async () => {
    // Purging a record whose object was removed upstream by hand has to
    // converge. Failing forever would leave a row nothing can clear.
    const uploader = fake({ destroy: jest.fn().mockResolvedValue({ result: 'not found' }) });
    await expect(
      new CloudinaryStorageProvider(uploader).destroy('uaeaf/pages/gone'),
    ).resolves.toBeUndefined();
  });

  it('raises a provider error on destroy rather than reporting success', async () => {
    // The caller hard-deletes the row on success; a swallowed failure here
    // is exactly how an orphaned object starts consuming quota unseen.
    const uploader = fake({ destroy: jest.fn().mockRejectedValue(new Error('network')) });
    await expect(
      new CloudinaryStorageProvider(uploader).destroy('uaeaf/pages/hero_ab12'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('uaeaf/pages/hero_ab12'));
  });
});
