import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { RevisionsRepository } from './revisions.repository.js';
import type { RevisionListRow } from './revisions.repository.js';
import type { RevisionDocument } from './schemas/revision.schema.js';
import type { PublicationEntityType } from '../../../common/constants/workflow-entity-types.js';
import { isDuplicateKeyError } from '../../../common/utils/mongo-errors.util.js';

/**
 * Fields a record carries that are not its content.
 *
 * Who edited it and when it was archived are `BaseSchema` bookkeeping, and a
 * revision records its own author in `createdBy`. `publicationState` and
 * `revisionId` are the workflow's pointers back onto the record. None of them
 * belongs in a snapshot — and a published snapshot is served to visitors
 * verbatim, so leaving the editors' user ids in it would publish them.
 */
export const NOT_CONTENT = [
  '__v',
  'createdBy',
  'updatedBy',
  'archivedAt',
  'archivedBy',
  'publicationState',
  'revisionId',
];

/**
 * How many times a revision is numbered before the submission is refused.
 *
 * An attempt fails only when another submission of the same record saved that
 * number first, and the next attempt reads past it. So five attempts are enough
 * for five submissions of one record arriving together — far more than an
 * editorial team produces at once.
 */
const NUMBERING_ATTEMPTS = 5;

/**
 * Implements: revisions collection, Domain 7 (FigJam node `100:7620`).
 * Immutable, permanent history — see `revisions.repository.ts` for why
 * this service (and its repository) exposes no update or delete method of
 * any kind, ever.
 */
@Injectable()
export class RevisionsService {
  constructor(
    private readonly repository: RevisionsRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Freezes the record as it is stored now.
   *
   * The caller names the record; it never supplies the content. What is
   * published is what visitors read, so a snapshot the caller wrote could put
   * text on the site that no reviewer saw in the record they approved.
   *
   * `versionNumber` is one more than the record's latest revision (1 if none
   * exists yet). Two submissions that read the same latest number cannot both
   * keep it — the revisions index is unique per record and number — so the one
   * refused reads again and takes the next.
   *
   * @throws BadRequestException when the entity type has no collection yet.
   * @throws NotFoundException when the record does not exist or is archived.
   * @throws ConflictException when every attempt found its number taken.
   */
  async create(input: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    createdBy: Types.ObjectId;
  }): Promise<RevisionDocument> {
    const snapshotData = await this.snapshotOf(input.entityType, input.entityId);
    for (let attempt = 1; ; attempt += 1) {
      const latest = await this.repository.findLatest(input.entityType, input.entityId);
      const versionNumber = (latest?.versionNumber ?? 0) + 1;
      try {
        return await this.repository.create({ ...input, snapshotData, versionNumber });
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
        if (attempt === NUMBERING_ATTEMPTS) {
          throw new ConflictException(
            `Other revisions of ${input.entityType} ${input.entityId.toString()} were being saved at the same moment. Submit again.`,
          );
        }
      }
    }
  }

  async findById(id: string): Promise<RevisionDocument | null> {
    return this.repository.findById(id);
  }

  async findLatest(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
  ): Promise<RevisionDocument | null> {
    return this.repository.findLatest(entityType, entityId);
  }

  /** One page of a record's history, newest first, without the snapshots. The
   *  caller joins publication status onto it — this service has no business
   *  knowing what became of a version, only that it exists. */
  async findForEntity(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
    skip: number,
    limit: number,
  ): Promise<{ items: RevisionListRow[]; total: number }> {
    return this.repository.findForEntity(entityType, entityId, skip, limit);
  }

  /**
   * BE-PLAN-010 Week 2 §10 (HardDelete gate): an entity in the
   * revision/publication list can only be HardDeleted while it has ZERO
   * `revisions` rows — even one, however old, blocks it. This is an
   * additional business-rule gate on top of (not a replacement for)
   * `permissions.action='HardDelete'` RBAC authorization; a future entity
   * module (Week 3/4) calls this before performing its own HardDelete.
   *
   * @throws ForbiddenException when at least one revision exists.
   */
  async assertHardDeletable(entityType: PublicationEntityType, entityId: Types.ObjectId): Promise<void> {
    const count = await this.repository.countForEntity(entityType, entityId);
    if (count > 0) {
      throw new ForbiddenException(
        `Cannot HardDelete ${entityType} ${entityId.toString()}: ${count} revision(s) exist. Archive is the only available option once any revision has been created.`,
      );
    }
  }

  /**
   * The stored record's content, read through the model registered for the
   * collection the entity type names. Each of the entity types is also its
   * collection's name, so the lookup needs no second list to keep in step —
   * and a type whose module is not built yet simply has no model to find.
   */
  private async snapshotOf(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
  ): Promise<Record<string, unknown>> {
    const model = Object.values(this.connection.models).find(
      (candidate) => candidate.collection.collectionName === entityType,
    );
    if (!model) {
      throw new BadRequestException(`${entityType} has no collection yet, so there is no record to freeze.`);
    }

    const record = await model.findOne({ _id: entityId, archivedAt: null }).lean<Record<string, unknown>>().exec();
    if (!record) {
      throw new NotFoundException(`${entityType} ${entityId.toString()} does not exist or is archived.`);
    }

    return Object.fromEntries(Object.entries(record).filter(([key]) => !NOT_CONTENT.includes(key)));
  }
}
