import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Role } from './schemas/role.schema.js';
import type { RoleDocument } from './schemas/role.schema.js';

/** Implements: roles collection, Domain 8 — Platform Administration. */
@Injectable()
export class RolesRepository extends BaseRepository<RoleDocument> {
  constructor(@InjectModel(Role.name) model: Model<RoleDocument>) {
    super(model);
  }
}
