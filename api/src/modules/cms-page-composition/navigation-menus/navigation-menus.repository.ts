import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { NavigationMenu } from './schemas/navigation-menus.schema.js';
import type { NavigationMenuDocument } from './schemas/navigation-menus.schema.js';

/** Implements: navigationMenus collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class NavigationMenusRepository extends BaseRepository<NavigationMenuDocument> {
  constructor(@InjectModel(NavigationMenu.name) model: Model<NavigationMenuDocument>) {
    super(model);
  }
}
