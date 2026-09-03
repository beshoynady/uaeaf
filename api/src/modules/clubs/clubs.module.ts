import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Club, ClubSchema } from './schemas/club.schema.js';
import { ClubsRepository } from './clubs.repository.js';
import { ClubsService } from './clubs.service.js';
import { ClubsController } from './clubs.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Club.name, schema: ClubSchema }])],
  controllers: [ClubsController],
  providers: [ClubsRepository, ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}
