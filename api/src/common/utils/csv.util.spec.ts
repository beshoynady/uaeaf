import { toCsv } from './csv.util.js';

/**
 * The export format the owner approved 2026-09-08, chosen over PDF for the
 * first slice because a CSV carries Arabic correctly with nothing but a byte
 * order mark, while generating an Arabic PDF server-side needs either a
 * HarfBuzz shaper or a headless Chrome in production.
 *
 * Two properties matter more than the shape: the file must open in Excel
 * with the Arabic intact, and a cell must never become a formula.
 */
describe('toCsv', () => {
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'city', header: 'City' },
  ];

  /** Strips the BOM so the assertions read as the file's text. */
  const body = (csv: string): string => csv.replace(/^﻿/, '');

  it('writes the header row then one row per record', () => {
    const csv = toCsv([{ name: 'Amal', city: 'Dubai' }], columns);

    expect(body(csv)).toBe('Name,City\r\nAmal,Dubai');
  });

  it('opens with a byte order mark so Excel reads it as UTF-8', () => {
    // Without this, Excel on Windows decodes the file as the system
    // codepage and every Arabic name arrives as mojibake — the single most
    // common way a working export looks broken to the person who asked
    // for it.
    const csv = toCsv([{ name: 'أمل', city: 'دبي' }], columns);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(body(csv)).toContain('أمل,دبي');
  });

  it('writes a header row even with no records', () => {
    expect(body(toCsv([], columns))).toBe('Name,City');
  });

  it('quotes a value containing a comma, a quote or a newline', () => {
    const csv = toCsv(
      [{ name: 'Al Ain, Abu Dhabi', city: 'say "hi"' }],
      columns,
    );

    expect(body(csv)).toBe('Name,City\r\n"Al Ain, Abu Dhabi","say ""hi"""');
  });

  it('keeps a newline inside its quoted cell', () => {
    const csv = toCsv([{ name: 'line one\nline two', city: 'Dubai' }], columns);

    expect(body(csv)).toBe('Name,City\r\n"line one\nline two",Dubai');
  });

  it('renders null and undefined as empty, not as the word', () => {
    const csv = toCsv([{ name: null, city: undefined }], columns);

    expect(body(csv)).toBe('Name,City\r\n,');
  });

  it('keeps a number a number and a date an ISO instant', () => {
    const csv = toCsv(
      [{ name: 42, city: new Date('2026-09-08T10:30:00.000Z') }],
      columns,
    );

    expect(body(csv)).toBe('Name,City\r\n42,2026-09-08T10:30:00.000Z');
  });

  it('defuses a value Excel would run as a formula', () => {
    // CSV injection: a cell opening with = + - or @ is evaluated on open,
    // and these exports carry user-supplied names. Prefixing with a single
    // quote is the documented mitigation and is invisible in the cell.
    const csv = toCsv(
      [{ name: '=cmd|calc', city: '+1971500000000' }],
      columns,
    );

    expect(body(csv)).toBe(`Name,City\r\n"'=cmd|calc","'+1971500000000"`);
  });

  it('reads a nested value by dotted path', () => {
    const csv = toCsv([{ name: { ar: 'أمل' } }], [
      { key: 'name.ar', header: 'Name (AR)' },
    ]);

    expect(body(csv)).toBe('Name (AR)\r\nأمل');
  });

  it('renders a missing nested path as empty rather than throwing', () => {
    expect(body(toCsv([{}], [{ key: 'a.b.c', header: 'X' }]))).toBe('X\r\n');
  });
});
