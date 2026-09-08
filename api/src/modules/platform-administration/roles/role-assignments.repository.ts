import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

/**
 * The one write the roles module makes against `users`: removing an
 * archived role from everyone who held it.
 *
 * Narrowly named and narrowly scoped on purpose. Archiving a role has to
 * touch the users holding it, but `RolesService` calling `UsersService`
 * while `UsersService` calls `RolesService` (to validate ids on assignment)
 * would make the two modules mutually dependent and force `forwardRef`
 * through both. Binding the `User` model here instead keeps the module graph
 * one-directional — `UsersModule` imports `RolesModule`, never the reverse —
 * and keeps this class's public surface to the single statement it is
 * allowed to make.
 *
 * It deliberately does NOT extend `BaseRepository`: nothing here should be
 * able to create, read or soft-delete a user.
 */
@Injectable()
export class RoleAssignmentsRepository {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  /**
   * Pulls a role id out of every user's `roleIds`.
   *
   * Not scoped to `archivedAt: null`: an archived user still holds the
   * reference, and leaving it there would mean restoring that account
   * silently restores a role that no longer exists.
   *
   * @returns how many accounts were changed — reported so the caller can say
   *          what the archive actually did rather than assert it blindly.
   */
  async detachRole(roleId: string): Promise<number> {
    const result = await this.model
      .updateMany({ roleIds: new Types.ObjectId(roleId) }, { $pull: { roleIds: new Types.ObjectId(roleId) } })
      .exec();
    return result.modifiedCount;
  }
}
