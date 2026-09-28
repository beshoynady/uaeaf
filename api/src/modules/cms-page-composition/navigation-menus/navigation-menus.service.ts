import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NavigationMenusRepository } from './navigation-menus.repository.js';
import type { NavigationMenuDocument } from './schemas/navigation-menus.schema.js';
import { CreateNavigationMenuDto } from './dto/create-navigation-menus.dto.js';
import { UpdateNavigationMenuDto } from './dto/update-navigation-menus.dto.js';
import type { NavigationMenuPublicResponseDto } from './dto/navigation-menu-public-response.dto.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../../common/utils/mongo-errors.util.js';
import { partialUpdate } from '../../../common/utils/partial-update.util.js';

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

  /** @throws NotFoundException when no such menu exists.
   *  @throws ConflictException when the patch's `key` is already taken. */
  async update(id: string, dto: UpdateNavigationMenuDto): Promise<NavigationMenuDocument> {
    let updated: NavigationMenuDocument | null;
    try {
      updated = await this.repository.updateById(id, partialUpdate(dto));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'key'}.`);
      }
      throw error;
    }
    if (!updated) {
      throw new NotFoundException(`Navigation menu ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<NavigationMenuDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<NavigationMenuDocument | null> {
    return this.repository.restore(id);
  }

  /** Public lookup by the stable `key` a frontend actually knows (e.g.
   *  "main-nav") — resolves to the `id` that
   *  `navigation-items.controller.ts`'s `public/by-menu/:menuId` route
   *  needs. Returns `null` for an unknown key so the caller 404s. */
  async findPublicByKey(key: string): Promise<NavigationMenuPublicResponseDto | null> {
    const menu = await this.repository.findOne({ key });
    return menu ? this.toPublicResponse(menu) : null;
  }

  /** Maps a full `NavigationMenu` document to its public-safe shape. */
  toPublicResponse(menu: NavigationMenuDocument): NavigationMenuPublicResponseDto {
    return { id: menu._id.toString(), key: menu.key, location: menu.location };
  }
}
