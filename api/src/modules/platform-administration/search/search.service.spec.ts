import { jest } from '@jest/globals';
import { SearchService } from './search.service.js';

/**
 * A Mongoose `Model` double whose `find`/`sort`/`limit`/`lean` all return the
 * same object (Mongoose's own chaining shape), with `countDocuments` kept
 * separate so the two `Promise.all` branches in `readSource` never share one
 * `exec`.
 */
const modelDouble = (items: Record<string, unknown>[] = [], total = items.length) => {
  const model = {
    find: jest.fn() as jest.Mock<(...args: unknown[]) => unknown>,
    sort: jest.fn() as jest.Mock<(...args: unknown[]) => unknown>,
    limit: jest.fn() as jest.Mock<(...args: unknown[]) => unknown>,
    lean: jest.fn() as jest.Mock<(...args: unknown[]) => unknown>,
    exec: jest.fn() as jest.Mock<() => Promise<unknown>>,
    countDocuments: jest.fn() as jest.Mock<(...args: unknown[]) => unknown>,
  };
  model.find.mockReturnValue(model);
  model.sort.mockReturnValue(model);
  model.limit.mockReturnValue(model);
  model.lean.mockReturnValue(model);
  model.exec.mockResolvedValue(items);
  const countExec = jest.fn() as jest.Mock<() => Promise<unknown>>;
  countExec.mockResolvedValue(total);
  model.countDocuments.mockReturnValue({ exec: countExec });
  return model;
};

const ARTICLE_HIT = {
  _id: 'a1',
  slug: 'club-news',
  title: { ar: 'مقال عن نادي', en: 'An article about a club' },
};

describe('SearchService', () => {
  let articleModel: ReturnType<typeof modelDouble>;
  let albumModel: ReturnType<typeof modelDouble>;
  let videoModel: ReturnType<typeof modelDouble>;
  let clubModel: ReturnType<typeof modelDouble>;
  let athleteModel: ReturnType<typeof modelDouble>;
  let athleteProfileModel: ReturnType<typeof modelDouble>;
  let coachModel: ReturnType<typeof modelDouble>;
  let service: SearchService;

  beforeEach(() => {
    articleModel = modelDouble([ARTICLE_HIT]);
    albumModel = modelDouble();
    videoModel = modelDouble();
    clubModel = modelDouble();
    athleteModel = modelDouble();
    athleteProfileModel = modelDouble();
    coachModel = modelDouble();

    service = new SearchService(
      articleModel as never,
      albumModel as never,
      videoModel as never,
      clubModel as never,
      athleteModel as never,
      athleteProfileModel as never,
      coachModel as never,
    );
  });

  it('محارف regex لا تصل إلى الاستعلام', async () => {
    // A mock that returns `[]` unconditionally would pass this even if `.*`
    // had become a live `$regex` — so this asserts the filter's shape
    // directly, not just its (mocked) result.
    await service.search('.*', 'ar', undefined, 5);

    const filterArg = articleModel.find.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(filterArg.$text).toEqual({ $search: '.*' });
    expect(filterArg).not.toHaveProperty('$regex');
    expect(filterArg).not.toHaveProperty('$where');
    expect(JSON.stringify(filterArg)).not.toContain('$regex');
  });

  it('عامل Mongo في المدخل لا يُنفَّذ', async () => {
    await expect(service.search('{"$ne": null}', 'ar', undefined, 5)).resolves.toBeTruthy();
    expect(articleModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ $text: expect.objectContaining({ $search: expect.any(String) }) }),
      expect.anything(),
    );
  });

  it('استعلام أقصر من حرفين يعيد فراغًا لا خطأ', async () => {
    await expect(service.search('a', 'ar', undefined, 5)).resolves.toEqual({ groups: [] });
    expect(articleModel.find).not.toHaveBeenCalled();
  });

  it('limit يُقصَر ولا يُرفض', async () => {
    await service.search('نادي', 'ar', undefined, 999);
    expect(articleModel.limit).toHaveBeenCalledWith(10);
  });

  it('مصدر فاشل يسقط مجموعته وحدها', async () => {
    clubModel.find.mockImplementationOnce(() => {
      throw new Error('down');
    });

    const result = await service.search('نادي', 'ar', undefined, 5);

    expect(result.groups.some((group) => group.type === 'articles')).toBe(true);
    expect(result.groups.some((group) => group.type === 'clubs')).toBe(false);
  });

  it('يعيد نتيجة حقيقية عند وجود تطابق', async () => {
    const result = await service.search('نادي', 'ar', ['articles'], 5);
    expect(result.groups).toEqual([
      {
        type: 'articles',
        total: 1,
        items: [
          {
            id: 'a1',
            title: 'مقال عن نادي',
            subtitle: null,
            href: '/news/club-news',
            thumbnailId: null,
          },
        ],
      },
    ]);
  });

  it('نوع غير معروف في types يُتجاهَل بصمت', async () => {
    await expect(service.search('نادي', 'ar', ['bogus'], 5)).resolves.toEqual({ groups: [] });
    expect(articleModel.find).not.toHaveBeenCalled();
  });

  it('athletes يُقرأ من athleteProfiles لا من athletes', async () => {
    athleteModel = modelDouble([{ _id: 'ath1', name: { ar: 'خالد', en: 'Khaled' } }]);
    athleteProfileModel = modelDouble([
      { _id: 'prof1', athleteId: 'ath1', slug: 'khaled', photoId: 'photo1' },
    ]);
    service = new SearchService(
      articleModel as never,
      albumModel as never,
      videoModel as never,
      clubModel as never,
      athleteModel as never,
      athleteProfileModel as never,
      coachModel as never,
    );

    const result = await service.search('خالد', 'ar', ['athletes'], 5);

    expect(result.groups).toEqual([
      {
        type: 'athletes',
        total: 1,
        items: [
          {
            id: 'prof1',
            title: 'خالد',
            subtitle: null,
            href: '/athletes#khaled',
            thumbnailId: 'photo1',
          },
        ],
      },
    ]);
  });

  it('href الرياضي مرساة على نفس الصفحة، لا مسار تفصيل غير موجود', async () => {
    athleteModel = modelDouble([{ _id: 'ath1', name: { ar: 'خالد', en: 'Khaled' } }]);
    athleteProfileModel = modelDouble([{ _id: 'prof1', athleteId: 'ath1', slug: 'khaled', photoId: null }]);
    service = new SearchService(
      articleModel as never,
      albumModel as never,
      videoModel as never,
      clubModel as never,
      athleteModel as never,
      athleteProfileModel as never,
      coachModel as never,
    );

    const result = await service.search('خالد', 'ar', ['athletes'], 5);
    expect(result.groups[0].items[0].href).toBe('/athletes#khaled');
  });

  it('رياضي بلا ملف عام لا يظهر في النتائج', async () => {
    athleteModel = modelDouble([{ _id: 'ath1', name: { ar: 'خالد', en: 'Khaled' } }]);
    athleteProfileModel = modelDouble([]);
    service = new SearchService(
      articleModel as never,
      albumModel as never,
      videoModel as never,
      clubModel as never,
      athleteModel as never,
      athleteProfileModel as never,
      coachModel as never,
    );

    const result = await service.search('خالد', 'ar', ['athletes'], 5);
    expect(result.groups).toEqual([]);
  });

  it('total الرياضيين لا يفضح وجود رياضي بلا ظهور علني', async () => {
    // Two athletes match the name; only one has a live public profile. `total`
    // must equal 1, not 2 — counting the raw match would tell a caller a
    // second person with this name exists (Guest, or archived profile)
    // without ever returning a field of theirs.
    athleteModel = modelDouble([
      { _id: 'ath1', name: { ar: 'خالد', en: 'Khaled' } },
      { _id: 'ath2', name: { ar: 'خالد الثاني', en: 'Khaled II' } },
    ]);
    athleteProfileModel = modelDouble([{ _id: 'prof1', athleteId: 'ath1', slug: 'khaled', photoId: null }]);
    service = new SearchService(
      articleModel as never,
      albumModel as never,
      videoModel as never,
      clubModel as never,
      athleteModel as never,
      athleteProfileModel as never,
      coachModel as never,
    );

    const result = await service.search('خالد', 'ar', ['athletes'], 5);
    expect(result.groups[0].total).toBe(result.groups[0].items.length);
    expect(result.groups[0].total).toBe(1);
  });
});
