import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectTestDatabase, disconnectTestDatabase } from '../../test/utils/mongo-memory-server.js';
import {
  applyPresidentMessageMigration,
  planPresidentMessageMigration,
  plainTextToRichText,
} from './migrate-president-message-v2.js';
import { validateRichText } from '../common/rich-text/validate-rich-text.js';

/**
 * The data half of ADR-0069: `messageBody` stops being two plain strings.
 *
 * The rule the tests exist to hold is the refusal — a row carrying `goals`
 * is reported and left exactly as it is. Converting one would mean choosing
 * an icon for each entry, and a machine choosing editorial icons is inventing
 * content, which is the same failure as inventing the missing copy.
 */
describe('presidentMessagePage v2 migration', () => {
  let server: MongoMemoryServer;

  const raw = () => mongoose.connection.db!.collection('presidentMessagePage');

  const row = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    federationAppointmentId: new Types.ObjectId(),
    heroTitle: { ar: 'كلمة الرئيس', en: "President's Message" },
    heroSubtitle: { ar: 'رئيس الاتحاد', en: 'President' },
    messageBody: { ar: 'فقرة أولى\n\nفقرة ثانية', en: 'First\n\nSecond' },
    signatoryName: { ar: 'الاسم', en: 'The Name' },
    signatoryTitle: { ar: 'رئيس الاتحاد', en: 'President' },
    publicationState: 'Draft',
    archivedAt: null,
    ...overrides,
  });

  beforeAll(async () => {
    server = await connectTestDatabase();
  });

  beforeEach(async () => {
    await mongoose.connection.db!.dropCollection('presidentMessagePage').catch(() => undefined);
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  describe('plainTextToRichText', () => {
    it('splits on blank lines, one paragraph per block', () => {
      const doc = plainTextToRichText('One\n\nTwo\n\nThree');

      expect((doc.content as unknown[]).length).toBe(3);
      expect(doc).toEqual({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'One' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Two' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Three' }] },
        ],
      });
    });

    it('keeps a single newline as a hard break rather than a new paragraph', () => {
      // Wrapped prose would otherwise become one paragraph per line.
      const doc = plainTextToRichText('Line one\nLine two');

      expect(doc.content).toEqual([
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Line one' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Line two' },
          ],
        },
      ]);
    });

    it('produces an empty document for empty text', () => {
      expect(plainTextToRichText('')).toEqual({ type: 'doc', content: [] });
      expect(plainTextToRichText('   \n\n  ')).toEqual({ type: 'doc', content: [] });
    });

    it('produces documents the allowlist accepts in both languages', () => {
      const arabic = plainTextToRichText('فقرة أولى\n\nفقرة ثانية');
      const english = plainTextToRichText('First\nwrapped\n\nSecond');

      expect(validateRichText(arabic, 'ar')).toEqual([]);
      expect(validateRichText(english, 'en')).toEqual([]);
    });
  });

  describe('plan', () => {
    it('reports the conversion and the defaults a legacy row needs', async () => {
      await raw().insertOne(row());

      const plan = await planPresidentMessageMigration(mongoose.connection);

      expect(plan.rows).toHaveLength(1);
      expect(plan.rows[0].convert.sort()).toEqual(['ar', 'en']);
      expect(plan.rows[0].paragraphs).toEqual({ ar: 2, en: 2 });
      expect(plan.rows[0].defaults.sort()).toEqual(
        ['featuredImageId', 'pullQuote', 'seo', 'values', 'valuesTitle'].sort(),
      );
      expect(plan.convertible).toBe(1);
      expect(plan.blocked).toBe(0);
    });

    it('blocks a row carrying goals', async () => {
      await raw().insertOne(
        row({ goals: [{ title: { ar: 'هدف', en: 'Goal' }, description: { ar: 'د', en: 'd' }, displayOrder: 1 }] }),
      );

      const plan = await planPresidentMessageMigration(mongoose.connection);

      expect(plan.blocked).toBe(1);
      expect(plan.convertible).toBe(0);
      expect(plan.rows[0].blockedByGoals).toBe(1);
    });

    it('leaves a row that is already in the new shape out of the plan', async () => {
      await raw().insertOne(
        row({
          messageBody: { ar: plainTextToRichText('نص'), en: plainTextToRichText('Text') },
          featuredImageId: null,
          pullQuote: null,
          valuesTitle: null,
          values: [],
          seo: null,
        }),
      );

      const plan = await planPresidentMessageMigration(mongoose.connection);

      expect(plan.rows).toEqual([]);
      expect(plan.untouched).toBe(1);
    });

    it('writes nothing', async () => {
      await raw().insertOne(row());
      const before = await raw().find({}).toArray();

      await planPresidentMessageMigration(mongoose.connection);

      expect(await raw().find({}).toArray()).toEqual(before);
    });
  });

  describe('apply', () => {
    it('converts both bodies, defaults the new fields and drops goals', async () => {
      const document = row({ goals: [] });
      await raw().insertOne(document);

      const plan = await planPresidentMessageMigration(mongoose.connection);
      const result = await applyPresidentMessageMigration(mongoose.connection, plan);

      expect(result).toEqual({ converted: 1, skipped: 0 });

      const after = (await raw().findOne({ _id: document._id }))!;
      expect((after.messageBody as Record<string, { type: string }>).ar.type).toBe('doc');
      expect((after.messageBody as Record<string, { type: string }>).en.type).toBe('doc');
      expect(after.goals).toBeUndefined();
      expect(after.values).toEqual([]);
      expect(after.pullQuote).toBeNull();
      expect(after.seo).toBeNull();
    });

    it('leaves a blocked row completely untouched, goals included', async () => {
      const goals = [{ title: { ar: 'هدف', en: 'Goal' }, description: { ar: 'د', en: 'd' }, displayOrder: 1 }];
      const document = row({ goals });
      await raw().insertOne(document);

      const plan = await planPresidentMessageMigration(mongoose.connection);
      const result = await applyPresidentMessageMigration(mongoose.connection, plan);

      expect(result).toEqual({ converted: 0, skipped: 1 });

      const after = (await raw().findOne({ _id: document._id }))!;
      expect(after.goals).toEqual(goals);
      expect(typeof (after.messageBody as Record<string, unknown>).ar).toBe('string');
    });

    it('is safe to run twice', async () => {
      await raw().insertOne(row());

      const first = await planPresidentMessageMigration(mongoose.connection);
      await applyPresidentMessageMigration(mongoose.connection, first);
      const afterFirst = await raw().find({}).toArray();

      const second = await planPresidentMessageMigration(mongoose.connection);
      await applyPresidentMessageMigration(mongoose.connection, second);

      expect(second.rows).toEqual([]);
      expect(await raw().find({}).toArray()).toEqual(afterFirst);
    });

    it('produces bodies the allowlist accepts', async () => {
      const document = row();
      await raw().insertOne(document);

      const plan = await planPresidentMessageMigration(mongoose.connection);
      await applyPresidentMessageMigration(mongoose.connection, plan);

      const after = (await raw().findOne({ _id: document._id }))!;
      const body = after.messageBody as Record<string, unknown>;
      expect(validateRichText(body.ar, 'ar')).toEqual([]);
      expect(validateRichText(body.en, 'en')).toEqual([]);
    });
  });
});
