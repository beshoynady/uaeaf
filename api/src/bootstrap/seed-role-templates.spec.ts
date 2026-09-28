import mongoose from 'mongoose';
import type { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../test/utils/mongo-memory-server.js';
import { ROLE_TEMPLATES } from '../common/authz/role-templates.js';
import { Permission, PermissionSchema } from '../modules/platform-administration/permissions/schemas/permission.schema.js';
import { Role, RoleSchema } from '../modules/platform-administration/roles/schemas/role.schema.js';
import { seedPermissions } from './seed-admin.js';
import { seedRoleTemplates, type SeedModels } from './seed-role-templates.js';

const SEEDED = [
  'content-manager',
  'reviewer-approver',
  'sports-data-officer',
  'governance-officer',
  'executive-viewer',
];

const templatePairs = (key: string): string[] => {
  const template = ROLE_TEMPLATES.find((t) => t.key === key)!;
  return [
    ...new Set(
      template.grants.flatMap((grant) =>
        grant.resources.flatMap((resource) => grant.actions.map((action) => `${resource}:${action}`)),
      ),
    ),
  ].sort();
};

describe('seedRoleTemplates', () => {
  let server: MongoMemoryServer;
  let models: SeedModels;

  const pairsHeldBy = async (templateKey: string): Promise<string[]> => {
    const role = await models.roles.findOne({ templateKey }).lean().exec();
    const held = await models.permissions
      .find({ _id: { $in: (role?.permissionIds ?? []) as Types.ObjectId[] } })
      .lean()
      .exec();
    return held.map((p) => `${p.resourceType}:${p.action}`).sort();
  };

  beforeAll(async () => {
    server = await connectTestDatabase();
    models = {
      permissions: mongoose.model<Permission>('Permission', PermissionSchema),
      roles: mongoose.model<Role>('Role', RoleSchema),
    };
    await models.roles.init();
  });

  beforeEach(async () => {
    await seedPermissions(models.permissions);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('creates the five seedable templates, each holding exactly its own pairs', async () => {
    const report = await seedRoleTemplates(models);

    expect([...report.created].sort()).toEqual([...SEEDED].sort());
    expect(report.untouched).toEqual([]);
    expect(report.unresolvedPairs).toEqual([]);
    expect(await models.roles.countDocuments()).toBe(5);
    for (const key of SEEDED) {
      expect(await pairsHeldBy(key)).toEqual(templatePairs(key));
    }
  });

  it('refuses the editor, names the own scope as the reason, and creates no role for it', async () => {
    const report = await seedRoleTemplates(models);

    expect(report.refused).toEqual([{ key: 'editor', reason: expect.stringMatching(/own/) }]);
    expect(report.created).not.toContain('editor');
    expect(await models.roles.countDocuments({ templateKey: 'editor' })).toBe(0);
    expect(await models.roles.countDocuments({ 'name.en': 'Editor' })).toBe(0);
  });

  it('seeds every template as an ordinary role', async () => {
    await seedRoleTemplates(models);

    expect(await models.roles.countDocuments({ isSystemRole: true })).toBe(0);
    expect(await models.roles.countDocuments({ isSystemRole: false })).toBe(5);
  });

  it('writes nothing on a second run', async () => {
    await seedRoleTemplates(models);
    const before = await models.roles.find().sort({ templateKey: 1 }).lean().exec();

    const second = await seedRoleTemplates(models);

    expect(second.created).toEqual([]);
    expect([...second.untouched].sort()).toEqual([...SEEDED].sort());
    expect(await models.roles.find().sort({ templateKey: 1 }).lean().exec()).toEqual(before);
  });

  it('does not duplicate a template an administrator has renamed', async () => {
    await seedRoleTemplates(models);
    await models.roles.updateOne(
      { templateKey: 'governance-officer' },
      { $set: { name: { en: 'Board Secretary', ar: 'أمين المجلس' } } },
    );

    const second = await seedRoleTemplates(models);

    expect(second.created).toEqual([]);
    expect(second.untouched).toContain('governance-officer');
    expect(await models.roles.countDocuments({ templateKey: 'governance-officer' })).toBe(1);
    expect(await models.roles.countDocuments({ 'name.en': 'Governance Officer' })).toBe(0);
  });

  it('neither recreates nor restores a template an administrator has archived', async () => {
    await seedRoleTemplates(models);
    const archivedAt = new Date('2026-09-01T00:00:00Z');
    await models.roles.updateOne({ templateKey: 'executive-viewer' }, { $set: { archivedAt } });

    const second = await seedRoleTemplates(models);

    expect(second.created).toEqual([]);
    expect(second.untouched).toContain('executive-viewer');
    const roles = await models.roles.find({ templateKey: 'executive-viewer' }).lean().exec();
    expect(roles).toHaveLength(1);
    expect(roles[0].archivedAt).toEqual(archivedAt);
  });

  it('does not overwrite an administrator’s edit to a template’s permissions', async () => {
    await seedRoleTemplates(models);
    await models.roles.updateOne({ templateKey: 'content-manager' }, { $set: { permissionIds: [] } });

    await seedRoleTemplates(models);

    const role = await models.roles.findOne({ templateKey: 'content-manager' }).lean().exec();
    expect(role?.permissionIds).toEqual([]);
  });

  it('does not take a hand-made role with a template’s name for the template', async () => {
    await models.roles.create({ name: { en: 'Content Manager', ar: 'مسؤول المحتوى' }, isSystemRole: false });

    const report = await seedRoleTemplates(models);

    expect(report.created).toContain('content-manager');
    expect(await models.roles.countDocuments({ templateKey: 'content-manager' })).toBe(1);
  });

  it('writes nothing at all when a template names a pair with no permission row, and names every such pair', async () => {
    await models.permissions.deleteOne({ resourceType: 'albums', action: 'Archive' });
    await models.permissions.deleteOne({ resourceType: 'governanceReports', action: 'ViewReports' });
    const before = await models.roles.countDocuments();

    const report = await seedRoleTemplates(models);

    expect([...report.unresolvedPairs].sort()).toEqual(['albums:Archive', 'governanceReports:ViewReports']);
    expect(report.created).toEqual([]);
    expect(report.untouched).toEqual([]);
    expect(await models.roles.countDocuments()).toBe(before);
  });
});
