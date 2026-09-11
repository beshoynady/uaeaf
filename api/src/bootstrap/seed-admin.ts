import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { PERMISSION_CATALOGUE } from '../common/constants/permission-catalogue.js';
import type { Permission } from '../modules/platform-administration/permissions/schemas/permission.schema.js';
import type { Role } from '../modules/platform-administration/roles/schemas/role.schema.js';
import type { User } from '../modules/platform-administration/users/schemas/user.schema.js';

/**
 * The seeding logic behind `npm run bootstrap:admin`, separated from the
 * entry point so it can be exercised against a real MongoDB in the test
 * suite rather than only by running it by hand against a live cluster.
 *
 * Idempotency is the property that actually matters here — this is meant to
 * be re-run on every deploy to pick up newly added permissions — and
 * idempotency is not something a single manual run can demonstrate.
 */
export interface BootstrapModels {
  permissions: Model<Permission>;
  roles: Model<Role>;
  users: Model<User>;
}

export interface BootstrapResult {
  permissionCount: number;
  roleId: Types.ObjectId;
  /** False when the account already existed and was deliberately left alone. */
  userCreated: boolean;
}

/** Matches `CreateUserDto`'s own `@MinLength(12)`. The bootstrap account is
 *  the most privileged on the platform, so it is held to at least the same
 *  bar the API applies to every other account. */
export const MIN_PASSWORD_LENGTH = 12;

export interface BootstrapAdminInput {
  email: string;
  password: string;
  nameEn: string;
  nameAr: string;
}

/**
 * Reads the first administrator from the environment for both
 * `bootstrap:admin` and `seed:dev`, so the two cannot disagree about what a
 * valid administrator is. Errors name the variable and never repeat the
 * value — these scripts print to terminals and deploy logs.
 */
export function readBootstrapAdminInput(env: Record<string, string | undefined>): BootstrapAdminInput {
  const required = (name: string): string => {
    const value = env[name];
    if (!value) throw new Error(`${name} is required.`);
    return value;
  };

  const email = required('BOOTSTRAP_ADMIN_EMAIL').trim().toLowerCase();
  const password = required('BOOTSTRAP_ADMIN_PASSWORD');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`BOOTSTRAP_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  return {
    email,
    password,
    nameEn: env.BOOTSTRAP_ADMIN_NAME_EN || 'Platform Administrator',
    nameAr: env.BOOTSTRAP_ADMIN_NAME_AR || 'مسؤول المنصة',
  };
}

const SUPER_ADMIN_ROLE = {
  en: 'Super Admin',
  ar: 'مسؤول عام',
};

const SUPER_ADMIN_DESCRIPTION = {
  en: 'Holds every permission the platform defines. Created by the bootstrap script; cannot be renamed or deleted.',
  ar: 'يملك كل صلاحيات المنصة. أُنشئ عبر سكربت التهيئة، ولا يمكن إعادة تسميته أو حذفه.',
};

const PASSWORD_HASH_ROUNDS = 10;

/**
 * The eight actions, in Arabic. Deliberately the only part of a permission
 * label that gets translated: `resourceType` values are technical
 * identifiers from the API source (`aboutFederationPage`, `mediaAssets`)
 * with no agreed Arabic terminology yet, and inventing 63 of them here
 * would be exactly the kind of unapproved copy CLAUDE.md §12 forbids.
 *
 * So these labels are machine-generated placeholders, and they say so: the
 * authoritative meaning of a permission is its (resourceType, action) pair,
 * which the dashboard shows in its own two columns. Replacing them with
 * approved bilingual copy is an open item, not a hidden assumption.
 */
const ACTION_LABELS_AR: Record<string, string> = {
  Create: 'إنشاء',
  Read: 'قراءة',
  Update: 'تعديل',
  Delete: 'حذف',
  HardDelete: 'حذف نهائي',
  Approve: 'اعتماد',
  Publish: 'نشر',
  EditProtectedData: 'تعديل بيانات محمية',
  Export: 'تصدير',
};

/**
 * Upserts one row per catalogue entry, keyed on the (resourceType, action)
 * pair — the pair, not the label, is the identity, so re-running after a
 * label change updates in place instead of duplicating.
 *
 * `$setOnInsert` for the name: an administrator who has renamed a permission
 * in the dashboard should not have that overwritten by the next deploy's
 * bootstrap run.
 */
export async function seedPermissions(model: Model<Permission>): Promise<Types.ObjectId[]> {
  await model.bulkWrite(
    PERMISSION_CATALOGUE.map((entry) => ({
      updateOne: {
        filter: { resourceType: entry.resourceType, action: entry.action },
        update: {
          $setOnInsert: {
            name: {
              en: `${splitCamelCase(entry.action)} ${splitCamelCase(entry.resourceType)}`,
              ar: `${ACTION_LABELS_AR[entry.action] ?? entry.action} — ${entry.resourceType}`,
            },
          },
        },
        upsert: true,
      },
    })),
  );

  const stored = await model
    .find({
      $or: PERMISSION_CATALOGUE.map((entry) => ({
        resourceType: entry.resourceType,
        action: entry.action,
      })),
    })
    .select('_id')
    .exec();

  return stored.map((permission) => permission._id as Types.ObjectId);
}

/** Always rewrites `permissionIds` to the full current catalogue: a Super
 *  Admin that silently lacks the permissions added in the last release is
 *  the failure this script is re-run to prevent. */
export async function seedSuperAdminRole(
  model: Model<Role>,
  permissionIds: Types.ObjectId[],
): Promise<Types.ObjectId> {
  const role = await model
    .findOneAndUpdate(
      { 'name.en': SUPER_ADMIN_ROLE.en, isSystemRole: true },
      {
        $set: { permissionIds },
        $setOnInsert: {
          name: SUPER_ADMIN_ROLE,
          description: SUPER_ADMIN_DESCRIPTION,
          isSystemRole: true,
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
    .exec();

  return role._id as Types.ObjectId;
}

/**
 * Creates the account only if it does not already exist.
 *
 * An existing account is left entirely alone — password, roles and status.
 * Re-assigning the role would look harmless, but this script runs on
 * deploy: quietly re-granting Super Admin to an account an administrator
 * had deliberately demoted would be a privilege escalation performed by
 * automation, which is precisely what the platform's own RBAC exists to
 * make impossible.
 */
export async function seedAdminUser(
  model: Model<User>,
  input: { email: string; password: string; nameEn: string; nameAr: string; roleId: Types.ObjectId },
): Promise<boolean> {
  const existing = await model.findOne({ email: input.email }).exec();
  if (existing) {
    return false;
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS);
  await model.create({
    name: {
      en: input.nameEn,
      ar: input.nameAr,
    },
    email: input.email,
    accountStatus: 'Active',
    roleIds: [input.roleId],
    authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
  });

  return true;
}

/** `aboutFederationPage` -> `about federation page`, `HardDelete` -> `Hard delete`. */
function splitCamelCase(value: string): string {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Runs the three steps in dependency order: permissions must exist before
 *  the role can reference them, and the role before the user can hold it. */
export async function runBootstrap(
  models: BootstrapModels,
  input: { email: string; password: string; nameEn: string; nameAr: string },
): Promise<BootstrapResult> {
  const permissionIds = await seedPermissions(models.permissions);
  const roleId = await seedSuperAdminRole(models.roles, permissionIds);
  const userCreated = await seedAdminUser(models.users, {
    email: input.email,
    password: input.password,
    nameEn: input.nameEn,
    nameAr: input.nameAr,
    roleId,
  });

  return { permissionCount: permissionIds.length, roleId, userCreated };
}
