import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfficialProfile, OfficialProfileSchema } from './schemas/official-profile.schema.js';
import { OfficialProfilesRepository } from './official-profiles.repository.js';
import { OfficialProfilesService } from './official-profiles.service.js';
import { OfficialProfilesController } from './official-profiles.controller.js';
import { OfficialsModule } from '../officials/officials.module.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OfficialProfile.name, schema: OfficialProfileSchema }]),
    OfficialsModule,
    MediaAssetsModule,
  ],
  controllers: [OfficialProfilesController],
  providers: [OfficialProfilesRepository, OfficialProfilesService],
  exports: [OfficialProfilesService],
})
export class OfficialProfilesModule {}
