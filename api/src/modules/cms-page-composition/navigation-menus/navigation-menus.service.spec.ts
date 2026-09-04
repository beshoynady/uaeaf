import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NavigationMenusService } from './navigation-menus.service.js';
import { NavigationMenusRepository } from './navigation-menus.repository.js';

describe('NavigationMenusService', () => {
  const makeRepository = () =>
    ({ create: jest.fn(), findOne: jest.fn() }) as unknown as jest.Mocked<NavigationMenusRepository>;

  describe('create', () => {
    it('throws ConflictException when the repository reports a duplicate key', async () => {
      const repository = makeRepository();
      repository.create.mockRejectedValue(
        Object.assign(new Error('E11000'), { code: 11000, keyValue: { key: 'main-nav' } }),
      );
      const service = new NavigationMenusService(repository);

      await expect(service.create({ key: 'main-nav', location: 'Header' })).rejects.toThrow(ConflictException);
    });

    it('re-throws a non-duplicate-key error unchanged', async () => {
      const repository = makeRepository();
      const otherError = new Error('connection reset');
      repository.create.mockRejectedValue(otherError);
      const service = new NavigationMenusService(repository);

      await expect(service.create({ key: 'main-nav', location: 'Header' })).rejects.toThrow(otherError);
    });
  });

  describe('findPublicByKey', () => {
    it('returns the public-safe shape for a matching key', async () => {
      const repository = makeRepository();
      const menu = { _id: new Types.ObjectId(), key: 'main-nav', location: 'Header' };
      repository.findOne.mockResolvedValue(menu as never);
      const service = new NavigationMenusService(repository);

      const result = await service.findPublicByKey('main-nav');

      expect(repository.findOne).toHaveBeenCalledWith({ key: 'main-nav' });
      expect(result).toEqual({ id: menu._id.toString(), key: 'main-nav', location: 'Header' });
    });

    it('returns null for an unknown key', async () => {
      const repository = makeRepository();
      repository.findOne.mockResolvedValue(null);
      const service = new NavigationMenusService(repository);

      await expect(service.findPublicByKey('does-not-exist')).resolves.toBeNull();
    });
  });
});
