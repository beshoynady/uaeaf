import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';
import { Role, RoleSchema } from '../roles/schemas/role.schema.js';
import { Permission, PermissionSchema } from '../permissions/schemas/permission.schema.js';
import { RolesRepository } from '../roles/roles.repository.js';
import { RolesService } from '../roles/roles.service.js';
import type { RoleAssignmentsRepository } from '../roles/role-assignments.repository.js';
import { PermissionsRepository } from '../permissions/permissions.repository.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import type { JwtPayload } from '../../../common/interfaces/jwt-payload.interface.js';

const SECRET = 'integration-test-secret';

/**
 * The acceptance test for the owner's 2026-09-07 decision: the access token
 * carries `roleIds` only, and authority is read from the database on every
 * request.
 *
 * What makes these tests meaningful is that ONE token string is signed once,
 * in `beforeEach`, and never re-issued. Every assertion below decodes that
 * same, unchanged token. Under the previous design (a permission set
 * flattened into the token at login) every one of them would fail, because
 * the answer was fixed at mint time for the full 15-minute lifetime.
 */
describe('Access control resolution (integration)', () => {
  let server: MongoMemoryServer;
  let rolesRepository: RolesRepository;
  let permissionsRepository: PermissionsRepository;
  let strategy: JwtStrategy;
  let jwtService: JwtService;

  let roleId: Types.ObjectId;
  let readPermissionId: Types.ObjectId;
  let updatePermissionId: Types.ObjectId;
  let token: string;

  /** Re-reads authority the way a real request does: verify the signature,
   *  then hand the payload to the strategy. No re-login, no refresh. */
  const authorityFor = async (bearer: string) => {
    const payload = await jwtService.verifyAsync<JwtPayload>(bearer, { secret: SECRET });
    return (await strategy.validate(payload)).permissions;
  };

  beforeAll(async () => {
    server = await connectTestDatabase();

    const roleModel = mongoose.models[Role.name] ?? mongoose.model(Role.name, RoleSchema);
    const permissionModel =
      mongoose.models[Permission.name] ?? mongoose.model(Permission.name, PermissionSchema);

    rolesRepository = new RolesRepository(roleModel as never);
    permissionsRepository = new PermissionsRepository(permissionModel as never);

    // Constructed directly rather than through a Nest module: this spec is
    // about the read path, and PermissionsService's boot-time resource
    // validation (onApplicationBootstrap) is a separate concern with its
    // own spec.
    const permissionsService = new PermissionsService(permissionsRepository, mongoose.connection);
    // `detachRole` is never reached by these tests — they exercise permission
    // resolution, not archival — so a stub that would fail loudly if it were
    // called is the honest fixture.
    const roleAssignments = {
      detachRole: () => {
        throw new Error('detachRole is not part of permission resolution');
      },
    } as unknown as RoleAssignmentsRepository;
    const rolesService = new RolesService(rolesRepository, permissionsService, roleAssignments);

    jwtService = new JwtService({ secret: SECRET });
    strategy = new JwtStrategy(
      { get: () => SECRET } as unknown as ConfigService,
      rolesService,
    );
    // Same allowance the e2e specs make: starting a real mongod can exceed
    // Jest's 5s hook default when suites run in parallel.
  }, 60000);

  beforeEach(async () => {
    const read = await permissionsRepository.create({
      name: { en: 'Read users', ar: 'قراءة المستخدمين' },
      resourceType: 'users',
      action: 'Read',
    });
    const update = await permissionsRepository.create({
      name: { en: 'Update users', ar: 'تعديل المستخدمين' },
      resourceType: 'users',
      action: 'Update',
    });
    readPermissionId = read._id;
    updatePermissionId = update._id;

    const role = await rolesRepository.create({
      name: { en: 'Editor', ar: 'محرر' },
      permissionIds: [readPermissionId],
    });
    roleId = role._id;

    // Signed ONCE. Nothing below ever mints another one.
    token = jwtService.sign(
      { sub: new Types.ObjectId().toString(), type: 'access', roleIds: [roleId.toString()] },
      { secret: SECRET, expiresIn: '15m' },
    );
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  }, 60000);

  it('carries no permissions in the token itself, only roleIds', () => {
    const decoded = jwtService.decode(token) as Record<string, unknown>;

    expect(decoded.roleIds).toEqual([roleId.toString()]);
    expect(decoded.permissions).toBeUndefined();
    // RFC 7519 registered claims, added by @nestjs/jwt itself.
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
  });

  it('grants a permission added to the role without re-issuing the token', async () => {
    expect(await authorityFor(token)).toEqual([{ resourceType: 'users', action: 'Read' }]);

    await rolesRepository.updateById(roleId.toString(), {
      permissionIds: [readPermissionId, updatePermissionId],
    });

    const after = await authorityFor(token);
    expect(after).toContainEqual({ resourceType: 'users', action: 'Update' });
    expect(after).toHaveLength(2);
  });

  it('withdraws a permission removed from the role without re-issuing the token', async () => {
    // The case the 15-minute access-token lifetime used to leave open: a
    // demoted administrator kept their old authority until the token aged
    // out. It is now closed on the very next request.
    expect(await authorityFor(token)).toHaveLength(1);

    await rolesRepository.updateById(roleId.toString(), { permissionIds: [] });

    expect(await authorityFor(token)).toEqual([]);
  });

  it('withdraws everything the moment the role is archived', async () => {
    await rolesRepository.softDelete(roleId.toString(), new Types.ObjectId());

    expect(await authorityFor(token)).toEqual([]);
  });

  it('withdraws a permission that is archived out from under the role', async () => {
    // The role still lists the permissionId; the permission document is
    // gone. It must stop granting rather than resolve to a dangling id.
    await permissionsRepository.softDelete(readPermissionId.toString(), new Types.ObjectId());

    expect(await authorityFor(token)).toEqual([]);
  });

  it('reflects a role swap that happened after the token was signed', async () => {
    // The token still names the original role. Editing THAT role is what
    // moves the user's authority — proving the database, not the token, is
    // the source of truth.
    await rolesRepository.updateById(roleId.toString(), {
      permissionIds: [updatePermissionId],
    });

    expect(await authorityFor(token)).toEqual([{ resourceType: 'users', action: 'Update' }]);
  });
});
