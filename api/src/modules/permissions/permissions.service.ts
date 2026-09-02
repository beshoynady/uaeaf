import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import mongoose from 'mongoose';
import { PermissionsRepository } from './permissions.repository.js';
import type { PermissionDocument } from './schemas/permission.schema.js';
import { CreatePermissionDto } from './dto/create-permission.dto.js';

/** Implements: permissions collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7901). */
@Injectable()
export class PermissionsService implements OnApplicationBootstrap {
  constructor(private readonly repository: PermissionsRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.validateResourceTypes();
  }

  /**
   * Boot-time check (BE-PLAN-010 §4.4, §7.6): every seeded
   * `permissions.resourceType` must name a collection Mongoose actually has
   * a model registered for. A permission pointing at a resource that does
   * not exist can never be satisfied by any real request, so this fails
   * startup rather than letting the mismatch surface later as a silent
   * always-denied route.
   *
   * @throws Error listing every resourceType with no matching collection.
   */
  async validateResourceTypes(): Promise<void> {
    const permissions = await this.repository.find();
    const registeredCollections = new Set(
      mongoose.modelNames().map((name) => mongoose.model(name).collection.name),
    );

    const unknown = permissions
      .map((permission) => permission.resourceType)
      .filter((resourceType) => !registeredCollections.has(resourceType));

    if (unknown.length > 0) {
      throw new Error(
        `permissions.resourceType references collections with no registered Mongoose model: ${[...new Set(unknown)].join(', ')}`,
      );
    }
  }

  async create(dto: CreatePermissionDto): Promise<PermissionDocument> {
    return this.repository.create(dto);
  }

  async findAll(): Promise<PermissionDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<PermissionDocument | null> {
    return this.repository.findById(id);
  }
}
