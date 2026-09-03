import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AthleteClubHistory, AthleteClubHistorySchema } from './schemas/athlete-club-history.schema.js';
import { AthleteClubHistoryRepository } from './athlete-club-history.repository.js';
import { AthleteClubHistoryService } from './athlete-club-history.service.js';
import { AthleteClubHistoryController } from './athlete-club-history.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: AthleteClubHistory.name, schema: AthleteClubHistorySchema }])],
  controllers: [AthleteClubHistoryController],
  providers: [AthleteClubHistoryRepository, AthleteClubHistoryService],
  exports: [AthleteClubHistoryService],
})
export class AthleteClubHistoryModule {}
