import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StrategicPlansPage, StrategicPlansPageSchema } from './schemas/strategic-plans-page.schema.js';
import { StrategicPlansPagesRepository } from './strategic-plans-page.repository.js';
import { StrategicPlansPagesService } from './strategic-plans-page.service.js';
import { StrategicPlansPagesController } from './strategic-plans-page.controller.js';
import { PublicationsModule } from '../../workflow/publications/publications.module.js';
import { RevisionsModule } from '../../workflow/revisions/revisions.module.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StrategicPlansPage.name, schema: StrategicPlansPageSchema }]),
    PublicationsModule,
    RevisionsModule,
    MediaAssetsModule,
  ],
  controllers: [StrategicPlansPagesController],
  providers: [StrategicPlansPagesRepository, StrategicPlansPagesService],
  exports: [StrategicPlansPagesService],
})
export class StrategicPlansPagesModule {}
