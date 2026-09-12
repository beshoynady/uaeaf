import { validateRichText } from './validate-rich-text.js';
import { RICH_TEXT_MAX_DEPTH, RICH_TEXT_MAX_LENGTH } from './rich-text-allowlist.js';

const paragraph = (text: string, marks?: unknown[]) => ({
  type: 'paragraph',
  content: [marks ? { type: 'text', text, marks } : { type: 'text', text }],
});

const doc = (...content: unknown[]) => ({ type: 'doc', content });

const rules = (violations: { rule: string }[]) => violations.map((violation) => violation.rule);

describe('validateRichText', () => {
  it('accepts a plain bilingual paragraph in either language', () => {
    expect(validateRichText(doc(paragraph('مرحبا')), 'ar')).toEqual([]);
    expect(validateRichText(doc(paragraph('Hello')), 'en')).toEqual([]);
  });

  it('accepts bold in both languages', () => {
    const bold = doc(paragraph('يتبنّى', [{ type: 'bold' }]));

    expect(validateRichText(bold, 'ar')).toEqual([]);
    expect(validateRichText(bold, 'en')).toEqual([]);
  });

  it('rejects italic in the Arabic body and accepts it in English', () => {
    const italic = doc(paragraph('نص', [{ type: 'italic' }]));

    expect(rules(validateRichText(italic, 'ar'))).toEqual(['markNotAllowedInLanguage']);
    expect(validateRichText(italic, 'en')).toEqual([]);
  });

  it('reports the path of the offending mark', () => {
    const italic = doc(paragraph('ok'), paragraph('نص', [{ type: 'italic' }]));

    expect(validateRichText(italic, 'ar')).toEqual([
      { path: 'doc.content[1].content[0].marks[0]', rule: 'markNotAllowedInLanguage' },
    ]);
  });

  it('rejects a textAlign attribute in either language, which is how justify is refused', () => {
    const justified = doc({ ...paragraph('نص'), attrs: { textAlign: 'justify' } });

    expect(rules(validateRichText(justified, 'ar'))).toEqual(['attributeNotAllowed']);
    expect(rules(validateRichText(justified, 'en'))).toEqual(['attributeNotAllowed']);
  });

  it('treats a null attribute value as absent, so editor defaults pass', () => {
    const withNulls = doc({ ...paragraph('نص'), attrs: { textAlign: null } });

    expect(validateRichText(withNulls, 'ar')).toEqual([]);
  });

  it('accepts heading levels 2 and 3 and rejects level 1', () => {
    const heading = (level: number) =>
      doc({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'عنوان' }] });

    expect(validateRichText(heading(2), 'ar')).toEqual([]);
    expect(validateRichText(heading(3), 'ar')).toEqual([]);
    expect(rules(validateRichText(heading(1), 'ar'))).toEqual(['headingLevelNotAllowed']);
  });

  it('rejects underline, strike, code and every unknown mark', () => {
    for (const type of ['underline', 'strike', 'code', 'highlight']) {
      expect(rules(validateRichText(doc(paragraph('x', [{ type }])), 'en'))).toEqual([
        'markNotAllowed',
      ]);
    }
  });

  it('rejects an unknown node', () => {
    expect(rules(validateRichText(doc({ type: 'image', attrs: { src: 'a.png' } }), 'en'))).toEqual([
      'nodeNotAllowed',
    ]);
  });

  it('rejects javascript: and data: link hrefs and accepts the three allowed schemes', () => {
    const link = (href: string) => doc(paragraph('x', [{ type: 'link', attrs: { href } }]));

    for (const href of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', '/news']) {
      expect(rules(validateRichText(link(href), 'en'))).toEqual(['linkSchemeNotAllowed']);
    }

    for (const href of ['https://uaeaf.ae', 'http://uaeaf.ae', 'mailto:info@uaeaf.ae']) {
      expect(validateRichText(link(href), 'en')).toEqual([]);
    }
  });

  it('rejects a link whose target is anything but _blank', () => {
    const target = (value: unknown) =>
      doc(paragraph('x', [{ type: 'link', attrs: { href: 'https://uaeaf.ae', target: value } }]));

    expect(validateRichText(target('_blank'), 'en')).toEqual([]);
    expect(validateRichText(target(null), 'en')).toEqual([]);
    expect(rules(validateRichText(target('_self'), 'en'))).toEqual(['attributeNotAllowed']);
  });

  it('rejects a document nested deeper than the limit', () => {
    let node: unknown = { type: 'text', text: 'x' };
    // paragraph → listItem → bulletList → … until the nesting exceeds the cap.
    for (let i = 0; i < RICH_TEXT_MAX_DEPTH; i += 1) {
      node = { type: i % 2 === 0 ? 'paragraph' : 'listItem', content: [node] };
      node = { type: 'bulletList', content: [node] };
    }

    expect(rules(validateRichText(doc(node), 'en'))).toContain('tooDeep');
  });

  it('rejects text over the length cap and accepts text at the cap', () => {
    const atCap = doc(paragraph('x'.repeat(RICH_TEXT_MAX_LENGTH)));
    const overCap = doc(paragraph('x'.repeat(RICH_TEXT_MAX_LENGTH + 1)));

    expect(validateRichText(atCap, 'en')).toEqual([]);
    expect(rules(validateRichText(overCap, 'en'))).toEqual(['tooLong']);
  });

  it('rejects anything that is not a doc node', () => {
    for (const value of [null, undefined, 'text', 42, [], {}, { type: 'paragraph' }]) {
      expect(rules(validateRichText(value, 'en'))).toEqual(['notADocument']);
    }
  });

  it('rejects a text node with no string text and a non-array content', () => {
    expect(rules(validateRichText(doc({ type: 'text' }), 'en'))).toEqual(['malformedNode']);
    expect(rules(validateRichText(doc({ type: 'paragraph', content: 'x' }), 'en'))).toEqual([
      'malformedNode',
    ]);
  });

  it('collects every violation rather than stopping at the first', () => {
    const bad = doc(
      paragraph('a', [{ type: 'underline' }]),
      { type: 'image' },
      { ...paragraph('c'), attrs: { textAlign: 'center' } },
    );

    expect(rules(validateRichText(bad, 'ar')).sort()).toEqual([
      'attributeNotAllowed',
      'markNotAllowed',
      'nodeNotAllowed',
    ]);
  });

  it('accepts the list, quote, rule and break nodes the allowlist names', () => {
    const full = doc(
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H' }] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph('a')] }] },
      {
        type: 'orderedList',
        attrs: { start: 1, type: null },
        content: [{ type: 'listItem', content: [paragraph('b')] }],
      },
      { type: 'blockquote', content: [paragraph('q')] },
      { type: 'horizontalRule' },
      { type: 'paragraph', content: [{ type: 'text', text: 'x' }, { type: 'hardBreak' }] },
    );

    expect(validateRichText(full, 'en')).toEqual([]);
  });

  it('rejects an orderedList start below 1 or not an integer', () => {
    const start = (value: unknown) =>
      doc({
        type: 'orderedList',
        attrs: { start: value },
        content: [{ type: 'listItem', content: [paragraph('a')] }],
      });

    expect(validateRichText(start(3), 'en')).toEqual([]);
    expect(rules(validateRichText(start(0), 'en'))).toEqual(['attributeNotAllowed']);
    expect(rules(validateRichText(start(1.5), 'en'))).toEqual(['attributeNotAllowed']);
  });
});
