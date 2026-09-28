import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { User } from './schemas/user.schema.js';
import type { UserDocument } from './schemas/user.schema.js';

/** Implements: users collection, Domain 8 — Platform Administration. */
@Injectable()
export class UsersRepository extends BaseRepository<UserDocument> {
  constructor(@InjectModel(User.name) model: Model<UserDocument>) {
    super(model);
  }

  /** Normalizes the lookup the same way the schema normalizes storage
   *  (`email`'s `lowercase`/`trim`) — Mongoose's setters apply to document
   *  writes, not to a raw query filter, so this method must normalize its
   *  own input or a differently-cased login attempt would silently miss
   *  an existing account.
   *
   *  Bypasses the generic `findOne()` to add `.select('+authMethods.passwordHash')`:
   *  that field is `select: false` on the schema (auth-security-audit-2026-09-05.md
   *  P0 #1) so it never leaks via GET /users*, but this is the one legitimate
   *  internal caller (AuthService.login()) that must read it to compare the
   *  submitted password — every other caller of this repository never sees it. */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model
      .findOne({ email: email.toLowerCase().trim(), archivedAt: null })
      .select('+authMethods.passwordHash')
      .exec();
  }

  /**
   * Narrow projection for name resolution — `_id name`, selected explicitly
   * rather than filtered after the read (owner decision 2026-09-27).
   *
   * Two callers: `UsersService.findNamesByIds` (an internal join — a
   * revision's author, a workflow step's actor) and, through it,
   * `GET /users/names`, which carries no permission at all. The explicit
   * `select` is the entire guarantee for that route: a field added to the
   * schema later — or `authMethods`, or `email`, both already on this
   * document — must not reach a caller who holds nothing, and a projection
   * applied after the documents arrive would already have pulled them into
   * memory first. Archived users are excluded by the base soft-delete scope,
   * so an archived account's name silently stops resolving rather than
   * erroring.
   */
  async findNamesByIds(ids: readonly string[]): Promise<UserDocument[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.model
      .find({ _id: { $in: ids }, archivedAt: null })
      .select('_id name')
      .exec();
  }

  /**
   * How many active Super Admins there are **other than** `excludingUserId`.
   *
   * Excluding the target states the question the guard actually asks — "would
   * anyone be left" rather than "how many are there" — which makes the refusal
   * read correctly for the request in hand.
   *
   * IT DOES NOT MAKE THE GUARD ATOMIC, and an earlier version of this comment
   * wrongly claimed it did. Counting the others and refusing at zero is
   * arithmetically the same as counting all and refusing at one: two concurrent
   * demotions of two different holders each see one other holder, both pass, and
   * both write. Closing that needs the count and the write to be one operation —
   * a transaction, or a conditional write — which this codebase has no precedent
   * for and its connection string is not configured for. Recorded as an open
   * decision rather than papered over; see `users.service.last-super-admin.spec.ts`
   * for the failing test that pins it.
   *
   * Reaches the `roles` collection directly rather than through `RolesService`:
   * this repository is the one place the two collections are joined for a
   * count, and injecting a service into a repository to read one field would
   * invert the dependency the rest of the module keeps.
   *
   * Moved back onto this method 2026-09-27 (independent review, round 4, M4):
   * `findNamesByIds` had been inserted between this comment and the method it
   * describes, leaving this paragraph about Super-Admin counting sitting over
   * a name projection that does neither thing it describes.
   */
  async countActiveSuperAdmins(excludingUserId?: string): Promise<number> {
    const systemRoles = await this.model.db
      .collection('roles')
      .find({ isSystemRole: true, archivedAt: null })
      .project({ _id: 1 })
      .toArray();

    if (systemRoles.length === 0) {
      return 0;
    }

    return this.model.countDocuments({
      roleIds: { $in: systemRoles.map((role) => role._id) },
      accountStatus: 'Active',
      archivedAt: null,
      ...(excludingUserId ? { _id: { $ne: new Types.ObjectId(excludingUserId) } } : {}),
    });
  }
}
