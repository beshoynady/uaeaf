import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Athlete, AthleteSchema } from './schemas/athlete.schema.js';
import { AthletesRepository } from './athletes.repository.js';
import { AthletesService } from './athletes.service.js';
import { AthletesController } from './athletes.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Athlete.name, schema: AthleteSchema }])],
  controllers: [AthletesController],
  providers: [AthletesRepository, AthletesService],
  exports: [AthletesService],
})
export class AthletesModule {}
