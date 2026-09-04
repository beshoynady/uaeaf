import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Coach, CoachSchema } from './schemas/coach.schema.js';
import { CoachesRepository } from './coaches.repository.js';
import { CoachesService } from './coaches.service.js';
import { CoachesController } from './coaches.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Coach.name, schema: CoachSchema }])],
  controllers: [CoachesController],
  providers: [CoachesRepository, CoachesService],
  exports: [CoachesService],
})
export class CoachesModule {}
