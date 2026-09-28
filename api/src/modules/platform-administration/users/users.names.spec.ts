import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';
import { User, UserSchema } from './schemas/user.schema.js';
import type { UserDocument } from './schemas/user.schema.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { REQUIRED_PERMISSION_KEY } from '../../../common/decorators/permissions.decorator.js';

/**
 * `GET /users/names` — ADR-0104 §D4.
 *
 * Approved as a named, bounded exception to Decision 4 ("account data needs
 * `users:Read`, which is now Super-Admin-only"): a news article's byline, an
 * audit row's actor, and a workflow step's approver all need to show a
 * person's name, and gating that behind a Super-Admin-only permission would
 * break every one of those screens for everyone else.
 *
 * Every condition below is proven against a REAL query on a real (in-memory)
 * MongoDB — never a mocked repository. A mock proves the code called a
 * function; it cannot prove which fields actually left the database, and the
 * projection is the entire guarantee this route makes to every authenticated
 * user it is reachable by, with no permission check standing in front of it.
 */
describe('GET /users/names', () => {
  let server: MongoMemoryServer;
  let model: Model<UserDocument>;
  let repository: UsersRepository;
  let service: UsersService;
  let controller: UsersController;

  const makeUser = (over: Record<string, unknown> = {}) =>
    model.create({
      name: { en: 'Sara Al Ali', ar: 'سارة العلي' },
      email: `${new Types.ObjectId().toString()}@uaeaf.ae`,
      accountStatus: 'Active',
      authMethods: [{ provider: 'Local', passwordHash: 'not-a-real-hash', linkedAt: new Date() }],
      ...over,
    });

  /** Inserted through the raw driver, bypassing Mongoose's `required`
   *  validator — `name.en`/`name.ar` are `required: true` on the schema, so
   *  an EMPTY string cannot be written through `model.create()`. A blank
   *  stored name is nonetheless a real state (a pre-validation row, a manual
   *  edit), and the fallback has to hold for it. Same technique
   *  `permissions.service.spec.ts` already uses to simulate a row the schema
   *  would otherwise refuse. */
  const makeUserRaw = async (over: Record<string, unknown> = {}) => {
    const _id = new Types.ObjectId();
    await model.collection.insertOne({
      _id,
      name: { en: 'Sara Al Ali', ar: 'سارة العلي' },
      email: `${_id.toString()}@uaeaf.ae`,
      accountStatus: 'Active',
      roleIds: [],
      archivedAt: null,
      ...over,
    });
    return _id;
  };

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<UserDocument>('User', UserSchema);
    repository = new UsersRepository(model);
    service = new UsersService(
      repository,
      {
        assertAssignable: jest.fn(),
        resolvePermissionsForRoles: jest.fn(),
        isSystemRole: jest.fn(),
      } as never,
      { revokeAllForUser: jest.fn() } as never,
      { findById: jest.fn() } as never,
      { write: jest.fn() } as never,
    );
    controller = new UsersController(service);
  }, 60000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  }, 60000);

  // Condition 1 + the projection guarantee behind it.
  it('answers id and displayName only, read off a real document', async () => {
    const user = await makeUser();

    const result = await controller.namesByIds(user._id.toString());

    expect(result).toHaveLength(1);
    expect(Object.keys(result[0]).sort()).toEqual(['displayName', 'id']);
    expect(Object.keys(result[0].displayName).sort()).toEqual(['ar', 'en']);
    expect(result[0].id).toBe(user._id.toString());
    expect(result[0].displayName).toEqual({ en: 'Sara Al Ali', ar: 'سارة العلي' });
  });

  // The projection is made in the QUERY, not by dropping fields from the
  // response after the fact — the raw hydrated document itself must carry
  // nothing else, or the email was already in memory.
  it('narrows in the query — the raw document carries only _id and name', async () => {
    const user = await makeUser({ email: 'should-not-be-fetched@uaeaf.ae' });

    const [raw] = await repository.findNamesByIds([user._id.toString()]);

    expect(Object.keys(raw.toObject()).sort()).toEqual(['_id', 'name']);
  });

  // Condition 2: never the email, and the fallback is per-language.
  it('falls back to a fixed string per language, never to the email, when the stored name is empty', async () => {
    const userId = await makeUserRaw({ name: { en: '', ar: '' }, email: 'plain-jane@uaeaf.ae' });

    const result = await controller.namesByIds(userId.toString());

    expect(result[0].displayName).toEqual({ en: 'User', ar: 'مستخدم' });
    expect(JSON.stringify(result)).not.toContain('plain-jane');
    expect(JSON.stringify(result)).not.toContain('@uaeaf.ae');
  });

  it('applies the two-language fallback independently — one present does not paper over the other missing', async () => {
    const userId = await makeUserRaw({ name: { en: 'Omar', ar: '' } });

    const result = await controller.namesByIds(userId.toString());

    expect(result[0].displayName).toEqual({ en: 'Omar', ar: 'مستخدم' });
  });

  /**
   * Independent review, round 4 (M9): `name.en || fallback` dereferences
   * `name`, which throws — a 500, on a route every authenticated user can
   * reach — for a row with no `name` subdocument at all, not merely an
   * empty one. Inserted with no `name` key whatsoever, the same
   * bypass-Mongoose-validation technique the empty-string case above uses.
   */
  it('falls back to a fixed string per language when the name subdocument is missing entirely, rather than throwing', async () => {
    const _id = new Types.ObjectId();
    await model.collection.insertOne({
      _id,
      email: `${_id.toString()}@uaeaf.ae`,
      accountStatus: 'Active',
      roleIds: [],
      archivedAt: null,
    });

    const result = await controller.namesByIds(_id.toString());

    expect(result[0].displayName).toEqual({ en: 'User', ar: 'مستخدم' });
  });

  // Condition 3: unknown and archived are indistinguishable, and dropped in silence.
  it('drops an id that does not resolve — unknown or archived — without a trace', async () => {
    const known = await makeUser();
    const archived = await makeUser({ archivedAt: new Date() });
    const unknown = new Types.ObjectId().toString();

    const result = await controller.namesByIds(
      [known._id.toString(), archived._id.toString(), unknown].join(','),
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(known._id.toString());
  });

  // Condition 4: the cap and the id-shape check are both 400s — malformed
  // input is rejected at the boundary; a well-formed id that resolves to
  // nothing is dropped in silence instead (the test above).
  it('rejects more than the cap with 400, rather than truncating', async () => {
    const ids = Array.from({ length: 101 }, () => new Types.ObjectId().toString()).join(',');

    await expect(controller.namesByIds(ids)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a malformed id with 400, rather than dropping it silently', async () => {
    await expect(controller.namesByIds('not-an-object-id')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('answers nothing for an empty query, issuing no query at all', async () => {
    const spy = jest.spyOn(model, 'find');

    const result = await controller.namesByIds(undefined);

    expect(result).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  // Condition 5: no @RequirePermission (deliberate), and not @Public() either
  // — JwtAuthGuard still runs. Read off the route's own metadata rather than
  // driven through HTTP, since this suite constructs the controller directly.
  it('carries no @RequirePermission — deliberate, not an oversight', () => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSION_KEY, UsersController.prototype.namesByIds),
    ).toBeUndefined();
  });

  it('is not @Public() — an unauthenticated caller still meets JwtAuthGuard', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, UsersController.prototype.namesByIds)).toBeUndefined();
  });
});
