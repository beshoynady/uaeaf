import { ArticleSchema, ARTICLE_PUBLICATION_STATES } from './article.schema.js';

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
