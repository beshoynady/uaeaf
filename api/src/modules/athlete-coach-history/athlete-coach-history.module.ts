import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AthleteCoachHistory, AthleteCoachHistorySchema } from './schemas/athlete-coach-history.schema.js';
import { AthleteCoachHistoryRepository } from './athlete-coach-history.repository.js';
import { AthleteCoachHistoryService } from './athlete-coach-history.service.js';
import { AthleteCoachHistoryController } from './athlete-coach-history.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: AthleteCoachHistory.name, schema: AthleteCoachHistorySchema }])],
  controllers: [AthleteCoachHistoryController],
  providers: [AthleteCoachHistoryRepository, AthleteCoachHistoryService],
  exports: [AthleteCoachHistoryService],
})
export class AthleteCoachHistoryModule {}
