import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Membership } from './schemas/membership.schema.js';
import type { MembershipDocument } from './schemas/membership.schema.js';

/** Implements: memberships collection, Domain 9. */
@Injectable()
export class MembershipsRepository extends BaseRepository<MembershipDocument> {
  constructor(@InjectModel(Membership.name) model: Model<MembershipDocument>) {
    super(model);
  }
}
