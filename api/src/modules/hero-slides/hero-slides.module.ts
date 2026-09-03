import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HeroSlide, HeroSlideSchema } from './schemas/hero-slides.schema.js';
import { HeroSlidesRepository } from './hero-slides.repository.js';
import { HeroSlidesService } from './hero-slides.service.js';
import { HeroSlidesController } from './hero-slides.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HeroSlide.name, schema: HeroSlideSchema }]),
    MediaAssetsModule,
  ],
  controllers: [HeroSlidesController],
  providers: [HeroSlidesRepository, HeroSlidesService],
  exports: [HeroSlidesService],
})
export class HeroSlidesModule {}
