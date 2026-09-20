import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateArticleDto } from './create-article.dto.js';

/**
 * The sanitisation gate, tested at the only layer that can close it.
 *
 * A rich-text body is a document tree, not a string of markup, so nothing
 * downstream has to strip anything: a document carrying a script node, an
 * event-handler attribute or a `javascript:` link is not *storable* in the
 * first place. That is the property these cases pin — refusal at the door,
 * rather than cleaning after entry.
 */
describe('CreateArticleDto', () => {
  const paragraph = (text: string) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });

  const valid = {
    title: { ar: 'نتائج البطولة', en: 'Championship results' },
    slug: 'championship-results-2026',
    body: { ar: paragraph('نص الخبر'), en: paragraph('Article body') },
    authorDisplayName: { ar: 'القسم الإعلامي', en: 'Media office' },
  };

  const errorsFor = async (patch: Record<string, unknown>) =>
    validate(plainToInstance(CreateArticleDto, { ...valid, ...patch }));

  const propertiesIn = (errors: Awaited<ReturnType<typeof errorsFor>>) => errors.map((error) => error.property);

  it('accepts an ordinary bilingual article', async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  describe('a body that tries to carry code', () => {
    /** Exactly what the brief names: a script node and an event handler, plus
     *  the third vector the same paste always brings with it. */
    const injected = {
      type: 'doc',
      content: [
        { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
        {
          type: 'paragraph',
          attrs: { onerror: 'alert(1)' },
          content: [
            {
              type: 'text',
              text: 'click me',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    };

    it('is refused, and the refusal names every reason at once', async () => {
      const errors = await errorsFor({ body: { ar: injected, en: injected } });
      const reported = JSON.stringify(errors);

      expect(propertiesIn(errors)).toContain('body');
      // All three in one pass, because an author pasting a styled document
      // should be told everything wrong with it rather than one thing per save.
      expect(reported).toContain('nodeNotAllowed');
      expect(reported).toContain('attributeNotAllowed');
      expect(reported).toContain('linkSchemeNotAllowed');
    });

    it('is refused even when only one language carries it', async () => {
      // Each language is validated against its own allowlist, so a clean
      // Arabic side cannot vouch for a hostile English one.
      const errors = await errorsFor({ body: { ar: paragraph('نص سليم'), en: injected } });

      expect(propertiesIn(errors)).toContain('body');
    });
  });

  it('refuses an italic Arabic body while allowing an italic English one', async () => {
    const italic = (lang: string) => ({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: lang, marks: [{ type: 'italic' }] }],
        },
      ],
    });

    // Chapter 4 §4.6: synthetic obliquing breaks the letter joins Arabic is
    // read by. The rule lives in the shared allowlist; this asserts an article
    // is held to it like every other rich-text field.
    expect(propertiesIn(await errorsFor({ body: { ar: italic('نص'), en: paragraph('ok') } }))).toContain('body');
    expect(await errorsFor({ body: { ar: paragraph('نص'), en: italic('text') } })).toHaveLength(0);
  });

  describe('the slug', () => {
    it.each([
      ['spaces and punctuation', 'Not A Slug!'],
      ['an uppercase letter', 'Championship-Results'],
      ['a path separator', 'news/championship'],
      ['a leading hyphen', '-championship'],
      ['a doubled hyphen', 'championship--results'],
      ['an Arabic segment', 'نتائج-البطولة'],
    ])('refuses %s', async (_case, slug) => {
      expect(propertiesIn(await errorsFor({ slug }))).toContain('slug');
    });

    it('accepts lowercase words joined by single hyphens', async () => {
      expect(await errorsFor({ slug: 'uae-athletics-championship-2026' })).toHaveLength(0);
    });
  });

  it('requires both languages of the headline and the byline', async () => {
    expect(propertiesIn(await errorsFor({ title: { ar: 'عنوان', en: '' } }))).toContain('title');
    expect(propertiesIn(await errorsFor({ authorDisplayName: { ar: '', en: 'Media' } }))).toContain(
      'authorDisplayName',
    );
  });

  it('treats the cover image and the SEO block as optional', async () => {
    expect(await errorsFor({ coverMediaId: undefined, seo: undefined })).toHaveLength(0);
  });

  it('refuses a cover image that is not an id', async () => {
    expect(propertiesIn(await errorsFor({ coverMediaId: 'not-an-id' }))).toContain('coverMediaId');
  });
});
