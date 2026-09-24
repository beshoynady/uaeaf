import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { VideoSectionService } from './video-section.service.js';

/** The homepage's video section, assembled in one request.
 *
 *  Public and read-only. The section's SETTINGS are written through the
 *  existing `pageSections` admin routes — this endpoint only reads what they
 *  produced, so there is no second way to configure the same row. */
@ApiTags('video-section')
@Controller('video-section')
export class VideoSectionController {
  constructor(private readonly service: VideoSectionService) {}

  @Get('public')
  @Public()
  findPublic() {
    return this.service.findPublic();
  }
}
