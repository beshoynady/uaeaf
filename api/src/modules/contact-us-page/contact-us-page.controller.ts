import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ContactUsPagesService } from './contact-us-page.service.js';
import { UpsertContactUsPageDto } from './dto/upsert-contact-us-page.dto.js';

/** Implements: contactUsPage collection, Domain 1 — Federation &
 *  Governance. Singleton: GET reads the one row, PUT upserts it. The GET is
 *  `@Public()` — this is the site-wide public contact block (footer,
 *  floating icons), with no publicationState gate. */
@ApiTags('contact-us-page')
@Controller('contact-us-page')
export class ContactUsPagesController {
  constructor(private readonly service: ContactUsPagesService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('contactUsPage', 'Update')
  upsert(@Body() dto: UpsertContactUsPageDto) {
    return this.service.upsert(dto);
  }
}
