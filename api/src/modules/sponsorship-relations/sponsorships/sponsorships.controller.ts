import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { SponsorshipsService } from './sponsorships.service.js';
import { CreateSponsorshipDto, UpdateSponsorshipDto } from './dto/create-sponsorship.dto.js';

/** Implements: sponsorships collection, Domain 9. */
@ApiTags('sponsorships')
@Controller('sponsorships')
export class SponsorshipsController {
  constructor(private readonly service: SponsorshipsService) {}

  @Post()
  @RequirePermission('sponsorships', 'Create')
  create(@Body() dto: CreateSponsorshipDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('sponsorships', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** The running sponsorships with their sponsors, for the homepage's strip
   *  and section. Declared ahead of `GET :id` so `public` is never read as
   *  an id (the established route-ordering convention). */
  @Get('public')
  @Public()
  findPublic() {
    return this.service.findPublic();
  }

  @Get(':id')
  @RequirePermission('sponsorships', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('sponsorships', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateSponsorshipDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('sponsorships', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
