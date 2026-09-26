import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';

/**
 * Creating an account in one call.
 *
 * `POST /users` used to take a name, an email and a password and nothing
 * else, so a new account existed with no roles and could sign in to an empty
 * dashboard until someone remembered the second step. Assigning the roles as
 * a separate request from the form would have left the same window open, just
 * shorter — and a failure between the two calls leaves an account nobody
 * intended to create in that state.
 *
 * `personId` had no writer anywhere in the platform: the column existed on
 * the schema and nothing could ever set it.
 */
describe('UsersService.create — roles and personnel link', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;
  let personnel: jest.Mocked<FederationPersonnelsService>;

  const roleId = new Types.ObjectId().toString();
  const personId = new Types.ObjectId().toString();
  const base = {
    name: { en: 'Sara', ar: 'سارة' },
    email: 'sara@uaeaf.ae',
    password: 'correct horse battery staple',
  };

  /** ADR-0104 rule 1 needs the acting caller. These specs are about other
   *  behaviour, so the role being assigned resolves to no grants at all and the
   *  superset check passes on an empty list. */
  const actor = {
    userId: new Types.ObjectId().toString(),
    roleIds: [],
    permissions: [],
  } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: { create: jest.fn(), updateById: jest.fn() } },
        {
          provide: RolesService,
          useValue: {
            assertAssignable: jest.fn(),
            resolvePermissionsForRoles: jest.fn(),
            isSystemRole: jest.fn(),
          },
        },
        { provide: AuthSessionsService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: FederationPersonnelsService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
    rolesService = module.get(RolesService);
    rolesService.resolvePermissionsForRoles.mockResolvedValue([] as never);
    rolesService.isSystemRole.mockResolvedValue(false as never);
    personnel = module.get(FederationPersonnelsService);

    rolesService.assertAssignable.mockResolvedValue(undefined as never);
    personnel.findById.mockResolvedValue({ _id: new Types.ObjectId(personId) } as never);
    repository.create.mockResolvedValue({ email: base.email } as never);
  });

  const created = () => repository.create.mock.calls[0][0] as Record<string, unknown>;

  it('writes the roles in the same operation as the account', async () => {
    await service.create({ ...base, roleIds: [roleId] }, actor);

    expect(created().roleIds).toEqual([new Types.ObjectId(roleId)]);
  });

  it('validates every role id before creating anything', async () => {
    // The same check `assignRoles` runs. An id that resolves to nothing
    // grants nothing, and an account created around it looks provisioned
    // when it is not.
    rolesService.assertAssignable.mockRejectedValue(
      new BadRequestException('Unknown or archived role: x.') as never,
    );

    await expect(service.create({ ...base, roleIds: [roleId] }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('links the account to a federation person when one is named', async () => {
    await service.create({ ...base, personId }, actor);

    expect(created().personId).toEqual(new Types.ObjectId(personId));
  });

  it('refuses a personId that resolves to nobody', async () => {
    // Storing it anyway would leave a reference no screen can resolve, and
    // nothing would ever notice: `personId` is read by nothing today.
    personnel.findById.mockResolvedValue(null as never);

    await expect(service.create({ ...base, personId }, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('defaults both to an unlinked account with no roles', async () => {
    await service.create(base, actor);

    expect(created().roleIds).toEqual([]);
    expect(created().personId).toBeNull();
    expect(personnel.findById).not.toHaveBeenCalled();
  });
});
