/** One output column: where to read it from, and what to call it. `key` is a
 *  dotted path so a localized `{ar,en}` sub-document becomes two columns
 *  without the caller flattening rows first. */
export interface CsvColumn {
  key: string;
  header: string;
}

/**
 * Excel on Windows decodes a BOM-less file as the system codepage, which
 * turns every Arabic name into mojibake. One three-byte mark is the whole
 * difference between an export that works and one that looks broken to the
 * person who asked for it.
 */
const BOM = '﻿';

/** CRLF, not LF: RFC 4180 says so, and Excel is the consumer here. */
const ROW_SEPARATOR = '\r\n';

/** Characters that make a spreadsheet treat a cell as a formula rather than
 *  as text. These exports carry user-supplied names, so a value opening with
 *  one of them is data that must never be evaluated. */
const FORMULA_LEADS = new Set(['=', '+', '-', '@']);

/**
 * Serialises rows to RFC 4180 CSV, UTF-8 with a byte order mark.
 *
 * @param rows records to write; a missing or nested-missing path is empty,
 *   never the string "undefined".
 * @param columns output order and headers.
 */
export function toCsv(
  rows: readonly Record<string, unknown>[],
  columns: readonly CsvColumn[],
): string {
  const lines = [columns.map((column) => escapeCell(column.header)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCell(readPath(row, column.key))).join(','));
  }
  return BOM + lines.join(ROW_SEPARATOR);
}

/** Walks a dotted path, stopping at the first missing link rather than
 *  throwing — a row that lacks an optional sub-document exports as blank. */
function readPath(row: Record<string, unknown>, path: string): unknown {
  let current: unknown = row;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = value instanceof Date ? value.toISOString() : String(value);

  // Neutralise the formula BEFORE deciding on quoting, so the added quote
  // is itself inside the quoted cell and survives the round trip.
  const safe = FORMULA_LEADS.has(text.charAt(0)) ? `'${text}` : text;

  return /[",\r\n]/.test(safe) || safe !== text
    ? `"${safe.replace(/"/g, '""')}"`
    : safe;
}
