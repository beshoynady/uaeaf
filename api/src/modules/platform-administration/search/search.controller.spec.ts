import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

/**
 * Controller/DTO-level behaviour only: `SearchService` is mocked, so this
 * exercises routing and `QuerySearchDto` validation, not a real database.
 * `@Public()`/`@RateLimit()` are exercised end-to-end in the full app, where
 * `RateLimitGuard`/`JwtAuthGuard` are registered as `APP_GUARD` providers —
 * neither is bound in this minimal module.
 */
describe('GET /search/public', () => {
  let app: INestApplication;
  let service: { search: jest.Mock<(...args: unknown[]) => Promise<unknown>> };

  beforeEach(async () => {
    service = {
      search: jest.fn() as jest.Mock<(...args: unknown[]) => Promise<unknown>>,
    };
    service.search.mockResolvedValue({ groups: [] });

    const module = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: service }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('عام بلا مصادقة', async () => {
    await request(app.getHttpServer()).get('/search/public?q=نادي').expect(200);
  });

  it('locale مجهول يُرفض', async () => {
    await request(app.getHttpServer()).get('/search/public?q=نادي&locale=fr').expect(400);
  });

  it('q غائب يُرفض', async () => {
    await request(app.getHttpServer()).get('/search/public').expect(400);
  });

  it('يمرر القيم الافتراضية عند غيابها', async () => {
    await request(app.getHttpServer()).get('/search/public?q=نادي').expect(200);
    expect(service.search).toHaveBeenCalledWith('نادي', 'ar', undefined, 5);
  });

  it('يفصل types على الفاصلة', async () => {
    await request(app.getHttpServer()).get('/search/public?q=نادي&types=articles,clubs').expect(200);
    expect(service.search).toHaveBeenCalledWith('نادي', 'ar', ['articles', 'clubs'], 5);
  });

  it('limit خارج المدى يُقصَر في الخدمة لا يُرفض هنا', async () => {
    await request(app.getHttpServer()).get('/search/public?q=نادي&limit=999').expect(200);
    expect(service.search).toHaveBeenCalledWith('نادي', 'ar', undefined, 999);
  });

  it('حقل غير معروف في الـquery يُرفض (forbidNonWhitelisted)', async () => {
    await request(app.getHttpServer()).get('/search/public?q=نادي&admin=true').expect(400);
  });

  it('محاولة حقن عبر bracket notation في q تُرفض بدل أن تصبح كائنًا', async () => {
    // Express's query parser turns `q[$ne]=1` into `{ $ne: '1' }` — this
    // proves `@IsString()` rejects that shape at the DTO boundary rather
    // than it ever reaching `SearchService.search` as an object.
    await request(app.getHttpServer()).get('/search/public?q[$ne]=1').expect(400);
    expect(service.search).not.toHaveBeenCalled();
  });

  it('q أطول من 80 محرفًا يُرفض عند الـDTO', async () => {
    const tooLong = 'ن'.repeat(81);
    await request(app.getHttpServer()).get(`/search/public?q=${tooLong}`).expect(400);
    expect(service.search).not.toHaveBeenCalled();
  });
});
