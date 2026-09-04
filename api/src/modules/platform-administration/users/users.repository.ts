import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
   *  an existing account. */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.findOne({ email: email.toLowerCase().trim() });
  }
}
