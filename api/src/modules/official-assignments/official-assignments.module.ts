import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OfficialAssignment, OfficialAssignmentSchema } from './schemas/official-assignment.schema.js';
import { OfficialAssignmentsRepository } from './official-assignments.repository.js';
import { OfficialAssignmentsService } from './official-assignments.service.js';
import { OfficialAssignmentsController } from './official-assignments.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: OfficialAssignment.name, schema: OfficialAssignmentSchema }])],
  controllers: [OfficialAssignmentsController],
  providers: [OfficialAssignmentsRepository, OfficialAssignmentsService],
  exports: [OfficialAssignmentsService],
})
export class OfficialAssignmentsModule {}
