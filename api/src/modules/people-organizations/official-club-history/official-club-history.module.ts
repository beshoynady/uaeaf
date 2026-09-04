import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfficialClubHistory, OfficialClubHistorySchema } from './schemas/official-club-history.schema.js';
import { OfficialClubHistoryRepository } from './official-club-history.repository.js';
import { OfficialClubHistoryService } from './official-club-history.service.js';
import { OfficialClubHistoryController } from './official-club-history.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: OfficialClubHistory.name, schema: OfficialClubHistorySchema }])],
  controllers: [OfficialClubHistoryController],
  providers: [OfficialClubHistoryRepository, OfficialClubHistoryService],
  exports: [OfficialClubHistoryService],
})
export class OfficialClubHistoryModule {}
