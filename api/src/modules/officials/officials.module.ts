import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Official, OfficialSchema } from './schemas/official.schema.js';
import { OfficialsRepository } from './officials.repository.js';
import { OfficialsService } from './officials.service.js';
import { OfficialsController } from './officials.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Official.name, schema: OfficialSchema }])],
  controllers: [OfficialsController],
  providers: [OfficialsRepository, OfficialsService],
  exports: [OfficialsService],
})
export class OfficialsModule {}
