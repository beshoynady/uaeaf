import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NavigationItemsRepository } from './navigation-items.repository.js';
import type { NavigationItemDocument } from './schemas/navigation-items.schema.js';
import { CreateNavigationItemDto, SetParentItemDto } from './dto/create-navigation-items.dto.js';
import { assertNotDescendant } from '../../common/utils/hierarchy.util.js';

/** Implements: navigationItems collection, Domain 11 — CMS & Page
 *  Composition. Owns the menu-tree integrity rules Mongoose cannot
 *  enforce: an item may not be its own parent, and re-parenting may not
 *  close a cycle — the same hazard handled for
 *  `organizationalStructure.parentNodeId`, via the shared
 *  `assertNotDescendant` helper. */
@Injectable()
export class NavigationItemsService {
  constructor(private readonly repository: NavigationItemsRepository) {}

  /** @throws NotFoundException when `parentItemId` doesn't exist. A new
   *  item has no descendants, so no cycle is reachable at create time. */
  async create(dto: CreateNavigationItemDto): Promise<NavigationItemDocument> {
    if (dto.parentItemId) {
      await this.assertItemExists(dto.parentItemId);
    }

    return this.repository.create({
      menuId: new Types.ObjectId(dto.menuId),
      label: dto.label,
      url: dto.url,
      parentItemId: dto.parentItemId ? new Types.ObjectId(dto.parentItemId) : null,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive ?? true,
    });
  }

  async findAll(): Promise<NavigationItemDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<NavigationItemDocument | null> {
    return this.repository.findById(id);
  }

  /** Every active item of one menu — backs the public navigation read. */
  async findByMenu(menuId: string): Promise<NavigationItemDocument[]> {
    return this.repository.find({ menuId: new Types.ObjectId(menuId), isActive: true });
  }

  /** Re-parents an item, rejecting any move that would create a cycle.
   *  @throws NotFoundException when the item or new parent is missing.
   *  @throws BadRequestException on a self-parent or cyclic move. */
  async setParent(id: string, dto: SetParentItemDto): Promise<NavigationItemDocument | null> {
    await this.assertItemExists(id);

    if (!dto.parentItemId) {
      return this.repository.updateById(id, { parentItemId: null });
    }
    if (dto.parentItemId === id) {
      throw new BadRequestException('A navigation item cannot be its own parent.');
    }
    await this.assertItemExists(dto.parentItemId);
    await assertNotDescendant(
      id,
      dto.parentItemId,
      async (itemId) => {
        const item = await this.repository.findById(itemId);
        return item?.parentItemId ? item.parentItemId.toString() : null;
      },
      'Navigation item',
    );

    return this.repository.updateById(id, { parentItemId: new Types.ObjectId(dto.parentItemId) });
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<NavigationItemDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  private async assertItemExists(id: string): Promise<NavigationItemDocument> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException(`Navigation item ${id} not found.`);
    }
    return item;
  }
}
