import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { LiveStreamsService } from './live-streams.service.js';
import { StartLiveStreamDto } from './dto/start-live-stream.dto.js';
import { UpdateLiveStreamDto } from './dto/update-live-stream.dto.js';
import { LiveStreamPublicResponseDto, toPublicLiveStream } from './dto/live-stream-public-response.dto.js';
import { LiveStreamAdminResponseDto, toAdminLiveStream } from './dto/live-stream-admin-response.dto.js';

/** Implements: liveStreams collection, Domain 5 — Media Center.
 *
 *  Permissions ride on `videos`: a live broadcast is the video team's work and
 *  inventing a second permission subject would mean every role that can post a
 *  video needs a second grant to go live with one. */
@ApiTags('live-streams')
@Controller('live-streams')
export class LiveStreamsController {
  constructor(private readonly service: LiveStreamsService) {}

  /** The homepage and the video library both read this on every render, so it
   *  is the one route here that is public. Answers `null` — not 404 — when
   *  nothing is live: "there is no broadcast" is a normal state of the site,
   *  not a missing address. */
  @Get('public/active')
  @Public()
  @ApiOkResponse({ type: LiveStreamPublicResponseDto, description: 'null when nothing is live.' })
  async findActive(): Promise<LiveStreamPublicResponseDto | null> {
    const active = await this.service.findActive();
    return active ? toPublicLiveStream(active) : null;
  }

  /** The editor's read, and the only route that can see a broadcast whose
   *  time has passed. `public/active` is declared above it so the literal
   *  segment wins the match; `:id` would otherwise swallow `public`.
   *
   *  `Read` rather than `Update`: opening the screen is not changing it, and a
   *  role allowed to look at the video library is allowed to look at this. */
  @Get(':id')
  @RequirePermission('videos', 'Read')
  @ApiOkResponse({ type: LiveStreamAdminResponseDto })
  async findOne(@Param('id') id: string): Promise<LiveStreamAdminResponseDto> {
    const stream = await this.service.findForEditor(id);
    if (!stream) throw new NotFoundException('No broadcast with that id.');
    return toAdminLiveStream(stream);
  }

  @Post()
  @RequirePermission('videos', 'Create')
  start(@Body() dto: StartLiveStreamDto) {
    return this.service.start(dto);
  }

  @Patch(':id')
  @RequirePermission('videos', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateLiveStreamDto) {
    return this.service.update(id, dto);
  }

  /** Its own route rather than a flag on PATCH: this is the one action with a
   *  side effect on what every visitor sees, and it should not be reachable by
   *  accident inside a title edit. */
  @Post(':id/end')
  @RequirePermission('videos', 'Update')
  end(@Param('id') id: string) {
    return this.service.end(id);
  }
}
