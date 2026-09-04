import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteSettings, SiteSettingsSchema } from './schemas/site-settings.schema.js';
import { SiteSettingsRepository } from './site-settings.repository.js';
import { SiteSettingsService } from './site-settings.service.js';
import { SiteSettingsController } from './site-settings.controller.js';
import { MediaAssetsModule } from '../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SiteSettings.name, schema: SiteSettingsSchema }]),
    MediaAssetsModule,
  ],
  controllers: [SiteSettingsController],
  providers: [SiteSettingsRepository, SiteSettingsService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
