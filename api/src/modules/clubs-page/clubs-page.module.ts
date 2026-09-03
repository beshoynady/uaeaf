import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClubsPage, ClubsPageSchema } from './schemas/clubs-page.schema.js';
import { ClubsPageRepository } from './clubs-page.repository.js';
import { ClubsPageService } from './clubs-page.service.js';
import { ClubsPageController } from './clubs-page.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ClubsPage.name, schema: ClubsPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [ClubsPageController],
  providers: [ClubsPageRepository, ClubsPageService],
  exports: [ClubsPageService],
})
export class ClubsPageModule {}
