import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Permission } from './schemas/permission.schema.js';
import type { PermissionDocument } from './schemas/permission.schema.js';

/** Implements: permissions collection, Domain 8 — Platform Administration. */
@Injectable()
export class PermissionsRepository extends BaseRepository<PermissionDocument> {
  constructor(@InjectModel(Permission.name) model: Model<PermissionDocument>) {
    super(model);
  }
}
