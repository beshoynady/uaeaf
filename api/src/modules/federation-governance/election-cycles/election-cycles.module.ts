import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ElectionCycle, ElectionCycleSchema } from './schemas/election-cycles.schema.js';
import { ElectionCyclesRepository } from './election-cycles.repository.js';
import { ElectionCyclesService } from './election-cycles.service.js';
import { ElectionCyclesController } from './election-cycles.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ElectionCycle.name, schema: ElectionCycleSchema }]),
  ],
  controllers: [ElectionCyclesController],
  providers: [ElectionCyclesRepository, ElectionCyclesService],
  exports: [ElectionCyclesService],
})
export class ElectionCyclesModule {}
