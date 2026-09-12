import { Types } from 'mongoose';
import { PENDING_CONTENT_MARKER, findPendingContent, hasPendingContent } from './pending-content.js';

describe('pending-content marker', () => {
  it('finds a marker in a top-level string', () => {
    expect(findPendingContent({ heroTitle: PENDING_CONTENT_MARKER })).toEqual(['heroTitle']);
  });

  it('finds a marker nested in a bilingual field', () => {
    const record = { pullQuote: { ar: 'اقتباس', en: `${PENDING_CONTENT_MARKER} awaiting translation` } };

    expect(findPendingContent(record)).toEqual(['pullQuote.en']);
  });

  it('finds a marker inside rich-text nodes, not only in known fields', () => {
    const record = {
      messageBody: {
        en: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'fine' }] },
            { type: 'paragraph', content: [{ type: 'text', text: `and ${PENDING_CONTENT_MARKER}` }] },
          ],
        },
      },
    };

    expect(findPendingContent(record)).toEqual(['messageBody.en.content[1].content[0].text']);
  });

  it('finds a marker inside an array of values', () => {
    const record = {
      values: [
        { title: { ar: 'الرؤية', en: 'Vision' } },
        { title: { ar: 'الابتكار', en: PENDING_CONTENT_MARKER } },
      ],
    };

    expect(findPendingContent(record)).toEqual(['values[1].title.en']);
  });

  it('reports every marker, not only the first', () => {
    const record = { a: PENDING_CONTENT_MARKER, b: { c: PENDING_CONTENT_MARKER } };

    expect(findPendingContent(record)).toEqual(['a', 'b.c']);
  });

  it('is quiet on a clean record', () => {
    const record = {
      heroTitle: { ar: 'كلمة الرئيس', en: "President's Message" },
      values: [{ iconKey: 'eye' }],
      featuredImageId: new Types.ObjectId(),
      publishedAt: new Date(),
    };

    expect(findPendingContent(record)).toEqual([]);
    expect(hasPendingContent(record)).toBe(false);
  });

  it('does not walk into an ObjectId or a Date looking for text', () => {
    // Both are objects; `Object.entries` on them yields internals, not
    // content. Walking them would be wasted work at best and a false
    // positive at worst.
    expect(findPendingContent({ id: new Types.ObjectId(), at: new Date() })).toEqual([]);
  });

  it('treats a bare string as the whole record', () => {
    expect(findPendingContent(PENDING_CONTENT_MARKER)).toEqual(['(root)']);
    expect(findPendingContent('clean')).toEqual([]);
  });
});
