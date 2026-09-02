import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Publication, PublicationSchema } from './schemas/publication.schema.js';
import { PublicationsRepository } from './publications.repository.js';
import { PublicationsService } from './publications.service.js';
import { PublicationsController } from './publications.controller.js';
import { RevisionsModule } from '../revisions/revisions.module.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Publication.name, schema: PublicationSchema }]), RevisionsModule],
  controllers: [PublicationsController],
  providers: [PublicationsRepository, PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}
