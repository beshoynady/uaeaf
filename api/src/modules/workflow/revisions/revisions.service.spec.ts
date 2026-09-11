import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import mongoose, { Types } from 'mongoose';
import type { Connection, Model } from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';
import { RevisionsService } from './revisions.service.js';
import { RevisionsRepository } from './revisions.repository.js';
import { Revision, RevisionSchema } from './schemas/revision.schema.js';
import {
  VisionMissionPage,
  VisionMissionPageSchema,
} from '../../federation-governance/vision-mission-page/schemas/vision-mission-page.schema.js';

describe('RevisionsService', () => {
  describe('create', () => {
    let server: MongoMemoryServer;
    let service: RevisionsService;
    let repository: RevisionsRepository;
    let pages: Model<unknown>;
    let revisions: Model<Revision>;
    const createdBy = new Types.ObjectId();
    const editor = new Types.ObjectId();

    beforeAll(async () => {
      server = await connectTestDatabase();
      pages = mongoose.connection.model(VisionMissionPage.name, VisionMissionPageSchema) as Model<unknown>;
      revisions = mongoose.connection.model<Revision>(Revision.name, RevisionSchema);
      await revisions.ensureIndexes();
      repository = new RevisionsRepository(revisions as never);
      service = new RevisionsService(repository, mongoose.connection);
    });

    afterEach(async () => {
      jest.restoreAllMocks();
      await clearTestDatabase();
    });

    afterAll(async () => {
      await disconnectTestDatabase(server);
    });

    const storePage = (overrides: Record<string, unknown> = {}) =>
      pages.create({
        federationId: new Types.ObjectId(),
        heroTitle: { ar: 'الرؤية والرسالة', en: 'Vision and Mission' },
        heroSubtitle: { ar: 'ما نعمل من أجله', en: 'What we work towards' },
        visionText: { ar: 'الرؤية الأولى', en: 'First vision' },
        missionText: { ar: 'الرسالة الأولى', en: 'First mission' },
        publicationState: 'Draft',
        createdBy: editor,
        updatedBy: editor,
        ...overrides,
      }) as Promise<{ _id: Types.ObjectId }>;

    const freeze = (entityId: Types.ObjectId) =>
      service.create({ entityType: 'visionMissionPage', entityId, createdBy });

    /**
     * A revision freezes the record as it is stored — never a body the caller
     * sends. Once published, the snapshot is exactly what visitors are served,
     * so a caller-written snapshot could put text on the public site that no
     * reviewer ever saw in the record they approved.
     */
    describe('the snapshot is read from the record', () => {
      it('freezes the content that is stored', async () => {
        const record = await storePage();

        const revision = await freeze(record._id);

        expect(revision.snapshotData).toMatchObject({
          heroTitle: { ar: 'الرؤية والرسالة', en: 'Vision and Mission' },
          visionText: { ar: 'الرؤية الأولى', en: 'First vision' },
          missionText: { ar: 'الرسالة الأولى', en: 'First mission' },
        });
        expect(String(revision.snapshotData._id)).toBe(String(record._id));
      });

      it('leaves out who edited the record and the workflow bookkeeping', async () => {
        const record = await storePage({ revisionId: new Types.ObjectId() });

        const revision = await freeze(record._id);

        for (const key of ['createdBy', 'updatedBy', 'archivedAt', 'archivedBy', 'publicationState', 'revisionId', '__v']) {
          expect(revision.snapshotData).not.toHaveProperty(key);
        }
      });

      it('keeps what it froze when the record changes afterwards', async () => {
        const record = await storePage();
        const first = await freeze(record._id);

        await pages.updateOne({ _id: record._id }, { $set: { 'visionText.en': 'Second vision' } });
        const second = await freeze(record._id);

        const firstAgain = await service.findById(first._id.toString());
        expect(firstAgain?.snapshotData).toMatchObject({ visionText: { en: 'First vision' } });
        expect(second.snapshotData).toMatchObject({ visionText: { en: 'Second vision' } });
        expect([first.versionNumber, second.versionNumber]).toEqual([1, 2]);
      });

      it('refuses a record that does not exist', async () => {
        await expect(freeze(new Types.ObjectId())).rejects.toThrow(NotFoundException);
      });

      it('refuses an archived record', async () => {
        const record = await storePage({ archivedAt: new Date(), archivedBy: editor });

        await expect(freeze(record._id)).rejects.toThrow(NotFoundException);
      });

      it('refuses a type that has no collection to read from', async () => {
        await expect(
          service.create({ entityType: 'articles', entityId: new Types.ObjectId(), createdBy }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    /**
     * Two submissions of one record can both read the same latest number
     * before either is saved. Only one of them may keep it: a version number
     * names one exact text in the record's history.
     */
    describe('two submissions of one record at once', () => {
      /** Answers the next read of the latest revision as if none were saved
       *  yet — what the slower of two simultaneous submissions sees. */
      const readStaleOnce = () => jest.spyOn(repository, 'findLatest').mockResolvedValueOnce(null);

      it('gives the later one the next number', async () => {
        const record = await storePage();
        await freeze(record._id);
        readStaleOnce();

        const later = await freeze(record._id);

        expect(later.versionNumber).toBe(2);
        const saved = await revisions.find({ entityId: record._id }).sort({ versionNumber: 1 }).lean();
        expect(saved.map((revision) => revision.versionNumber)).toEqual([1, 2]);
      });

      it('answers with a conflict after five attempts that each find the number taken', async () => {
        const record = await storePage();
        await freeze(record._id);
        const findLatest = jest.spyOn(repository, 'findLatest').mockResolvedValue(null);

        await expect(freeze(record._id)).rejects.toThrow(ConflictException);
        expect(findLatest).toHaveBeenCalledTimes(5);
      });

      it('does not retry a failure that is not a taken number', async () => {
        const record = await storePage();
        const failure = new Error('connection reset');
        const create = jest.spyOn(repository, 'create').mockRejectedValueOnce(failure);

        await expect(freeze(record._id)).rejects.toBe(failure);
        expect(create).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('assertHardDeletable', () => {
    const entityType = 'visionMissionPage' as const;
    const entityId = new Types.ObjectId();

    const makeService = (count: number) => {
      const repository = { countForEntity: jest.fn(async () => count) } as unknown as RevisionsRepository;
      return new RevisionsService(repository, {} as Connection);
    };

    it('passes when the entity has zero revisions', async () => {
      await expect(makeService(0).assertHardDeletable(entityType, entityId)).resolves.toBeUndefined();
    });

    it('throws when the entity has at least one revision, even just one', async () => {
      await expect(makeService(1).assertHardDeletable(entityType, entityId)).rejects.toThrow(ForbiddenException);
    });
  });
});
