import { richTextParagraphs, richTextPlainText } from './rich-text-plain-text.js';

const doc = (...content: unknown[]) => ({ type: 'doc', content });

describe('richTextParagraphs', () => {
  it('extracts one entry per top-level block, in order', () => {
    const body = doc(
      { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'second' }] },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'third' }] }] },
    );

    expect(richTextParagraphs(body)).toEqual(['first', 'second', 'third']);
  });

  it('joins the runs of one paragraph without inserting separators', () => {
    const body = doc({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'يتبنّى', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' الاتحاد رؤية' },
      ],
    });

    expect(richTextParagraphs(body)).toEqual(['يتبنّى الاتحاد رؤية']);
  });

  it('renders a hard break as a newline', () => {
    const body = doc({
      type: 'paragraph',
      content: [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b' }],
    });

    expect(richTextParagraphs(body)).toEqual(['a\nb']);
  });

  it('skips blocks that carry no text, such as a horizontal rule', () => {
    const body = doc(
      { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
      { type: 'horizontalRule' },
      { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
    );

    expect(richTextParagraphs(body)).toEqual(['a', 'b']);
  });

  it('returns an empty list for anything that is not a document', () => {
    for (const value of [null, undefined, 'x', 7, {}, []]) {
      expect(richTextParagraphs(value)).toEqual([]);
    }
  });
});

describe('richTextPlainText', () => {
  it('joins the paragraphs with a blank line', () => {
    const body = doc(
      { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
    );

    expect(richTextPlainText(body)).toBe('a\n\nb');
  });

  it('is empty for an empty document', () => {
    expect(richTextPlainText(doc())).toBe('');
  });
});
