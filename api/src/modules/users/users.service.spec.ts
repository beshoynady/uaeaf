import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

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
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
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
});
