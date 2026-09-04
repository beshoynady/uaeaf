import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrganizationalStructureNodesRepository } from './organizational-structure.repository.js';
import type { OrganizationalStructureNodeDocument } from './schemas/organizational-structure.schema.js';
import {
  CreateOrganizationalStructureNodeDto,
  SetParentNodeDto,
} from './dto/create-organizational-structure.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { assertNotDescendant } from '../../../common/utils/hierarchy.util.js';

/** Implements: organizationalStructure collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B), wired like Week 3's
 *  `DocumentsService` mode (a).
 *
 *  Owns the org-tree integrity rules that Mongoose cannot enforce
 *  (confirmed decision #2): a node may not be its own parent, and
 *  re-parenting may not close a cycle. */
@Injectable()
export class OrganizationalStructureNodesService {
  constructor(
    private readonly repository: OrganizationalStructureNodesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
  ) {}

  /** @throws NotFoundException when `parentNodeId` doesn't exist. A brand
   *  new node has no descendants, so no cycle is reachable at create time —
   *  the cycle check belongs to `setParent()`. */
  async create(
    dto: CreateOrganizationalStructureNodeDto,
  ): Promise<OrganizationalStructureNodeDocument> {
    if (dto.parentNodeId) {
      await this.assertNodeExists(dto.parentNodeId);
    }

    return this.repository.create({
      title: dto.title,
      parentNodeId: dto.parentNodeId ? new Types.ObjectId(dto.parentNodeId) : null,
      displayOrder: dto.displayOrder,
      nodeType: dto.nodeType,
      publicationState: dto.publicationState,
      federationAppointmentId: dto.federationAppointmentId
        ? new Types.ObjectId(dto.federationAppointmentId)
        : null,
    });
  }

  async findAll(): Promise<OrganizationalStructureNodeDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<OrganizationalStructureNodeDocument | null> {
    return this.repository.findById(id);
  }

  /** Re-parents a node, rejecting any move that would create a cycle.
   *  Pass a null/absent `parentNodeId` to detach the node to the root.
   *  @throws NotFoundException when the node or the new parent is missing.
   *  @throws BadRequestException when the node would become its own parent
   *  or its own ancestor. */
  async setParent(
    id: string,
    dto: SetParentNodeDto,
  ): Promise<OrganizationalStructureNodeDocument | null> {
    await this.assertNodeExists(id);

    if (!dto.parentNodeId) {
      return this.repository.updateById(id, { parentNodeId: null });
    }
    if (dto.parentNodeId === id) {
      throw new BadRequestException('A node cannot be its own parent.');
    }
    await this.assertNodeExists(dto.parentNodeId);
    await assertNotDescendant(
      id,
      dto.parentNodeId,
      async (nodeId) => {
        const node = await this.repository.findById(nodeId);
        return node?.parentNodeId ? node.parentNodeId.toString() : null;
      },
      'Organizational structure node',
    );

    return this.repository.updateById(id, { parentNodeId: new Types.ObjectId(dto.parentNodeId) });
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule). */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot(
      'organizationalStructure',
      new Types.ObjectId(id),
    );
  }

  /** @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable(
      'organizationalStructure',
      new Types.ObjectId(id),
    );
  }

  async remove(
    id: string,
    archivedBy: Types.ObjectId,
  ): Promise<OrganizationalStructureNodeDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  private async assertNodeExists(id: string): Promise<OrganizationalStructureNodeDocument> {
    const node = await this.repository.findById(id);
    if (!node) {
      throw new NotFoundException(`Organizational structure node ${id} not found.`);
    }
    return node;
  }
}
