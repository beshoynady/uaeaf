import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { NavigationItem } from './schemas/navigation-items.schema.js';
import type { NavigationItemDocument } from './schemas/navigation-items.schema.js';

/** Implements: navigationItems collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class NavigationItemsRepository extends BaseRepository<NavigationItemDocument> {
  constructor(@InjectModel(NavigationItem.name) model: Model<NavigationItemDocument>) {
    super(model);
  }
}
