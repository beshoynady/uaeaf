import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClubTeam, ClubTeamSchema } from './schemas/club-team.schema.js';
import { ClubTeamsRepository } from './club-teams.repository.js';
import { ClubTeamsService } from './club-teams.service.js';
import { ClubTeamsController } from './club-teams.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ClubTeam.name, schema: ClubTeamSchema }])],
  controllers: [ClubTeamsController],
  providers: [ClubTeamsRepository, ClubTeamsService],
  exports: [ClubTeamsService],
})
export class ClubTeamsModule {}
