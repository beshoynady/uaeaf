import mongoose, { type Schema } from 'mongoose';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Every schema that carries `BaseSchema`'s fields must keep `createdAt` and
 * `updatedAt`.
 *
 * `BaseSchema` cannot give them that itself. `@nestjs/mongoose` reads
 * `@Schema()` options from the exact class being compiled — fields declared
 * with `@Prop` are inherited, options are not — so a `timestamps` setting
 * on the base never reaches a subclass. Each schema therefore declares
 * `timestamps: true` in its own `@Schema({ ... })`, and nothing but this test
 * notices when a new one forgets.
 *
 * It checks the compiled schema, not the source text: whatever a file
 * writes, what matters is whether Mongoose will stamp the document.
 * Discovery is automatic — every `*.schema.ts` under `src` — so a schema
 * added tomorrow is covered without anyone registering it here.
 */
const SRC = fileURLToPath(new URL('../../', import.meta.url));
const BASE_FIELDS = ['createdBy', 'updatedBy', 'archivedAt', 'archivedBy'];
const EXTENDS_BASE = /^export class \w+ extends (BaseSchema|HeroPageSchema)\b/m;

async function schemaFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await schemaFiles(path)));
    else if (entry.name.endsWith('.schema.ts')) found.push(path);
  }
  return found;
}

interface Discovered {
  label: string;
  file: string;
  schema: Schema;
}

const files = await schemaFiles(SRC);
const discovered: Discovered[] = [];
for (const file of files) {
  const module = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  for (const [name, value] of Object.entries(module)) {
    if (!(value instanceof mongoose.Schema)) continue;
    if (!BASE_FIELDS.every((field) => value.path(field))) continue;
    discovered.push({ label: `${relative(SRC, file).replace(/\\/g, '/')} → ${name}`, file, schema: value });
  }
}

describe('timestamps on every schema built on BaseSchema', () => {
  it('finds a compiled schema in every file that declares one', async () => {
    // Guards the guard: if discovery broke — an import that stopped
    // resolving, an export that was renamed — the checks below would pass
    // over nothing and still report green.
    const declaring: string[] = [];
    for (const file of files) {
      if (EXTENDS_BASE.test(await readFile(file, 'utf8'))) declaring.push(file);
    }
    const covered = new Set(discovered.map((item) => item.file));

    expect(declaring.length).toBeGreaterThan(0);
    expect(declaring.filter((file) => !covered.has(file))).toEqual([]);
  });

  it.each(discovered.map((item) => [item.label, item.schema] as const))('%s keeps createdAt', (_label, schema) => {
    expect(schema.path('createdAt')).toBeDefined();
  });

  it.each(discovered.map((item) => [item.label, item.schema] as const))(
    '%s keeps updatedAt, unless it explicitly records creation only',
    (_label, schema) => {
      const option = schema.get('timestamps') as { updatedAt?: unknown } | boolean | undefined;
      if (typeof option === 'object' && option.updatedAt === false) return;
      expect(schema.path('updatedAt')).toBeDefined();
    },
  );
});
