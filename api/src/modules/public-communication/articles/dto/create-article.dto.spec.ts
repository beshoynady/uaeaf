import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateArticleDto } from './create-article.dto.js';
import { UpdateArticleDto } from './update-article.dto.js';

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
    topic: 'nationalTeam',
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

  /**
   * Required on a new article only (owner decision 2026-09-22). The articles
   * written before the field existed stay publishable without one, so the
   * rule lives at creation and nowhere else.
   */
  describe('topic', () => {
    it('requires one of the six topics on a new article', async () => {
      expect(propertiesIn(await errorsFor({ topic: undefined }))).toContain('topic');
      expect(propertiesIn(await errorsFor({ topic: null }))).toContain('topic');
      expect(propertiesIn(await errorsFor({ topic: 'sport' }))).toContain('topic');
      expect(await errorsFor({ topic: 'records' })).toHaveLength(0);
    });

    const updateErrors = async (body: Record<string, unknown>) =>
      propertiesIn(await validate(plainToInstance(UpdateArticleDto, body)));

    it('leaves the topic alone on an edit that does not send one', async () => {
      // An old article is edited without anyone classifying it.
      expect(await updateErrors({ slug: 'renamed-story' })).toHaveLength(0);
    });

    it('lets an edit change the topic but not clear it', async () => {
      // Clearing one would undo the rule a new article was created under.
      expect(await updateErrors({ topic: 'youth' })).toHaveLength(0);
      expect(await updateErrors({ topic: null })).toContain('topic');
      expect(await updateErrors({ topic: 'sport' })).toContain('topic');
    });
  });

  /**
   * Where a media round-up came from (owner decision 2026-09-22).
   *
   * `FederationInMedia` is the federation reporting that somebody else
   * published something — the outlet and its address are what distinguish it
   * from an article the newsroom wrote, so they are required exactly where
   * that distinction exists and nowhere else. The same shape as `topic`
   * above: enforced at creation, left alone on the rows written before the
   * fields existed.
   */
  describe('the source of a media round-up', () => {
    const coverage = { category: 'FederationInMedia' };

    it('requires the outlet and its address on a new round-up', async () => {
      const missing = propertiesIn(await errorsFor(coverage));
      expect(missing).toContain('sourceOutlet');
      expect(missing).toContain('sourceUrl');
    });

    it('accepts a round-up that names both', async () => {
      expect(
        await errorsFor({ ...coverage, sourceOutlet: 'Gulf News', sourceUrl: 'https://gulfnews.com/sport/x' }),
      ).toHaveLength(0);
    });

    it('refuses an address that is not one', async () => {
      // Free text here would print as a link and lead nowhere.
      expect(
        propertiesIn(await errorsFor({ ...coverage, sourceOutlet: 'Gulf News', sourceUrl: 'gulf news article' })),
      ).toContain('sourceUrl');
    });

    it('refuses a blank outlet name as firmly as a missing one', async () => {
      expect(
        propertiesIn(await errorsFor({ ...coverage, sourceOutlet: '   ', sourceUrl: 'https://gulfnews.com/x' })),
      ).toContain('sourceOutlet');
    });

    it('asks a General article for neither, and accepts neither silently', async () => {
      // The fields do not exist for the federation's own reporting, so an
      // ordinary article is never held up by them.
      expect(await errorsFor({ category: 'General' })).toHaveLength(0);
      expect(await errorsFor({})).toHaveLength(0);
    });

    const updateErrors = async (body: Record<string, unknown>) =>
      propertiesIn(await validate(plainToInstance(UpdateArticleDto, body)));

    it('leaves an existing round-up alone on an edit that touches neither', async () => {
      // A row written before the fields existed is still editable; the rule
      // lives at creation, exactly as the topic's does.
      expect(await updateErrors({ slug: 'renamed-coverage' })).toHaveLength(0);
    });

    it('requires both once an edit turns an article into a round-up', async () => {
      // Converting the category is the moment the distinction starts to
      // apply, so it is the moment the fields become required.
      const converting = await updateErrors({ category: 'FederationInMedia' });
      expect(converting).toContain('sourceOutlet');
      expect(converting).toContain('sourceUrl');

      expect(
        await updateErrors({
          category: 'FederationInMedia',
          sourceOutlet: 'The National',
          sourceUrl: 'https://thenationalnews.com/sport/y',
        }),
      ).toHaveLength(0);
    });

    it('lets an edit correct either field on its own', async () => {
      expect(await updateErrors({ sourceOutlet: 'Al Khaleej' })).toHaveLength(0);
      expect(await updateErrors({ sourceUrl: 'https://alkhaleej.ae/sport/z' })).toHaveLength(0);
      expect(await updateErrors({ sourceUrl: 'not a url' })).toContain('sourceUrl');
    });

    it('lets an edit clear both when an article stops being a round-up', async () => {
      // Turning a round-up back into the newsroom's own story leaves an
      // attribution that is no longer true; it must be clearable.
      expect(await updateErrors({ category: 'General', sourceOutlet: null, sourceUrl: null })).toHaveLength(0);
    });
  });
});
