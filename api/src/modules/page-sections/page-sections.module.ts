import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PageSection, PageSectionSchema } from './schemas/page-sections.schema.js';
import { PageSectionsRepository } from './page-sections.repository.js';
import { PageSectionsService } from './page-sections.service.js';
import { PageSectionsController } from './page-sections.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PageSection.name, schema: PageSectionSchema }]),
  ],
  controllers: [PageSectionsController],
  providers: [PageSectionsRepository, PageSectionsService],
  exports: [PageSectionsService],
})
export class PageSectionsModule {}
