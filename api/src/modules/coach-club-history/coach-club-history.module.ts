import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoachClubHistory, CoachClubHistorySchema } from './schemas/coach-club-history.schema.js';
import { CoachClubHistoryRepository } from './coach-club-history.repository.js';
import { CoachClubHistoryService } from './coach-club-history.service.js';
import { CoachClubHistoryController } from './coach-club-history.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: CoachClubHistory.name, schema: CoachClubHistorySchema }])],
  controllers: [CoachClubHistoryController],
  providers: [CoachClubHistoryRepository, CoachClubHistoryService],
  exports: [CoachClubHistoryService],
})
export class CoachClubHistoryModule {}
