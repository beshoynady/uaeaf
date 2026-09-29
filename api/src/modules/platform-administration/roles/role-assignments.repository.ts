import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { ClientSession, mongo } from 'mongoose';
import { User } from '../users/schemas/user.schema.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

/** The stored shape this write addresses, which is deliberately not
 *  `UserDocument`: what makes the write necessary is a value the declared type
 *  says cannot be there. */
interface StoredRoleRefs {
  roleIds: unknown[];
}

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
   * Pulls a role id out of every user's `roleIds`, in both BSON types it can
   * be stored as.
   *
   * Not scoped to `archivedAt: null`: an archived user still holds the
   * reference, and leaving it there would mean restoring that account
   * silently restores a role that no longer exists.
   *
   * Sent through the driver collection rather than the model, and this is the
   * whole reason: `roleIds` is a real `ObjectId` path, so Mongoose casts a
   * filter before it leaves — including every member of an `$in` — and the two
   * spellings below would arrive as one. The driver sends them as written.
   * MongoDB compares the BSON type before the value, so an id stored as a
   * string is invisible to an `ObjectId` filter and the account would keep a
   * role that no longer exists. Every write the application makes stores an
   * `ObjectId`; a row predating that is still out there until the owner runs
   * `convert:reference-ids`, and this method cannot assume they have.
   *
   * A malformed id throws from `new Types.ObjectId` before anything is sent,
   * so the string half can never become a match on its own.
   *
   * The holders are read and pulled through one filter value, and — given a
   * `session` — inside one transaction, so the ids returned name exactly the
   * accounts the pull changed. A caller writing one audit row per id therefore
   * cannot record an account the pull missed, or miss one it changed.
   *
   * @param session joins an open transaction, so the pull commits or aborts
   *   with whatever else that transaction records about it.
   * @returns the id of every account the role was pulled from.
   */
  async detachRole(roleId: string, session?: ClientSession): Promise<Types.ObjectId[]> {
    const spellings = [new Types.ObjectId(roleId), roleId];
    const users = this.model.collection as unknown as mongo.Collection<StoredRoleRefs>;
    const holders = { roleIds: { $in: spellings } };
    const detachedFrom = await users.find(holders, { projection: { _id: 1 }, session }).toArray();
    await users.updateMany(holders, { $pull: { roleIds: { $in: spellings } } }, { session });
    return detachedFrom.map((holder) => holder._id);
  }
}
