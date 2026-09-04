import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AthleteGuardianRelationship,
  AthleteGuardianRelationshipSchema,
} from './schemas/athlete-guardian-relationship.schema.js';
import { AthleteGuardianRelationshipsRepository } from './athlete-guardian-relationships.repository.js';
import { AthleteGuardianRelationshipsService } from './athlete-guardian-relationships.service.js';
import { AthleteGuardianRelationshipsController } from './athlete-guardian-relationships.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AthleteGuardianRelationship.name, schema: AthleteGuardianRelationshipSchema }]),
  ],
  controllers: [AthleteGuardianRelationshipsController],
  providers: [AthleteGuardianRelationshipsRepository, AthleteGuardianRelationshipsService],
  exports: [AthleteGuardianRelationshipsService],
})
export class AthleteGuardianRelationshipsModule {}
