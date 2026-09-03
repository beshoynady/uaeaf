import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AthleteProfile, AthleteProfileSchema } from './schemas/athlete-profile.schema.js';
import { AthleteProfilesRepository } from './athlete-profiles.repository.js';
import { AthleteProfilesService } from './athlete-profiles.service.js';
import { AthleteProfilesController } from './athlete-profiles.controller.js';
import { AthletesModule } from '../athletes/athletes.module.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AthleteProfile.name, schema: AthleteProfileSchema }]),
    AthletesModule,
    MediaAssetsModule,
  ],
  controllers: [AthleteProfilesController],
  providers: [AthleteProfilesRepository, AthleteProfilesService],
  exports: [AthleteProfilesService],
})
export class AthleteProfilesModule {}
