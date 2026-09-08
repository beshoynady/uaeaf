import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Role } from './schemas/role.schema.js';
import type { RoleDocument } from './schemas/role.schema.js';

/** Implements: roles collection, Domain 8 — Platform Administration. */
@Injectable()
export class RolesRepository extends BaseRepository<RoleDocument> {
  constructor(@InjectModel(Role.name) model: Model<RoleDocument>) {
    super(model);
  }

  /**
   * Reads a role whether or not it has been archived.
   *
   * The inherited `findById` filters `archivedAt: null`, which is right for
   * every read that serves a caller. It was wrong for the guard that decides
   * whether a role may be edited: an archived role came back as `null`, the
   * guard saw no `isSystemRole`, and the update went ahead — so an archived
   * role could be renamed, including an archived system role. The guard
   * needs the document as it actually is, not as the soft-delete scope
   * presents it.
   */
  async findByIdIncludingArchived(id: string): Promise<RoleDocument | null> {
    return this.model.findById(id).exec();
  }
}
