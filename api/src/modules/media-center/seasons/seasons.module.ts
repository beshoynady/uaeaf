import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Season, SeasonSchema } from './schemas/season.schema.js';
import { SeasonsRepository } from './seasons.repository.js';
import { SeasonsService } from './seasons.service.js';
import { SeasonsController } from './seasons.controller.js';
import { AlbumsModule } from '../albums/albums.module.js';
import { VideosModule } from '../videos/videos.module.js';
import { PublishingModule } from '../../workflow/publishing/publishing.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Season.name, schema: SeasonSchema }]),
    AlbumsModule,
    VideosModule,
    // Publishing is the engine's, not this module's — the controller wires
    // the two together, matching `ArticlesModule`'s convention.
    PublishingModule,
  ],
  controllers: [SeasonsController],
  providers: [SeasonsRepository, SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
