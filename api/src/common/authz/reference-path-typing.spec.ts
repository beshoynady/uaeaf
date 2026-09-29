import mongoose, { Types } from 'mongoose';
import type { Schema } from 'mongoose';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { declaredOn, walkPaths } from './media-references.js';
import type { WalkableType } from './media-references.js';

/**
 * Every stored reference is a real `ObjectId` path, not an untyped one.
 *
 * `@nestjs/mongoose` recognises a declared type as a Mongoose type only when
 * its prototype chain reaches `mongoose.SchemaType`
 * (`definitions.factory.js: isMongooseSchemaType`). `Types.ObjectId` is the
 * **bson** class, whose chain does not, so Nest treats it as an ordinary
 * nested class, builds an empty definition from it, and hands Mongoose
 * `{ type: {} }`. The path that results is `Mixed`: Mongoose casts nothing on
 * the way in and nothing inside a filter. A `PATCH` passing a raw string then
 * stores a string, and because MongoDB compares the BSON type before the
 * value, an `ObjectId` filter never matches it again. The reference is still
 * there and every query says it is not.
 *
 * `mongoose.Schema.Types.ObjectId` — the schema-layer class, imported in the
 * schemas as `MongooseSchema` because `Schema` is also the `@nestjs/mongoose`
 * class decorator — is on that prototype chain and yields a real `ObjectId`
 * path. That spelling is the rule, and this guard is what keeps it.
 *
 * Two readings, because each covers what the other cannot:
 *
 *  1. **The cast** — what the path would actually do to a stored value. The
 *     only runtime reading that survives measurement: on this project's
 *     mongoose an array path declared through Nest has `caster` and
 *     `$embeddedSchemaType` both `undefined` whether it is sound or broken, so
 *     an assertion on the element's `instance` distinguishes nothing and an
 *     assertion on `instance` alone reads `Array` either way. `cast()` does
 *     distinguish: sound returns an `ObjectId`, broken hands the hex string
 *     back as a `String`.
 *  2. **The source text** — because the runtime declaration cannot tell the
 *     defect from a deliberate `Mixed` path. Measured: `type: Object`, which
 *     five paths declare on purpose, collapses to the same `{}` that
 *     `type: Types.ObjectId` does. So `{}` is checked against those five by
 *     name, in both directions, and the wrong spelling is refused in the text
 *     as well — which is also the reading that catches an ObjectId path
 *     carrying no `ref` at all.
 *
 * Reads the project's own `*.schema.ts` files with no database, so a `@Prop`
 * declared the old way tomorrow is a red test rather than a silently untyped
 * path. Registered in `scripts/test-guards.mjs` (core tier) and
 * `docs/engineering/guard-tests.md`.
 */
const SRC = fileURLToPath(new URL('../../', import.meta.url));

/** A well-formed id that is nobody's document — only its type is read. */
const PROBE_ID = '68d000000000000000000001';

/** The spellings that produce an untyped path, and the one that does not. */
const WRONG_SPELLINGS = ['type: Types.ObjectId', 'type: [Types.ObjectId]'];
const RIGHT_SPELLING = 'MongooseSchema.Types.ObjectId';

/**
 * The paths that declare `type: Object` on purpose, each a free-form document
 * rather than a reference.
 *
 * Named because the runtime cannot tell them apart from the defect: Nest
 * collapses `Object` to `{}` exactly as it collapses `Types.ObjectId`. Both
 * directions are checked, so an entry that stops naming a live path fails this
 * guard rather than sitting here as an excuse.
 */
const MIXED_BY_DESIGN: readonly { label: string; reason: string }[] = [
  {
    label: 'PageSectionSchema.filters',
    reason: "The server-side query configuration for AUTOMATIC mode — category, count, date window. Free-form JSON, no closed shape.",
  },
  {
    label: 'PageSectionSchema.configuration',
    reason: 'Per-section presentation settings, whose shape depends on the section type. Free-form JSON.',
  },
  {
    label: 'AuditLogSchema.previousValue',
    reason: "The before-image of a changed record. Any record's shape, so no schema can be declared for it.",
  },
  {
    label: 'AuditLogSchema.newValue',
    reason: 'The after-image of the same change, for the same reason.',
  },
  {
    label: 'RevisionSchema.snapshotData',
    reason: 'A frozen copy of a whole record, kept so a publication can be restored to it.',
  },
];

const sourceFiles = async (dir: string, suffix: string): Promise<string[]> => {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path, suffix)));
    else if (entry.name.endsWith(suffix)) found.push(path);
  }
  return found;
};

/**
 * Every schema the project declares, embedded ones included.
 *
 * Every exported schema rather than only the collection-backed roots: an
 * embedded schema is reached by the walk from its parent, but one whose parent
 * is not wired up yet would be swept by nothing, and its props are as able to
 * be declared wrongly as any other's.
 */
const files = await sourceFiles(SRC, '.schema.ts');
const schemas: { name: string; schema: Schema }[] = [];
for (const file of files) {
  const module = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  for (const [exported, value] of Object.entries(module)) {
    if (!(value instanceof mongoose.Schema)) continue;
    if (schemas.some((entry) => entry.schema === value)) continue;
    schemas.push({ name: exported, schema: value as Schema });
  }
}

interface Found {
  label: string;
  instance: string;
  declared: string;
  /** What a stored id would become on this path. */
  cast: string;
}

/** What `type:` was declared as, named the way a reader can act on. */
const describeDeclared = (declared: unknown): string => {
  if (Array.isArray(declared)) return `[${describeDeclared(declared[0])}]`;
  if (typeof declared === 'function') return declared.name || 'anonymous function';
  if (typeof declared === 'object' && declared !== null) {
    const keys = Object.getOwnPropertyNames(declared);
    return keys.length === 0 ? '{}' : `{ ${keys.join(', ')} }`;
  }
  return String(declared);
};

/** A path that refuses the probe is reported as its error, never skipped. */
const describeCast = (type: WalkableType): string => {
  if (typeof type.cast !== 'function') return 'no cast';
  try {
    const value = type.cast(type.instance === 'Array' ? [PROBE_ID] : PROBE_ID);
    const single = Array.isArray(value) ? value[0] : value;
    if (single instanceof Types.ObjectId) return 'ObjectId';
    return single === null || single === undefined ? String(single) : (single.constructor?.name ?? typeof single);
  } catch (error) {
    return `threw ${error instanceof Error ? error.name : 'unknown'}`;
  }
};

const found = (name: string, path: string, type: WalkableType): Found => ({
  label: `${name}.${path}`,
  instance: type.instance ?? 'unknown',
  declared: describeDeclared(type.options?.type),
  cast: describeCast(type),
});

const isEmptyObject = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getOwnPropertyNames(value).length === 0;

/** The declaration Nest produces from a class it does not recognise, which is
 *  `Types.ObjectId` and also a deliberate `Object`. */
const isEmptyDeclaration = (type: WalkableType): boolean => {
  const declared = type.options?.type;
  return isEmptyObject(declared) || (Array.isArray(declared) && isEmptyObject(declared[0]));
};

const isReference = (type: WalkableType): boolean =>
  declaredOn(type, 'ref').length > 0 || declaredOn(type, 'refPath').length > 0;

const collect = (matches: (type: WalkableType) => boolean): Found[] => {
  const seen = new Map<string, Found>();
  for (const { name, schema } of schemas) {
    walkPaths(schema, (path, type) => {
      if (matches(type)) seen.set(`${name}.${path}`, found(name, path, type));
    });
  }
  return [...seen.values()];
};

const references = collect(isReference);

describe('every stored reference resolves to a real ObjectId path', () => {
  // Guards the guard: discovery is an import sweep, so a renamed export or an
  // import that stopped resolving would leave every check below sweeping
  // nothing and reporting green — the exact silent pass this file exists to
  // prevent.
  it('finds the schemas and the references they declare', () => {
    expect(files.length).toBeGreaterThanOrEqual(90);
    expect(schemas.length).toBeGreaterThanOrEqual(120);
    expect(references.length).toBeGreaterThanOrEqual(350);
    expect(references.map((entry) => entry.label)).toContain('UserSchema.personId');
    expect(references.map((entry) => entry.label)).toContain('WorkflowStepSchema.assigneeIds');
    expect(references.filter((entry) => entry.instance === 'Array').length).toBeGreaterThanOrEqual(7);
  });

  it('casts a stored id to an ObjectId on every reference path', () => {
    expect(references.filter((entry) => entry.cast !== 'ObjectId')).toEqual([]);
  });

  // Separate from the cast so a failure names the untyped paths rather than
  // being folded in with a path that is typed as something else entirely.
  it('leaves no reference path untyped', () => {
    expect(references.filter((entry) => entry.instance === 'Mixed')).toEqual([]);
  });

  it('declares an empty object only on the paths that mean it', () => {
    const excused = new Set(MIXED_BY_DESIGN.map((entry) => entry.label));

    expect(collect(isEmptyDeclaration).filter((entry) => !excused.has(entry.label))).toEqual([]);
  });

  // The other direction. An entry naming nothing live is a list rotting into a
  // box of excuses, which is how a guard stops guarding.
  it('excuses no empty declaration the schemas no longer make', () => {
    const live = new Set(collect(isEmptyDeclaration).map((entry) => entry.label));

    expect(MIXED_BY_DESIGN.filter((entry) => !live.has(entry.label))).toEqual([]);
    expect(MIXED_BY_DESIGN.filter((entry) => entry.reason.trim().length <= 20)).toEqual([]);
  });

  // The text, because a bare id array with no `ref` is a reference the runtime
  // checks above never look at, and it is broken in exactly the same way.
  it('writes the schema-layer spelling in every schema file', async () => {
    const offending: { file: string; line: number; text: string }[] = [];
    for (const file of files) {
      const lines = (await readFile(file, 'utf8')).split('\n');
      lines.forEach((text, index) => {
        if (WRONG_SPELLINGS.some((wrong) => text.includes(wrong))) {
          offending.push({ file: file.slice(SRC.length).replaceAll('\\', '/'), line: index + 1, text: text.trim() });
        }
      });
    }

    expect(offending).toEqual([]);
  });

  it('writes that spelling somewhere, so the check above cannot pass on an empty sweep', async () => {
    const declaring: string[] = [];
    for (const file of files) {
      if ((await readFile(file, 'utf8')).includes(RIGHT_SPELLING)) declaring.push(file);
    }

    expect(declaring.length).toBeGreaterThanOrEqual(50);
  });
});
