import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { OrganizationalStructureNode } from './schemas/organizational-structure.schema.js';
import type { OrganizationalStructureNodeDocument } from './schemas/organizational-structure.schema.js';

/** Implements: organizationalStructure collection, Domain 1 — Federation & Governance. */
@Injectable()
export class OrganizationalStructureNodesRepository extends BaseRepository<OrganizationalStructureNodeDocument> {
  constructor(@InjectModel(OrganizationalStructureNode.name) model: Model<OrganizationalStructureNodeDocument>) {
    super(model);
  }
}
