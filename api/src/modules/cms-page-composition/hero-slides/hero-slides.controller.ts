import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { HeroSlidesService } from './hero-slides.service.js';
import { CreateHeroSlideDto } from './dto/create-hero-slides.dto.js';

/** Implements: heroSlides collection, Domain 11 — CMS & Page Composition. */
@ApiTags('hero-slides')
@Controller('hero-slides')
export class HeroSlidesController {
  constructor(private readonly service: HeroSlidesService) {}

  @Post()
  @RequirePermission('heroSlides', 'Create')
  create(@Body() dto: CreateHeroSlideDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('heroSlides', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Public composition read: the active, in-window slides of one HERO
   *  section, in displayOrder. Declared ahead of `GET :id` so `public` is
   *  never swallowed as an `:id` value (matches the established
   *  route-ordering convention — see `albums.controller.ts`). */
  @Get('public/by-section/:pageSectionId')
  @Public()
  findPublicBySection(@Param('pageSectionId') pageSectionId: string) {
    return this.service.findPublicBySection(pageSectionId);
  }

  @Get(':id')
  @RequirePermission('heroSlides', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('heroSlides', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
