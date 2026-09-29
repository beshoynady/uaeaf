import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RateLimit } from '../../../common/decorators/rate-limit.decorator.js';
import { SearchService } from './search.service.js';
import { QuerySearchDto } from './dto/query-search.dto.js';
import { SearchResponseDto } from './dto/search-response.dto.js';

/**
 * Site-wide public search: free-text input, unauthenticated, hitting the
 * database on every call — rate-limited tighter than the platform default
 * for exactly that reason (`RateLimitGuard`'s own default is 100/60s).
 */
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get('public')
  @Public()
  @RateLimit(60, 60)
  @ApiOkResponse({ type: SearchResponseDto })
  findPublic(@Query() query: QuerySearchDto) {
    return this.service.search(query.q, query.locale ?? 'ar', query.types, query.limit ?? 5);
  }
}
