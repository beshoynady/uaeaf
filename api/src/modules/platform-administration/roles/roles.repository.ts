import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ClientSession } from 'mongoose';
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

  /**
   * A session on this repository's own connection, for a caller that has to
   * make several writes land as one.
   *
   * Taken from the model rather than from an injected `Connection` so the
   * session provably belongs to the connection these writes go out on — two
   * connections would produce a session that commits nothing the writes saw.
   */
  async startSession(): Promise<ClientSession> {
    return this.model.startSession();
  }
}
