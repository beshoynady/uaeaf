import type { Model, Types } from 'mongoose';
import { ROLE_TEMPLATES, type RoleTemplate } from '../common/authz/role-templates.js';
import type { PermissionCatalogueEntry } from '../common/constants/permission-catalogue.js';
import type { Permission } from '../modules/platform-administration/permissions/schemas/permission.schema.js';
import type { Role } from '../modules/platform-administration/roles/schemas/role.schema.js';

export interface SeedModels {
  permissions: Model<Permission>;
  roles: Model<Role>;
}

/** What one run did, per template key. */
export interface SeedTemplatesReport {
  created: string[];
  untouched: string[];
  /** Named and not seeded, with the reason. */
  refused: { key: string; reason: string }[];
  /** Template pairs with no row in `permissions`; non-empty means nothing was written. */
  unresolvedPairs: string[];
}

const OWN_SCOPE_REASON =
  'Grants an own-scoped pair: the permission catalogue has no scoped row, and the guard refuses any grant whose ' +
  'scope is not all or null (scopedGrantUnsupported), so the role could do nothing.';

const pairKey = (resourceType: string, action: string): string => `${resourceType}:${action}`;

const pairsOf = (templates: readonly RoleTemplate[]): PermissionCatalogueEntry[] => {
  const pairs = templates.flatMap((template) =>
    template.grants.flatMap((grant) =>
      grant.resources.flatMap((resourceType) => grant.actions.map((action) => ({ resourceType, action }))),
    ),
  );
  return [...new Map(pairs.map((pair) => [pairKey(pair.resourceType, pair.action), pair])).values()];
};

/** Creates each role template whose key no role carries, archived roles included, and never changes an
 *  existing one. Writes nothing when any template pair has no permission row. See ADR-0113. */
export const seedRoleTemplates = async (models: SeedModels): Promise<SeedTemplatesReport> => {
  const refused = ROLE_TEMPLATES.filter((t) => t.grants.some((grant) => grant.scope === 'own')).map((t) => ({
    key: t.key,
    reason: OWN_SCOPE_REASON,
  }));
  const seedable = ROLE_TEMPLATES.filter((t) => !refused.some((r) => r.key === t.key));

  const wanted = pairsOf(seedable);
  const rows = await models.permissions
    .find({ $or: wanted.map(({ resourceType, action }) => ({ resourceType, action })) })
    .select('_id resourceType action')
    .lean()
    .exec();
  const idOf = new Map(rows.map((row) => [pairKey(row.resourceType, row.action), row._id as Types.ObjectId]));

  const unresolvedPairs = wanted
    .map((pair) => pairKey(pair.resourceType, pair.action))
    .filter((pair) => !idOf.has(pair));
  if (unresolvedPairs.length > 0) {
    return { created: [], untouched: [], refused, unresolvedPairs };
  }

  const now = new Date();
  const result = await models.roles.bulkWrite(
    seedable.map((template) => ({
      updateOne: {
        filter: { templateKey: template.key },
        update: {
          $setOnInsert: {
            name: template.name,
            description: template.description,
            permissionIds: pairsOf([template]).map((pair) => idOf.get(pairKey(pair.resourceType, pair.action))!),
            isSystemRole: false,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
        // Timestamps would $set updatedAt on every existing template.
        timestamps: false,
      },
    })),
  );

  const insertedAt = new Set(Object.keys(result.upsertedIds).map(Number));
  return {
    created: seedable.filter((_, index) => insertedAt.has(index)).map((t) => t.key),
    untouched: seedable.filter((_, index) => !insertedAt.has(index)).map((t) => t.key),
    refused,
    unresolvedPairs: [],
  };
};
