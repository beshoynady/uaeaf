import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ArticlesService } from './articles.service.js';
import { ArticlesRepository } from './articles.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * The rules that belong to a news item rather than to the workflow engine.
 *
 * Two of them are the batch's hard constraints and are asserted here rather
 * than anywhere else: the audit trail records the decision and never a word of
 * the article, and archiving hides a published item without retracting it.
 */
describe('ArticlesService', () => {
  const articleId = new Types.ObjectId();
  const actor = { userId: new Types.ObjectId().toString(), permissions: [] } as unknown as AuthenticatedUser;
  const context = { ipAddress: '10.0.0.1', userAgent: 'jest' };

  const paragraph = (text: string) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  });

  const stored = (overrides: Record<string, unknown> = {}) =>
    ({
      _id: articleId,
      title: { ar: 'عنوان', en: 'Headline' },
      slug: 'headline',
      body: { ar: paragraph('نص'), en: paragraph('body') },
      authorDisplayName: { ar: 'الإعلام', en: 'Media' },
      publicationState: 'Draft',
      archived: false,
      publishDate: null,
      coverMediaId: null,
      seo: null,
      ...overrides,
    }) as never;

  const makeDeps = () => {
    const repository = {
      create: jest.fn(async (data: unknown) => ({ ...(data as object), _id: articleId })),
      findById: jest.fn(async () => stored()),
      findBySlug: jest.fn(async () => null),
      findPage: jest.fn(async () => ({ items: [], total: 0 })),
      updateById: jest.fn(async () => stored()),
      softDelete: jest.fn(async () => stored()),
    } as unknown as jest.Mocked<ArticlesRepository>;
    const mediaAssetsService = { assertUsableImage: jest.fn() } as unknown as jest.Mocked<MediaAssetsService>;
    const publicationsService = {
      getPublicSnapshot: jest.fn(async () => null),
    } as unknown as jest.Mocked<PublicationsService>;
    const auditLogsService = { write: jest.fn() } as unknown as jest.Mocked<AuditLogsService>;

    return { repository, mediaAssetsService, publicationsService, auditLogsService };
  };

  const makeService = (deps: ReturnType<typeof makeDeps>) =>
    new ArticlesService(deps.repository, deps.mediaAssetsService, deps.publicationsService, deps.auditLogsService);

  describe('the audit trail', () => {
    it('records who changed an article and to what state, and never the text', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.update(
        articleId.toString(),
        { title: { ar: 'عنوان جديد', en: 'New headline' }, body: { ar: paragraph('نص جديد'), en: paragraph('new') } },
        actor,
        context,
      );

      const [entry] = deps.auditLogsService.write.mock.calls[0];
      // The batch's hard rule: `auditLogs` is consumed, never a second copy of
      // the newsroom. A snapshot here would put every draft of every article
      // into the one collection administrators can read over HTTP.
      expect(entry).toMatchObject({
        action: 'Update',
        entityType: 'articles',
        entityId: articleId,
        previousValue: { publicationState: 'Draft', archived: false },
        newValue: { publicationState: 'Draft', archived: false },
      });
      const serialised = JSON.stringify(entry);
      expect(serialised).not.toContain('paragraph');
      expect(serialised).not.toContain('New headline');
      expect(serialised).not.toContain('عنوان جديد');
    });

    it('carries the request context so the trail says where the change came from', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.update(articleId.toString(), { slug: 'renamed' }, actor, context);

      expect(deps.auditLogsService.write).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '10.0.0.1', userAgent: 'jest' }),
      );
    });

    it('writes one row per creation, naming the article that was created', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.create(
        {
          title: { ar: 'عنوان', en: 'Headline' },
          slug: 'headline',
          body: { ar: paragraph('نص'), en: paragraph('body') },
          authorDisplayName: { ar: 'الإعلام', en: 'Media' },
          topic: 'nationalTeam',
        },
        actor,
        context,
      );

      expect(deps.auditLogsService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'Create',
          entityType: 'articles',
          entityId: articleId,
          previousValue: null,
          newValue: { publicationState: 'Draft', archived: false },
        }),
      );
    });
  });

  describe('archiving', () => {
    it('hides a published article from the feed without retracting it', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(stored({ publicationState: 'Live', publishDate: new Date() }));
      const service = makeService(deps);

      await service.setArchived(articleId.toString(), true, actor, context);

      const [, update] = deps.repository.updateById.mock.calls[0] as [string, { $set: Record<string, unknown> }];
      expect(update.$set.archived).toBe(true);
      // Still Live. Archiving is a visibility flag over a published item, not
      // a fifth state and not an unpublish.
      expect(update.$set).not.toHaveProperty('publicationState');
      expect(update.$set).not.toHaveProperty('publishDate');
    });

    it('records the change of visibility in the trail', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(stored({ publicationState: 'Live' }));
      const service = makeService(deps);

      await service.setArchived(articleId.toString(), true, actor, context);

      expect(deps.auditLogsService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          previousValue: { publicationState: 'Live', archived: false },
          newValue: { publicationState: 'Live', archived: true },
        }),
      );
    });
  });

  describe('the slug', () => {
    it('refuses a slug another live article already holds', async () => {
      const deps = makeDeps();
      deps.repository.findBySlug.mockResolvedValue(stored({ _id: new Types.ObjectId() }));
      const service = makeService(deps);

      await expect(
        service.create(
          {
            title: { ar: 'عنوان', en: 'Headline' },
            slug: 'headline',
            body: { ar: paragraph('نص'), en: paragraph('body') },
            authorDisplayName: { ar: 'الإعلام', en: 'Media' },
            topic: 'nationalTeam',
          },
          actor,
          context,
        ),
      ).rejects.toThrow(ConflictException);
      expect(deps.repository.create).not.toHaveBeenCalled();
    });

    it('lets an article keep its own slug while being edited', async () => {
      const deps = makeDeps();
      // The slug is taken — by this very article. Refusing here would make a
      // headline unable to be edited without also renaming its URL.
      deps.repository.findBySlug.mockResolvedValue(stored());
      const service = makeService(deps);

      await expect(service.update(articleId.toString(), { slug: 'headline' }, actor, context)).resolves.toBeDefined();
    });
  });

  it('refuses a cover image that is not a usable image', async () => {
    const deps = makeDeps();
    deps.mediaAssetsService.assertUsableImage.mockRejectedValue(new NotFoundException('gone'));
    const service = makeService(deps);

    await expect(
      service.update(articleId.toString(), { coverMediaId: new Types.ObjectId().toString() }, actor, context),
    ).rejects.toThrow(NotFoundException);
    expect(deps.repository.updateById).not.toHaveBeenCalled();
  });

  /**
   * What the newsroom typed, made storable without being made unreadable.
   *
   * The badge a visitor sees is this text, so it keeps the newsroom's own
   * capitalisation. Everything else about it is tidied, because a tag is also
   * a filter key and "  Athletics " and "Athletics" must not be two.
   */
  describe('tags', () => {
    const tagsOf = (deps: ReturnType<typeof makeDeps>) =>
      (deps.repository.create.mock.calls[0] as [{ tags?: string[] }])[0].tags;

    /** The three required fields, so each case below shows only its tags. */
    const draft = () => ({
      title: { ar: 'عنوان', en: 'Headline' },
      slug: 'headline',
      body: { ar: paragraph('نص'), en: paragraph('body') },
      authorDisplayName: { ar: 'الإعلام', en: 'Media' },
    });

    it('keeps the capitalisation the newsroom typed', async () => {
      const deps = makeDeps();

      await makeService(deps).create({ ...draft(), tags: ['UAE', 'ألعاب القوى'] } as never, actor, context);

      // Lower-casing would print "uae" on the badge a reader sees.
      expect(tagsOf(deps)).toEqual(['UAE', 'ألعاب القوى']);
    });

    it('trims a tag and drops one that was only spaces', async () => {
      const deps = makeDeps();

      await makeService(deps).create({ ...draft(), tags: ['  Athletics  ', '   ', 'Relay'] } as never, actor, context);

      expect(tagsOf(deps)).toEqual(['Athletics', 'Relay']);
    });

    it('counts two spellings of one word as one tag', async () => {
      const deps = makeDeps();

      await makeService(deps).create({ ...draft(), tags: ['Athletics', 'athletics', 'ATHLETICS'] } as never, actor, context);

      // The filter matches case-insensitively, so keeping all three would put
      // three badges on the card that all lead to the same list.
      expect(tagsOf(deps)).toEqual(['Athletics']);
    });

    it('refuses more tags than an article can carry', async () => {
      const deps = makeDeps();
      const many = Array.from({ length: 11 }, (_, i) => `tag-${i}`);

      // An unbounded list turns one article into an index of its own, and the
      // card that draws them into an unbounded row.
      await expect(
        makeService(deps).create({ ...draft(), tags: many } as never, actor, context),
      ).rejects.toThrow(BadRequestException);
      expect(deps.repository.create).not.toHaveBeenCalled();
    });

    it('refuses a tag longer than a label', async () => {
      const deps = makeDeps();

      await expect(
        makeService(deps).create({ ...draft(), tags: ['x'.repeat(41)] } as never, actor, context),
      ).rejects.toThrow(BadRequestException);
    });

    it('normalises on an edit too, not only on creation', async () => {
      const deps = makeDeps();

      await makeService(deps).update(articleId.toString(), { tags: ['  Relay  ', 'relay'] } as never, actor, context);

      const [, patch] = deps.repository.updateById.mock.calls[0] as [string, { $set: { tags?: string[] } }];
      expect(patch.$set.tags).toEqual(['Relay']);
    });
  });

  describe('topic', () => {
    const draft = () => ({
      title: { ar: 'عنوان', en: 'Headline' },
      slug: 'headline',
      body: { ar: paragraph('نص'), en: paragraph('body') },
      authorDisplayName: { ar: 'الإعلام', en: 'Media' },
      topic: 'records',
    });

    it('files a new article under the topic it was created with', async () => {
      const deps = makeDeps();

      await makeService(deps).create(draft() as never, actor, context);

      expect((deps.repository.create.mock.calls[0] as [{ topic?: string }])[0].topic).toBe('records');
    });

    it('writes the topic on an edit only when the edit sends one', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.update(articleId.toString(), { topic: 'youth' } as never, actor, context);
      await service.update(articleId.toString(), { slug: 'renamed' } as never, actor, context);

      const patches = deps.repository.updateById.mock.calls as unknown as [string, { $set: Record<string, unknown> }][];
      expect(patches[0][1].$set.topic).toBe('youth');
      // An edit that did not touch the topic must not overwrite it — an old
      // article stays unclassified until someone classifies it.
      expect('topic' in patches[1][1].$set).toBe(false);
    });

    it('shows a reader the topic from the row, and none where nobody chose one', async () => {
      const deps = makeDeps();
      deps.repository.findPage.mockResolvedValue({
        // The second row predates the field entirely, as the twelve existing
        // articles did before the backfill.
        items: [stored({ topic: 'records' }), stored({ _id: new Types.ObjectId() })],
        total: 2,
      });
      deps.publicationsService.getPublicSnapshot.mockResolvedValue({
        slug: 'headline',
        title: { ar: 'عنوان', en: 'Headline' },
        authorDisplayName: { ar: 'الإعلام', en: 'Media' },
        body: { ar: paragraph('نص'), en: paragraph('body') },
        coverMediaId: null,
        seo: null,
        // A snapshot frozen with another topic must not win over the row: the
        // topic is a filing decision the newsroom corrects without republishing.
        topic: 'training',
      });

      const page = await makeService(deps).findPublicPage(1, 12);

      expect(page.items.map((item) => item.topic)).toEqual(['records', null]);
    });
  });

  /**
   * A window that closes before it opens.
   *
   * Passed through, Mongo answers an empty feed and nothing says why — the
   * reader sees a newsroom that has published nothing in the range they asked
   * for, and the range is the bug. Refused instead, at the request that made
   * it.
   */
  describe('a date range that cannot hold anything', () => {
    it('refuses a range whose end is before its start', async () => {
      const deps = makeDeps();

      await expect(
        makeService(deps).findPublicPage(1, 12, { from: '2026-06-30', to: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(deps.repository.findPage).not.toHaveBeenCalled();
    });

    it('accepts a range of exactly one day', async () => {
      const deps = makeDeps();

      // "Today" is the commonest filter there is, and `to` is taken to the end
      // of its day — so from and to being equal is the normal case, not an
      // edge one.
      await expect(
        makeService(deps).findPublicPage(1, 12, { from: '2026-06-30', to: '2026-06-30' }),
      ).resolves.toBeDefined();
    });

    it('ignores a malformed bound rather than calling the range impossible', async () => {
      const deps = makeDeps();

      // The existing rule: a bound that is not a date is not applied at all.
      // Comparing an Invalid Date would make every such request a 400 instead.
      await expect(
        makeService(deps).findPublicPage(1, 12, { from: 'not-a-date', to: '2026-01-01' }),
      ).resolves.toBeDefined();
    });
  });

  /**
   * The newsroom's own numbers, in one read.
   *
   * Counted by the database rather than by the screen: the list is paginated,
   * so a count assembled from a page of rows would describe the page and be
   * labelled as the newsroom.
   */
  describe('the newsroom summary', () => {
    it('counts by state, by category, and how many are hidden', async () => {
      const deps = makeDeps();
      deps.repository.summarise = jest.fn(async () => ({
        byState: { Draft: 4, Live: 6 },
        byCategory: { General: 7, FederationInMedia: 3 },
        archived: 1,
      })) as never;

      const summary = await makeService(deps).summarise();

      expect(summary).toEqual({
        byState: { Draft: 4, Live: 6 },
        byCategory: { General: 7, FederationInMedia: 3 },
        archived: 1,
      });
    });

    it("says nothing about reviews, which are not this collection's to count", async () => {
      const deps = makeDeps();
      deps.repository.summarise = jest.fn(async () => ({ byState: {}, byCategory: {}, archived: 0 })) as never;

      const summary = await makeService(deps).summarise();

      // Whether a draft is under review or carrying a standing approval is
      // the workflow engine's answer. Answered here it would be a second
      // opinion, computed from a collection that does not hold the fact.
      expect(summary).not.toHaveProperty('awaitingApproval');
      expect(summary).not.toHaveProperty('inReview');
    });

    it('names every state and category, including the ones at zero', async () => {
      const deps = makeDeps();
      deps.repository.summarise = jest.fn(async () => ({
        byState: { Live: 3 },
        byCategory: { General: 3 },
        archived: 0,
      })) as never;

      const summary = await makeService(deps).summarise();

      // A card row that omits "Draft: 0" reads as a screen that forgot to
      // load, and a reader cannot tell it from one that is still loading.
      expect(Object.keys(summary.byState).sort()).toEqual(['Draft', 'Live']);
      expect(Object.keys(summary.byCategory).sort()).toEqual(['FederationInMedia', 'General']);
    });
  });

  describe('the public feed', () => {
    it('shows each live article through its published revision, not its draft row', async () => {
      const deps = makeDeps();
      deps.repository.findPage.mockResolvedValue({ items: [stored()], total: 1 });
      deps.publicationsService.getPublicSnapshot.mockResolvedValue({
        slug: 'headline',
        title: { ar: 'العنوان المنشور', en: 'Published headline' },
        authorDisplayName: { ar: 'الإعلام', en: 'Media' },
        body: { ar: paragraph('النص المنشور'), en: paragraph('Published body') },
        coverMediaId: null,
        seo: null,
      });
      const service = makeService(deps);

      const page = await service.findPublicPage(1, 12);

      expect(page.items).toHaveLength(1);
      expect(page.items[0].title.en).toBe('Published headline');
      expect(deps.repository.findPage).toHaveBeenCalledWith(
        { publicationState: 'Live', archived: false },
        0,
        12,
      );
    });

    it('drops a live row whose publication cannot be read rather than half-drawing it', async () => {
      const deps = makeDeps();
      deps.repository.findPage.mockResolvedValue({ items: [stored()], total: 1 });
      deps.publicationsService.getPublicSnapshot.mockResolvedValue(null);
      const service = makeService(deps);

      const page = await service.findPublicPage(1, 12);

      expect(page.items).toHaveLength(0);
    });


  describe('the public feed, narrowed', () => {
    const filterOf = (deps: ReturnType<typeof makeDeps>) =>
      (deps.repository.findPage.mock.calls[0] as [Record<string, unknown>, number, number])[0];

    it('narrows to one shelf when a category is asked for', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12, { category: 'FederationInMedia' });

      expect(filterOf(deps)).toMatchObject({
        publicationState: 'Live',
        archived: false,
        category: 'FederationInMedia',
      });
    });

    it('adds no category key at all when none is asked for', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12);

      // `{ category: undefined }` matches documents that HAVE no category,
      // which is the opposite of "every category".
      expect('category' in filterOf(deps)).toBe(false);
    });

    it('reads a date range as a window on the publication date', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12, { from: '2026-01-01', to: '2026-06-30' });

      const { publishDate } = filterOf(deps) as { publishDate: { $gte?: Date; $lte?: Date } };
      expect(publishDate.$gte).toEqual(new Date('2026-01-01'));
      // The end of the day, not its start: a reader asking for "up to 30 June"
      // means the whole of it, and midnight would silently drop that day.
      expect(publishDate.$lte?.toISOString()).toBe('2026-06-30T23:59:59.999Z');
    });

    it('accepts an open-ended range', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12, { from: '2026-01-01' });

      const { publishDate } = filterOf(deps) as { publishDate: Record<string, unknown> };
      expect(Object.keys(publishDate)).toEqual(['$gte']);
    });

    it('ignores a malformed date rather than matching nothing', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12, { from: 'not-a-date' });

      // `new Date('not-a-date')` is Invalid Date, and every comparison against
      // it is false — an empty feed with no explanation.
      expect('publishDate' in filterOf(deps)).toBe(false);
    });

    it('narrows to one tag, whatever case the visitor typed', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12, { tag: 'athletics' });

      // Stored as the newsroom typed it, matched however the visitor did: the
      // tag in a pasted link is whatever was on the badge, and a visitor
      // editing the address by hand should still land on the list.
      const { tags } = filterOf(deps) as { tags: RegExp };
      expect(tags.source).toBe('^athletics$');
      expect(tags.flags).toContain('i');
    });

    it('escapes a tag before it reaches the database', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12, { tag: 'a.*b' });

      // A tag arrives from the query string, so it is as much a visitor's
      // text as the search box is.
      const { tags } = filterOf(deps) as { tags: RegExp };
      expect(tags.source).toBe(String.raw`^a\.\*b$`);
    });

    it('adds no tag key at all when none is asked for', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12);

      expect('tags' in filterOf(deps)).toBe(false);
    });

    it('escapes a search term before it reaches the database', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      await service.findPublicPage(1, 12, { search: 'a.*b' });

      const { $or } = filterOf(deps) as { $or: { [k: string]: RegExp }[] };
      // Unescaped, `.*` typed into a public search box is a collection scan
      // any visitor can trigger at will.
      expect($or[0]['title.ar'].source).toBe(String.raw`a\.\*b`);
      expect($or.map((clause) => Object.keys(clause)[0])).toEqual(['title.ar', 'title.en']);
    });
  });

    it('answers nothing for a slug that is not live', async () => {
      const deps = makeDeps();
      deps.repository.findBySlug.mockResolvedValue(stored({ publicationState: 'Draft' }));
      const service = makeService(deps);

      // A draft has a slug from the moment it is written. Serving it would put
      // unapproved text on a public URL.
      expect(await service.findPublicBySlug('headline')).toBeNull();
    });

    it('still answers for an archived article, because its URL keeps working', async () => {
      const deps = makeDeps();
      deps.repository.findBySlug.mockResolvedValue(stored({ publicationState: 'Live', archived: true }));
      deps.publicationsService.getPublicSnapshot.mockResolvedValue({
        slug: 'headline',
        title: { ar: 'عنوان', en: 'Headline' },
        authorDisplayName: { ar: 'الإعلام', en: 'Media' },
        body: { ar: paragraph('نص'), en: paragraph('body') },
      });
      const service = makeService(deps);

      // Hidden from the feed, not withdrawn: a link already shared, printed or
      // indexed must not start answering 404.
      expect(await service.findPublicBySlug('headline')).not.toBeNull();
    });
  });
});
