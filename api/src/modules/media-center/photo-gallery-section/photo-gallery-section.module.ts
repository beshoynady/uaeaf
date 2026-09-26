import { Module } from '@nestjs/common';
import { PageSectionsModule } from '../../cms-page-composition/page-sections/page-sections.module.js';
import { AlbumsModule } from '../albums/albums.module.js';
import { PhotoGallerySectionController } from './photo-gallery-section.controller.js';
import { PhotoGallerySectionService } from './photo-gallery-section.service.js';

/** Reads two things that already exist and composes them; owns no collection
 *  of its own. */
@Module({
  imports: [PageSectionsModule, AlbumsModule],
  controllers: [PhotoGallerySectionController],
  providers: [PhotoGallerySectionService],
})
export class PhotoGallerySectionModule {}
