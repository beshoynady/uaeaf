import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { PagesService } from './pages.service.js';
import { CreatePageDto } from './dto/create-pages.dto.js';
import { PagePublicResponseDto } from './dto/page-public-response.dto.js';

/** Implements: pages collection, Domain 11 — CMS & Page Composition. */
@ApiTags('pages')
@ApiExtraModels(PagePublicResponseDto)
@Controller('pages')
export class PagesController {
  constructor(private readonly service: PagesService) {}

  @Post()
  @RequirePermission('pages', 'Create')
  create(@Body() dto: CreatePageDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('pages', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Public routing lookup by slug. Only a `Published` page resolves;
   *  a Draft or unknown slug returns null so the caller 404s.
   *
   *  Modelled as `oneOf [DTO, null]` rather than a plain DTO because this
   *  route really does answer HTTP 200 with a literal `null` body for an
   *  unresolved slug — the same convention `GET /albums/public/:slug` uses.
   *  A generated client that saw only the non-null type would be wrong
   *  exactly where a caller most needs it right: the not-found path. */
  @Get('public/:slug')
  @Public()
  @ApiOkResponse({
    schema: { oneOf: [{ $ref: getSchemaPath(PagePublicResponseDto) }, { type: 'null' }] },
  })
  findPublishedBySlug(@Param('slug') slug: string) {
    return this.service.findPublishedBySlug(slug);
  }

  @Get(':id')
  @RequirePermission('pages', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('pages', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
