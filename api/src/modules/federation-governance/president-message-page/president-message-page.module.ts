import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PresidentMessagePage, PresidentMessagePageSchema } from './schemas/president-message-page.schema.js';
import { PresidentMessagePagesRepository } from './president-message-page.repository.js';
import { PresidentMessagePagesService } from './president-message-page.service.js';
import { PresidentMessagePagesController } from './president-message-page.controller.js';
import { PublicationsModule } from '../../workflow/publications/publications.module.js';
import { RevisionsModule } from '../../workflow/revisions/revisions.module.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PresidentMessagePage.name, schema: PresidentMessagePageSchema }]),
    PublicationsModule,
    RevisionsModule,
    MediaAssetsModule,
  ],
  controllers: [PresidentMessagePagesController],
  providers: [PresidentMessagePagesRepository, PresidentMessagePagesService],
  exports: [PresidentMessagePagesService],
})
export class PresidentMessagePagesModule {}
