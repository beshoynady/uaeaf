import { ArticleSchema, ARTICLE_CATEGORIES, ARTICLE_PUBLICATION_STATES } from './article.schema.js';

/**
 * The shape of a news item, pinned where it differs from the eleven other
 * workflow-governed types.
 *
 * Three of those differences carry a decision: the state enum is two values
 * and not four, archiving is a flag rather than a fifth state, and the item
 * has a slug at all — the approved schema specification records that
 * `articles` has none and flags the absence as an open structural item.
 */
describe('ArticleSchema', () => {
  const indexes = () => ArticleSchema.indexes() as [Record<string, number>, Record<string, unknown>][];

  it('admits only the two states a news item can be in', () => {
    const path = ArticleSchema.path('publicationState') as unknown as { enumValues: string[] };

    // Owner decision 2026-09-20: `Unpublished` and `Archived` are not states
    // of an article. Hiding a published item is a flag over it, not a fifth
    // position in a state machine — so the enum must not quietly accept them.
    expect(path.enumValues).toEqual(['Draft', 'Live']);
    expect(ARTICLE_PUBLICATION_STATES).toEqual(['Draft', 'Live']);
  });

  it('defaults a new article to a draft that is visible to the newsroom', () => {
    expect(ArticleSchema.path('publicationState').options.default).toBe('Draft');
    expect(ArticleSchema.path('archived').options.default).toBe(false);
  });

  it('has no publish date until something publishes it', () => {
    // Stamped by the server from the publication, never chosen by an author:
    // two stored dates could disagree and the published one is the true one.
    expect(ArticleSchema.path('publishDate').options.default).toBeNull();
    expect(ArticleSchema.path('publishDate').options.required).toBeFalsy();
  });

  it('keeps one live article per slug, and frees the slug when one is deleted', () => {
    const slugIndex = indexes().find(([keys]) => 'slug' in keys);

    expect(slugIndex).toBeDefined();
    expect(slugIndex![0]).toEqual({ slug: 1 });
    expect(slugIndex![1]).toMatchObject({
      unique: true,
      // Partial on `archivedAt: null`, so a soft-deleted article does not hold
      // its slug hostage against a corrected replacement — the `pages.slug`
      // precedent.
      partialFilterExpression: { archivedAt: null },
    });
  });

  it('orders the public feed without a collection scan', () => {
    // The feed's exact filter and sort: live, not hidden, newest first.
    expect(indexes().map(([keys]) => keys)).toContainEqual({
      publicationState: 1,
      archived: 1,
      publishDate: -1,
    });
  });


  describe("the newsroom's own taxonomy", () => {
    it('admits only the categories the newsroom has declared', () => {
      const path = ArticleSchema.path('category') as unknown as { enumValues: string[] };

      expect(path.enumValues).toEqual(['General', 'FederationInMedia']);
      expect(ARTICLE_CATEGORIES).toEqual(['General', 'FederationInMedia']);
    });

    it('files an article on the general shelf unless it is told otherwise', () => {
      // A required field with no default would make every existing article
      // unsaveable, and an optional one would leave "no category" as a state
      // nobody chose. A default is the only shape with neither problem.
      expect(ArticleSchema.path('category').options.required).toBe(true);
      expect(ArticleSchema.path('category').options.default).toBe('General');
    });

    it('serves a category-filtered feed without a collection scan', () => {
      const keys = (ArticleSchema.indexes() as [Record<string, number>, unknown][]).map(([k]) => k);

      expect(keys).toContainEqual({
        category: 1,
        publicationState: 1,
        archived: 1,
        publishDate: -1,
      });
    });
  });

  /**
   * Free labels, deliberately NOT a second category.
   *
   * `category` files an article on exactly one shelf and decides which
   * homepage section it appears in; a tag is an open word the newsroom
   * invents, several per article, for display and filtering only. Merging the
   * two would either close the open list or open the closed one, and the
   * homepage composition depends on the closed one.
   */
  describe('tags', () => {
    it('holds several free labels, and none by default', () => {
      const path = ArticleSchema.path('tags');

      expect(path.instance).toBe('Array');
      // An absent list reads as an empty one, so every consumer can map over
      // it without asking whether it is there.
      expect(path.options.default).toEqual([]);
    });

    it('is not an enum, unlike the category beside it', () => {
      // The whole point of the field. A closed list here would mean the
      // newsroom filing a story about a new discipline had to ship a release
      // first.
      expect((ArticleSchema.path('tags') as unknown as { enumValues?: string[] }).enumValues).toBeUndefined();
      expect(ARTICLE_CATEGORIES).toEqual(['General', 'FederationInMedia']);
    });

    it('serves a tag-filtered feed without a collection scan', () => {
      const tagIndex = indexes().find(([keys]) => 'tags' in keys);

      // A visitor following a tag runs the same live-and-not-hidden filter as
      // the feed itself, so the index has to carry all of it or the database
      // reads every article the federation has ever published.
      expect(tagIndex).toBeDefined();
      expect(tagIndex?.[0]).toMatchObject({ tags: 1, publicationState: 1, archived: 1 });
    });
  });

  it('requires both languages of everything a reader sees', () => {
    for (const field of ['title', 'body', 'authorDisplayName']) {
      expect(ArticleSchema.path(field).options.required).toBe(true);
    }
  });

  it('treats a cover image and an SEO block as optional', () => {
    // An article with no picture is an ordinary article. An SEO override is
    // an override: absent, the page falls back to the headline itself.
    expect(ArticleSchema.path('coverMediaId').options.default).toBeNull();
    expect(ArticleSchema.path('seo').options.default).toBeNull();
  });
});
