import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PRESIDENT_MESSAGE_CONTENT } from './president-message-content.js';
import { richTextParagraphs } from '../common/rich-text/rich-text-plain-text.js';
import { validateRichText } from '../common/rich-text/validate-rich-text.js';
import { PENDING_CONTENT_MARKER, findPendingContent } from '../modules/workflow/publishing/pending-content.js';
import { VALUE_ICON_KEYS } from '../common/constants/value-icon-keys.js';

/**
 * The imported message must say exactly what the approved copy says.
 *
 * The comparison is against `docs/design-specs/page-president-message.md`
 * §3 itself, re-read on every run — not against a second copy pasted into
 * this file, which would only prove that two transcriptions agree. A single
 * character changed in either place fails this suite.
 *
 * This is the guard the whole rich-text conversion needs: turning prose into
 * a node tree is exactly the kind of work that silently drops a word.
 */
describe("President's Message content", () => {
  const SPEC = join(process.cwd(), '..', 'docs', 'design-specs', 'page-president-message.md');

  let approved: { ar: string[]; en: string[] };

  beforeAll(async () => {
    const markdown = await readFile(SPEC, 'utf-8');
    const between = (start: string, end: string) =>
      markdown.slice(markdown.indexOf(start), markdown.indexOf(end));

    // The numbered list items under each language heading are the paragraphs.
    const paragraphsIn = (block: string): string[] =>
      block
        .split('\n')
        .map((line) => /^(\d)\.\s+(.*)$/.exec(line.trim()))
        .filter((match): match is RegExpExecArray => match !== null)
        .sort((a, b) => Number(a[1]) - Number(b[1]))
        .map((match) => match[2].trim());

    approved = {
      ar: paragraphsIn(between('### 3.1 Arabic', '### 3.2 English')),
      en: paragraphsIn(between('### 3.2 English', '## 4. Structural')),
    };
  });

  it('reads five approved paragraphs per language from the spec', () => {
    // Guards the parser itself: if the spec's shape changes, every other
    // assertion here would silently compare against nothing.
    expect(approved.ar).toHaveLength(5);
    expect(approved.en).toHaveLength(5);
  });

  it('stores the five Arabic paragraphs character for character', () => {
    // The spec writes the lead-in as `**word** rest`; stored, it is a bold
    // run followed by the rest, so the extracted text is the two joined.
    const expected = approved.ar.map((paragraph) => paragraph.replace(/^\*\*(.+?)\*\*\s+/, '$1 '));

    expect(richTextParagraphs(PRESIDENT_MESSAGE_CONTENT.messageBody.ar)).toEqual(expected);
  });

  it('keeps exactly five bold marks in Arabic, one on each paragraph\'s lead-in word', () => {
    const leadIns = approved.ar.map((paragraph) => /^\*\*(.+?)\*\*/.exec(paragraph)?.[1]);
    expect(leadIns).toEqual(['يتبنّى', 'نسعى', 'لطالما', 'ندرك', 'فخورون']);

    const bold = (PRESIDENT_MESSAGE_CONTENT.messageBody.ar.content as { content: unknown[] }[]).map(
      (paragraph) =>
        (paragraph.content as { text: string; marks?: { type: string }[] }[]).filter((run) =>
          run.marks?.some((mark) => mark.type === 'bold'),
        ),
    );

    expect(bold.map((runs) => runs.length)).toEqual([1, 1, 1, 1, 1]);
    expect(bold.map((runs) => runs[0].text)).toEqual(leadIns);
  });

  it('stores the first four English paragraphs character for character', () => {
    const stored = richTextParagraphs(PRESIDENT_MESSAGE_CONTENT.messageBody.en);

    expect(stored.slice(0, 4)).toEqual(approved.en.slice(0, 4));
  });

  it('stores English ¶5 verbatim plus the pending marker for the clause it drops', () => {
    // PM-D10: the Arabic carries a clause the English omits, and no approved
    // translation exists. The approved text is kept exactly as written and
    // the gap is marked, so the page cannot publish until it is supplied.
    const stored = richTextParagraphs(PRESIDENT_MESSAGE_CONTENT.messageBody.en);

    expect(stored[4]).toBe(`${approved.en[4]} ${PENDING_CONTENT_MARKER}`);
  });

  it('carries no bold anywhere in the English body', () => {
    // The approved English copy has no lead-ins. Adding them would be a
    // design decision smuggled in by a transcription.
    const marks = (PRESIDENT_MESSAGE_CONTENT.messageBody.en.content as { content: unknown[] }[]).flatMap(
      (paragraph) => (paragraph.content as { marks?: unknown[] }[]).flatMap((run) => run.marks ?? []),
    );

    expect(marks).toEqual([]);
  });

  it('produces bodies the per-language allowlist accepts', () => {
    expect(validateRichText(PRESIDENT_MESSAGE_CONTENT.messageBody.ar, 'ar')).toEqual([]);
    expect(validateRichText(PRESIDENT_MESSAGE_CONTENT.messageBody.en, 'en')).toEqual([]);
  });

  it('marks the English pull-quote pending, and leaves the Arabic one clean', () => {
    expect(PRESIDENT_MESSAGE_CONTENT.pullQuote.en).toContain(PENDING_CONTENT_MARKER);
    expect(PRESIDENT_MESSAGE_CONTENT.pullQuote.ar).not.toContain(PENDING_CONTENT_MARKER);
  });

  it('marks exactly the two text gaps the client still owes, and nothing else', () => {
    expect(findPendingContent(PRESIDENT_MESSAGE_CONTENT).sort()).toEqual(
      ['messageBody.en.content[4].content[0].text', 'pullQuote.en'].sort(),
    );
  });

  it('uses the IA label for the H1, not the Figma frames wording', () => {
    // IA §8.1 rules the label; the frames say "رئيس الاتحاد"/"Chairman's
    // Message", and a higher source wins (CLAUDE.md §1).
    expect(PRESIDENT_MESSAGE_CONTENT.heroTitle).toEqual({
      ar: 'كلمة الرئيس',
      en: "President's Message",
    });
  });

  it('carries the five values with approved icon keys in order', () => {
    expect(PRESIDENT_MESSAGE_CONTENT.values.map((value) => value.iconKey)).toEqual([
      'eye',
      'users',
      'star',
      'award',
      'zap',
    ]);
    for (const value of PRESIDENT_MESSAGE_CONTENT.values) {
      expect(VALUE_ICON_KEYS).toContain(value.iconKey);
    }
    expect(PRESIDENT_MESSAGE_CONTENT.values.map((value) => value.displayOrder)).toEqual([1, 2, 3, 4, 5]);
  });

  it('matches the approved values copy character for character', async () => {
    const markdown = await readFile(SPEC, 'utf-8');
    // Both value tables: `| n | \`icon\` | Title | Body |`.
    const rows = markdown
      .split('\n')
      .map((line) => /^\|\s*(\d)\s*\|\s*`([a-z-]+)`\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/.exec(line.trim()))
      .filter((match): match is RegExpExecArray => match !== null);

    expect(rows).toHaveLength(10);

    const arabic = rows.slice(0, 5);
    const english = rows.slice(5, 10);

    expect(PRESIDENT_MESSAGE_CONTENT.values.map((value) => value.title.ar)).toEqual(
      arabic.map((row) => row[3]),
    );
    expect(PRESIDENT_MESSAGE_CONTENT.values.map((value) => value.description.ar)).toEqual(
      arabic.map((row) => row[4]),
    );
    expect(PRESIDENT_MESSAGE_CONTENT.values.map((value) => value.title.en)).toEqual(
      english.map((row) => row[3]),
    );
    expect(PRESIDENT_MESSAGE_CONTENT.values.map((value) => value.description.en)).toEqual(
      english.map((row) => row[4]),
    );
  });
});
