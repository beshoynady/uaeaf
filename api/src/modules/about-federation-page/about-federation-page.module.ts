import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AboutFederationPage, AboutFederationPageSchema } from './schemas/about-federation-page.schema.js';
import { AboutFederationPagesRepository } from './about-federation-page.repository.js';
import { AboutFederationPagesService } from './about-federation-page.service.js';
import { AboutFederationPagesController } from './about-federation-page.controller.js';
import { PublicationsModule } from '../workflow/publications/publications.module.js';
import { RevisionsModule } from '../workflow/revisions/revisions.module.js';
import { MediaAssetsModule } from '../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AboutFederationPage.name, schema: AboutFederationPageSchema }]),
    PublicationsModule,
    RevisionsModule,
    MediaAssetsModule,
  ],
  controllers: [AboutFederationPagesController],
  providers: [AboutFederationPagesRepository, AboutFederationPagesService],
  exports: [AboutFederationPagesService],
})
export class AboutFederationPagesModule {}
