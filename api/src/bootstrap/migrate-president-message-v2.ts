import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { openDatabase } from './dev-database.js';

/**
 * Moves stored `presidentMessagePage` rows to the ADR-0069 shape.
 *
 * Two changes need data, not just a schema:
 *
 * 1. `messageBody` was two plain strings; it is now a ProseMirror document
 *    per language. A row left as strings would fail every read.
 * 2. `goals` is removed. Rows carrying goals are **refused, never
 *    converted**: `ContentBlock` has no icon and the new `values` list
 *    requires one, so a machine choosing icons would be inventing editorial
 *    content. A human moves those.
 *
 * The new optional fields are defaulted here rather than left missing, so a
 * read never has to distinguish "absent" from "empty".
 */
export interface MessageMigrationRow {
  id: string;
  /** Which language bodies still need converting. */
  convert: ('ar' | 'en')[];
  /** How many paragraphs each converted body will hold. */
  paragraphs: Record<string, number>;
  /** Fields that will be given their default because they are missing. */
  defaults: string[];
  /** Present and non-empty `goals` — the row is skipped entirely. */
  blockedByGoals: number;
}

export interface MessageMigrationPlan {
  rows: MessageMigrationRow[];
  convertible: number;
  blocked: number;
  untouched: number;
}

const NEW_FIELD_DEFAULTS: Record<string, unknown> = {
  featuredImageId: null,
  pullQuote: null,
  valuesTitle: null,
  values: [],
  seo: null,
};

/**
 * A plain string as a ProseMirror document: one paragraph per block
 * separated by a blank line, single newlines preserved as hard breaks.
 *
 * Blank-line splitting is how the stored text already marks a paragraph —
 * treating every single newline as a break instead would shatter wrapped
 * prose into one paragraph per line.
 */
export function plainTextToRichText(text: string): Record<string, unknown> {
  const blocks = text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  return {
    type: 'doc',
    content: blocks.map((block) => ({
      type: 'paragraph',
      content: block
        .split(/\r?\n/)
        .flatMap((line, index) =>
          index === 0 ? [{ type: 'text', text: line }] : [{ type: 'hardBreak' }, { type: 'text', text: line }],
        )
        .filter((node) => node.type !== 'text' || (node as { text: string }).text.length > 0),
    })),
  };
}

/** What the migration would write — and writes nothing. */
export async function planPresidentMessageMigration(
  connection: Connection,
): Promise<MessageMigrationPlan> {
  const db = await openDatabase(connection);
  const documents = await db.collection('presidentMessagePage').find({}).toArray();

  const rows: MessageMigrationRow[] = [];

  for (const document of documents) {
    const body = (document.messageBody ?? {}) as Record<string, unknown>;
    const convert: ('ar' | 'en')[] = [];
    const paragraphs: Record<string, number> = {};

    for (const lang of ['ar', 'en'] as const) {
      const value = body[lang];
      if (typeof value === 'string') {
        convert.push(lang);
        paragraphs[lang] = (plainTextToRichText(value).content as unknown[]).length;
      }
    }

    const goals = Array.isArray(document.goals) ? document.goals : [];
    const defaults = Object.keys(NEW_FIELD_DEFAULTS).filter((field) => document[field] === undefined);

    const untouched =
      convert.length === 0 && defaults.length === 0 && goals.length === 0 && document.goals === undefined;

    if (untouched) {
      continue;
    }

    rows.push({
      id: String(document._id),
      convert,
      paragraphs,
      defaults,
      blockedByGoals: goals.length,
    });
  }

  return {
    rows,
    convertible: rows.filter((row) => row.blockedByGoals === 0).length,
    blocked: rows.filter((row) => row.blockedByGoals > 0).length,
    untouched: documents.length - rows.length,
  };
}

/**
 * Applies the plan. Rows blocked by non-empty `goals` are left exactly as
 * they are — including their `goals` — so nothing is lost while a human
 * decides what those entries should become.
 */
export async function applyPresidentMessageMigration(
  connection: Connection,
  plan: MessageMigrationPlan,
): Promise<{ converted: number; skipped: number }> {
  const db = await openDatabase(connection);
  const collection = db.collection('presidentMessagePage');
  let converted = 0;

  for (const row of plan.rows) {
    if (row.blockedByGoals > 0) {
      continue;
    }

    const document = await collection.findOne({ _id: new Types.ObjectId(row.id) } as never);
    if (!document) {
      continue;
    }

    const body = (document.messageBody ?? {}) as Record<string, unknown>;
    const set: Record<string, unknown> = {};

    for (const lang of row.convert) {
      const value = body[lang];
      if (typeof value === 'string') {
        set[`messageBody.${lang}`] = plainTextToRichText(value);
      }
    }

    for (const field of row.defaults) {
      set[field] = NEW_FIELD_DEFAULTS[field];
    }

    const update: Record<string, unknown> = {};
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    // Only on a row whose goals are already empty — a blocked row never
    // reaches here, so no editorial content is dropped.
    if (document.goals !== undefined) {
      update.$unset = { goals: '' };
    }

    if (Object.keys(update).length > 0) {
      await collection.updateOne({ _id: document._id }, update);
      converted += 1;
    }
  }

  return { converted, skipped: plan.blocked };
}
