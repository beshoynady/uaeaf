import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Discipline, DisciplineSchema } from './schemas/discipline.schema.js';
import { DisciplinesRepository } from './disciplines.repository.js';
import { DisciplinesService } from './disciplines.service.js';
import { DisciplinesController } from './disciplines.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Discipline.name, schema: DisciplineSchema }])],
  controllers: [DisciplinesController],
  providers: [DisciplinesRepository, DisciplinesService],
  exports: [DisciplinesService],
})
export class DisciplinesModule {}
