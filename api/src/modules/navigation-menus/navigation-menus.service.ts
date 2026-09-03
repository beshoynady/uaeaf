import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { NavigationMenusRepository } from './navigation-menus.repository.js';
import type { NavigationMenuDocument } from './schemas/navigation-menus.schema.js';
import { CreateNavigationMenuDto } from './dto/create-navigation-menus.dto.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../common/utils/mongo-errors.util.js';

/** Implements: navigationMenus collection, Domain 11 — CMS & Page
 *  Composition. */
@Injectable()
export class NavigationMenusService {
  constructor(private readonly repository: NavigationMenusRepository) {}

  /** @throws ConflictException when `key` is already taken. */
  async create(dto: CreateNavigationMenuDto): Promise<NavigationMenuDocument> {
    try {
      return await this.repository.create({ key: dto.key, location: dto.location });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'key'}.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<NavigationMenuDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<NavigationMenuDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<NavigationMenuDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
