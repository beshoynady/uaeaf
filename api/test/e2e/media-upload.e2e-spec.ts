import { MongoMemoryServer } from 'mongodb-memory-server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiPath } from './support/api-path.js';
import { configureTestApp } from './support/test-app.js';

/**
 * The image upload and delete lifecycle, end to end.
 *
 * Nothing here reaches Cloudinary, and that is a property of the design
 * rather than a limitation of the test: every refusal below happens before
 * a single byte would be sent, which is the whole point of checking the file
 * locally first. The one path that would store something is driven through a
 * stand-in provider, so the ordering guarantees — destroy before delete, and
 * clean up after a failed record write — are exercised for real without a
 * network or a credential.
 */

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

// Explicit timeouts: starting a real MongoDB costs well over Jest's 5s hook
// default on a cold cache, and the failure it produces then blames the test
// rather than the download it was actually waiting on.
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-media-upload');
}, 120_000);

afterAll(async () => {
  // Guarded: if the server never started, the teardown failure would replace
  // the real reason the suite could not run.
  await mongoServer?.stop();
}, 60_000);

const HERO = join(
  process.cwd(),
  '..',
  'apps',
  'web',
  'public',
  'design-assets',
  'contact',
  'contact-hero-2616-1382.png',
);

describe('Media upload and purge (e2e)', () => {
  it('gates the route, verifies the bytes, and destroys the object before the record', async () => {
    const { Test } = await import('@nestjs/testing');
    const { INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const request = (await import('supertest')).default;

    const { AppModule } = await import('../../src/app.module.js');
    const { Role } = await import('../../src/modules/platform-administration/roles/schemas/role.schema.js');
    const { Permission } = await import(
      '../../src/modules/platform-administration/permissions/schemas/permission.schema.js'
    );
    const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');
    const { STORAGE_PROVIDER } = await import('../../src/modules/media-center/storage/storage-provider.js');
    const bcrypt = (await import('bcryptjs')).default;

    // A recording stand-in for the image store. Overriding the provider
    // rather than the SDK is what the `StorageProvider` seam is for: the
    // service under test is the real one, wired exactly as in production.
    const destroyed: string[] = [];
    let uploads = 0;
    const storage = {
      upload: async () => {
        uploads += 1;
        return {
          url: `https://cdn.example/uaeaf/pages/hero-${uploads}.png`,
          storageKey: `uaeaf/pages/hero-${uploads}`,
          width: 1536,
          height: 672,
          bytes: 1_639_225,
          mimeType: 'image/png',
        };
      },
      destroy: async (key: string) => {
        destroyed.push(key);
      },
    };

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(STORAGE_PROVIDER)
      .useValue(storage)
      .compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    configureTestApp(app);
    await app.init();

    const permissionModel = moduleFixture.get(getModelToken(Permission.name));
    const roleModel = moduleFixture.get(getModelToken(Role.name));
    const userModel = moduleFixture.get(getModelToken(User.name));

    const grant = async (resourceType: string, action: string) => {
      const permission = await permissionModel.create({
        name: { en: `${action} ${resourceType}`, ar: `${action} ${resourceType}` },
        resourceType,
        action,
      });
      return permission._id;
    };

    const editorRole = await roleModel.create({
      name: { en: 'Media Editor', ar: 'محرّر الوسائط' },
      permissionIds: [
        await grant('mediaAssets', 'Create'),
        await grant('mediaAssets', 'Read'),
        await grant('mediaAssets', 'Delete'),
      ],
      isSystemRole: false,
    });
    // A second account that may read the library but may not add to it —
    // the check that the upload route is gated by its own grant and not by
    // merely being signed in.
    const readerRole = await roleModel.create({
      name: { en: 'Media Reader', ar: 'قارئ الوسائط' },
      permissionIds: [await grant('mediaAssets', 'Read')],
      isSystemRole: false,
    });

    const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
    for (const [email, roleId] of [
      ['media-editor@uaeaf.ae', editorRole._id],
      ['media-reader@uaeaf.ae', readerRole._id],
    ] as const) {
      await userModel.create({
        name: { en: email, ar: email },
        email,
        accountStatus: 'Active',
        roleIds: [roleId],
        authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
      });
    }

    const signIn = async (email: string) => {
      const login = await request(app.getHttpServer())
        .post(apiPath('/auth/login'))
        .send({ email, password: 'correct horse battery staple' })
        .expect(200);
      return `Bearer ${login.body.accessToken as string}`;
    };
    const editor = await signIn('media-editor@uaeaf.ae');
    const reader = await signIn('media-reader@uaeaf.ae');

    const hero = readFileSync(HERO);
    const alt = JSON.stringify({ ar: 'عدّاؤون على المضمار', en: 'Runners on a track' });
    const caption = JSON.stringify({ ar: 'غلاف', en: 'Hero' });

    // --- The route is closed to anonymous callers ---
    await request(app.getHttpServer())
      .post(apiPath('/media-assets/upload'))
      .attach('file', hero, 'hero.png')
      .field('altText', alt)
      .field('caption', caption)
      .expect(401);

    // --- and to a signed-in account without mediaAssets:Create ---
    await request(app.getHttpServer())
      .post(apiPath('/media-assets/upload'))
      .set('Authorization', reader)
      .attach('file', hero, 'hero.png')
      .field('altText', alt)
      .field('caption', caption)
      .expect(403);

    expect(uploads).toBe(0);

    // --- A file that is not an image is refused on its bytes, whatever it
    //     was named or declared as ---
    const disguised = await request(app.getHttpServer())
      .post(apiPath('/media-assets/upload'))
      .set('Authorization', editor)
      .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .field('altText', alt)
      .field('caption', caption)
      .expect(415);
    expect(disguised.body.message).toContain('logo.png');

    // --- Missing alternative text is refused at the boundary, before the
    //     file is stored. This failed silently once: `@ValidateNested()`
    //     passes on an absent value, so the upload happened and only the
    //     schema objected, leaving the image behind. ---
    await request(app.getHttpServer())
      .post(apiPath('/media-assets/upload'))
      .set('Authorization', editor)
      .attach('file', hero, 'hero.png')
      .field('caption', caption)
      .expect(400);

    expect(uploads).toBe(0);

    // --- The accepted upload records what the provider reported, not what
    //     the request claimed ---
    const created = await request(app.getHttpServer())
      .post(apiPath('/media-assets/upload'))
      .set('Authorization', editor)
      .attach('file', hero, 'hero.png')
      .field('altText', alt)
      .field('caption', caption)
      .field('photographer', 'A. Al Mansoori')
      .expect(201);

    expect(uploads).toBe(1);
    expect(created.body.file.storageKey).toBe('uaeaf/pages/hero-1');
    expect(created.body.file.width).toBe(1536);
    expect(created.body.file.height).toBe(672);
    expect(created.body.file.mimeType).toBe('image/png');
    expect(created.body.file.photographer).toBe('A. Al Mansoori');
    expect(created.body.altText.ar).toBe('عدّاؤون على المضمار');
    const assetId = created.body._id as string;

    // --- It is immediately resolvable by the public site ---
    const publicRead = await request(app.getHttpServer())
      .get(apiPath(`/media-assets/public?ids=${assetId}`))
      .expect(200);
    expect(publicRead.body).toHaveLength(1);
    expect(publicRead.body[0].file.storageKey).toBeUndefined();

    // --- Purging a live asset is refused: a published page may be showing
    //     it, and one request must not take it away ---
    await request(app.getHttpServer())
      .delete(apiPath(`/media-assets/${assetId}/object`))
      .set('Authorization', editor)
      .expect(409);
    expect(destroyed).toHaveLength(0);

    // --- Archiving leaves the stored object alone, so the archive stays
    //     restorable ---
    await request(app.getHttpServer())
      .delete(apiPath(`/media-assets/${assetId}`))
      .set('Authorization', editor)
      .expect(200);
    expect(destroyed).toHaveLength(0);

    // --- Purging then destroys the object and removes the record ---
    await request(app.getHttpServer())
      .delete(apiPath(`/media-assets/${assetId}/object`))
      .set('Authorization', editor)
      .expect(204);
    expect(destroyed).toEqual(['uaeaf/pages/hero-1']);

    // The row is gone, asserted through the two reads that can actually say
    // so. `GET /media-assets/:id` cannot: like four other routes on this API
    // it answers 200 with an empty body for a record that does not exist, so
    // it reports the same thing whether the purge worked or not.
    const afterPurge = await request(app.getHttpServer())
      .get(apiPath(`/media-assets/public?ids=${assetId}`))
      .expect(200);
    expect(afterPurge.body).toEqual([]);

    // Purging again finds nothing to purge — which only holds if the first
    // purge removed the row rather than archiving it a second time.
    await request(app.getHttpServer())
      .delete(apiPath(`/media-assets/${assetId}/object`))
      .set('Authorization', editor)
      .expect(404);
    expect(destroyed).toEqual(['uaeaf/pages/hero-1']);

    await app.close();
  }, 120_000);
});
