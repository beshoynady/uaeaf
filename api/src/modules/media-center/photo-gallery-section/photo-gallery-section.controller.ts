import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { PhotoGallerySectionService } from './photo-gallery-section.service.js';

/** The homepage's albums section, assembled in one request.
 *
 *  Public and read-only. The section's SETTINGS are written through the
 *  existing `pageSections` admin routes — this endpoint only reads what they
 *  produced, so there is no second way to configure the same row. */
@ApiTags('photo-gallery-section')
@Controller('photo-gallery-section')
export class PhotoGallerySectionController {
  constructor(private readonly service: PhotoGallerySectionService) {}

  @Get('public')
  @Public()
  findPublic() {
    return this.service.findPublic();
  }
}
