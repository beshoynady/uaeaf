import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AthletesPage, AthletesPageSchema } from './schemas/athletes-page.schema.js';
import { AthletesPageRepository } from './athletes-page.repository.js';
import { AthletesPageService } from './athletes-page.service.js';
import { AthletesPageController } from './athletes-page.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AthletesPage.name, schema: AthletesPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [AthletesPageController],
  providers: [AthletesPageRepository, AthletesPageService],
  exports: [AthletesPageService],
})
export class AthletesPageModule {}
