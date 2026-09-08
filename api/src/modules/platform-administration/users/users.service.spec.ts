import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            updateById: jest.fn(),
          },
        },
        { provide: RolesService, useValue: { assertAssignable: jest.fn() } },
        { provide: AuthSessionsService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: FederationPersonnelsService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
    rolesService = module.get(RolesService);
    rolesService.assertAssignable.mockResolvedValue(undefined as never);
  });

  describe('create', () => {
    it('stores the password as a hashed Local authMethod, never in plaintext', async () => {
      const name = { en: 'Sara', ar: 'سارة' };
      repository.create.mockResolvedValue({ name, email: 'sara@uaeaf.ae' } as never);

      await service.create({ name, email: 'sara@uaeaf.ae', password: 'correct horse battery staple' });

      expect(repository.create).toHaveBeenCalledTimes(1);
      const [created] = repository.create.mock.calls[0] as [Record<string, unknown>];
      expect(created.name).toEqual(name);
      expect(created.email).toBe('sara@uaeaf.ae');
      expect(created.accountStatus).toBe('Active');
      const authMethods = created.authMethods as Array<{ provider: string; passwordHash: string }>;
      expect(authMethods).toHaveLength(1);
      expect(authMethods[0].provider).toBe('Local');
      expect(authMethods[0].passwordHash).not.toBe('correct horse battery staple');
      expect(authMethods[0].passwordHash.length).toBeGreaterThan(20);
    });
  });

  describe('assignRoles', () => {
    it('replaces roleIds with the given list', async () => {
      const id = new Types.ObjectId().toString();
      const roleIds = [new Types.ObjectId(), new Types.ObjectId()];
      repository.updateById.mockResolvedValue({ roleIds } as never);

      await service.assignRoles(id, roleIds);


      expect(repository.updateById).toHaveBeenCalledWith(id, { roleIds });
    });
  });

  describe('recordFailedLogin', () => {
    it('increments failedLoginAttempts without locking below the threshold', async () => {
      const id = new Types.ObjectId().toString();
      repository.updateById.mockResolvedValue({} as never);

      await service.recordFailedLogin(id, 3);

      expect(repository.updateById).toHaveBeenCalledWith(id, { failedLoginAttempts: 4 });
    });

    it('sets lockedUntil ~15 minutes out the moment the 5th attempt is recorded', async () => {
      const id = new Types.ObjectId().toString();
      repository.updateById.mockResolvedValue({} as never);
      const before = Date.now();

      await service.recordFailedLogin(id, 4);

      expect(repository.updateById).toHaveBeenCalledTimes(1);
      const [, update] = repository.updateById.mock.calls[0] as [string, Record<string, unknown>];
      expect(update.failedLoginAttempts).toBe(5);
      const lockedUntil = update.lockedUntil as Date;
      expect(lockedUntil).toBeInstanceOf(Date);
      const deltaMs = lockedUntil.getTime() - before;
      expect(deltaMs).toBeGreaterThan(14 * 60 * 1000);
      expect(deltaMs).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('records lastLogin and resets the lockout counters', async () => {
      const id = new Types.ObjectId().toString();
      repository.updateById.mockResolvedValue({} as never);

      await service.recordSuccessfulLogin(id);

      expect(repository.updateById).toHaveBeenCalledWith(
        id,
        expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: null, lastLogin: expect.any(Date) }),
      );
    });
  });

  describe('updatePreferences', () => {
    const id = new Types.ObjectId().toString();

    /** Builds the DTO the way the global ValidationPipe does
     *  (`transform: true`), NOT as a plain object literal.
     *
     *  This distinction is the whole point of the helper. Under
     *  `target: ES2023` a class instance carries every declared property,
     *  as `undefined` where nothing was sent, while an object literal
     *  simply lacks the key. Passing literals here is what let a real bug
     *  ship green: `updatePreferences` used `in`, which is always true on
     *  the instance, so setting the theme silently cleared the language on
     *  every request. */
    const asDto = (payload: Partial<UpdatePreferencesDto>): UpdatePreferencesDto =>
      plainToInstance(UpdatePreferencesDto, payload);

    const storedUser = (overrides: Record<string, unknown>) => ({
      _id: new Types.ObjectId(id),
      name: { en: 'Sara', ar: 'سارة' },
      email: 'sara@uaeaf.ae',
      roleIds: [],
      personId: null,
      accountStatus: 'Active',
      lastLogin: null,
      photoId: null,
      preferredLanguage: null,
      preferredTheme: null,
      ...overrides,
    });

    it('sends only the supplied preference, leaving the other absent from the update', async () => {
      repository.updateById.mockResolvedValue(storedUser({ preferredTheme: 'light' }) as never);

      await service.updatePreferences(id, asDto({ preferredTheme: 'light' }));

      expect(repository.updateById).toHaveBeenCalledWith(id, { preferredTheme: 'light' });
    });

    it('does not clear the language when only the theme is changed', async () => {
      // The regression guard for the 2026-09-07 bug: an administrator who
      // switched to dark mode had their chosen language silently reset.
      repository.updateById.mockResolvedValue(storedUser({ preferredTheme: 'dark' }) as never);

      await service.updatePreferences(id, asDto({ preferredTheme: 'dark' }));

      const [, update] = repository.updateById.mock.calls[0] as [string, Record<string, unknown>];
      expect('preferredLanguage' in update).toBe(false);
    });

    it('does not clear the theme when only the language is changed', async () => {
      repository.updateById.mockResolvedValue(storedUser({ preferredLanguage: 'en' }) as never);

      await service.updatePreferences(id, asDto({ preferredLanguage: 'en' }));

      const [, update] = repository.updateById.mock.calls[0] as [string, Record<string, unknown>];
      expect('preferredTheme' in update).toBe(false);
    });

    it('still applies an explicit null, which is how a preference is cleared', async () => {
      repository.updateById.mockResolvedValue(storedUser({}) as never);

      await service.updatePreferences(id, asDto({ preferredTheme: null }));

      expect(repository.updateById).toHaveBeenCalledWith(id, { preferredTheme: null });
    });

    it('persists both preferences and returns the public response shape', async () => {
      repository.updateById.mockResolvedValue(
        storedUser({ preferredLanguage: 'ar', preferredTheme: 'dark' }) as never,
      );

      const result = await service.updatePreferences(
        id,
        asDto({ preferredLanguage: 'ar', preferredTheme: 'dark' }),
      );

      expect(repository.updateById).toHaveBeenCalledWith(id, {
        preferredLanguage: 'ar',
        preferredTheme: 'dark',
      });
      expect(result?.preferredLanguage).toBe('ar');
      expect(result?.preferredTheme).toBe('dark');
    });

    it('returns null when the user does not exist', async () => {
      repository.updateById.mockResolvedValue(null);

      await expect(service.updatePreferences(id, asDto({ preferredTheme: 'dark' }))).resolves.toBeNull();
    });
  });
});
