import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AthleteNationalTeamHistory,
  AthleteNationalTeamHistorySchema,
} from './schemas/athlete-national-team-history.schema.js';
import { AthleteNationalTeamHistoryRepository } from './athlete-national-team-history.repository.js';
import { AthleteNationalTeamHistoryService } from './athlete-national-team-history.service.js';
import { AthleteNationalTeamHistoryController } from './athlete-national-team-history.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AthleteNationalTeamHistory.name, schema: AthleteNationalTeamHistorySchema }]),
  ],
  controllers: [AthleteNationalTeamHistoryController],
  providers: [AthleteNationalTeamHistoryRepository, AthleteNationalTeamHistoryService],
  exports: [AthleteNationalTeamHistoryService],
})
export class AthleteNationalTeamHistoryModule {}
