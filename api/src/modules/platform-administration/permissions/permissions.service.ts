import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
// Type-only: mongoose is CJS and does not expose `Connection` as a runtime
// named export, so a value import fails at ESM load time. The DI token comes
// from @InjectConnection(), not from emitted parameter metadata, so nothing
// needs the runtime reference.
import type { Connection } from 'mongoose';
import { PermissionsRepository } from './permissions.repository.js';
import type { PermissionDocument } from './schemas/permission.schema.js';
import { CreatePermissionDto } from './dto/create-permission.dto.js';

/** Implements: permissions collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7901). */
@Injectable()
export class PermissionsService implements OnApplicationBootstrap {
  constructor(
    private readonly repository: PermissionsRepository,
    // The application's own connection, injected rather than reached for
    // through the `mongoose` default export — see validateResourceTypes().
    @InjectConnection() private readonly connection: Connection,
  ) {}

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
   * Reads the models off the INJECTED connection, not the `mongoose`
   * default export. Fixed 2026-09-07, found the first time the permissions
   * collection was ever populated (by the new bootstrap script): NestJS
   * registers every model on the connection `MongooseModule.forRootAsync`
   * creates, and nothing is registered on the global default instance. So
   * `mongoose.modelNames()` returned an empty list in the running
   * application, every seeded resourceType looked unknown, and the API
   * refused to boot — 65 registered models reported as 0.
   *
   * The check had never actually run against real data before, because the
   * permissions collection had always been empty; with no rows to inspect
   * the loop below found nothing to reject regardless of what it compared
   * against. Its unit test passed for the same reason it hid the bug: the
   * test registers its models on the global instance, which production
   * never does.
   *
   * @throws Error listing every resourceType with no matching collection.
   */
  async validateResourceTypes(): Promise<void> {
    const permissions = await this.repository.find();
    const registeredCollections = new Set(
      this.connection.modelNames().map((name) => this.connection.model(name).collection.name),
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

  /** Batched sibling of `findById`, for the per-request permission
   *  resolution introduced by the roleIds-only token (owner decision
   *  2026-09-07). Archived permissions are excluded, so revoking a
   *  permission document withdraws it from every role that lists it on the
   *  very next request. */
  async findByIds(ids: readonly string[]): Promise<PermissionDocument[]> {
    return this.repository.findByIds(ids);
  }
}
