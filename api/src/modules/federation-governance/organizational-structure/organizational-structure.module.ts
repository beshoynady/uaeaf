import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationalStructureNode, OrganizationalStructureNodeSchema } from './schemas/organizational-structure.schema.js';
import { OrganizationalStructureNodesRepository } from './organizational-structure.repository.js';
import { OrganizationalStructureNodesService } from './organizational-structure.service.js';
import { OrganizationalStructureNodesController } from './organizational-structure.controller.js';
import { PublicationsModule } from '../../workflow/publications/publications.module.js';
import { RevisionsModule } from '../../workflow/revisions/revisions.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OrganizationalStructureNode.name, schema: OrganizationalStructureNodeSchema }]),
    PublicationsModule,
    RevisionsModule,
  ],
  controllers: [OrganizationalStructureNodesController],
  providers: [OrganizationalStructureNodesRepository, OrganizationalStructureNodesService],
  exports: [OrganizationalStructureNodesService],
})
export class OrganizationalStructureNodesModule {}
