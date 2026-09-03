import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactUsPage, ContactUsPageSchema } from './schemas/contact-us-page.schema.js';
import { ContactUsPagesRepository } from './contact-us-page.repository.js';
import { ContactUsPagesService } from './contact-us-page.service.js';
import { ContactUsPagesController } from './contact-us-page.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ContactUsPage.name, schema: ContactUsPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [ContactUsPagesController],
  providers: [ContactUsPagesRepository, ContactUsPagesService],
  exports: [ContactUsPagesService],
})
export class ContactUsPagesModule {}
