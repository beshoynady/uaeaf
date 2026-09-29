import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Article, ArticleSchema } from '../../public-communication/articles/schemas/article.schema.js';
import { Album, AlbumSchema } from '../../media-center/albums/schemas/album.schema.js';
import { Video, VideoSchema } from '../../media-center/videos/schemas/video.schema.js';
import { Club, ClubSchema } from '../../people-organizations/clubs/schemas/club.schema.js';
import { Athlete, AthleteSchema } from '../../people-organizations/athletes/schemas/athlete.schema.js';
import {
  AthleteProfile,
  AthleteProfileSchema,
} from '../../people-organizations/athlete-profiles/schemas/athlete-profile.schema.js';
import { Coach, CoachSchema } from '../../people-organizations/coaches/schemas/coach.schema.js';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';

/**
 * Registers only the models `SearchService` reads directly — none of the
 * six sources' owning modules are imported, since nothing here writes to
 * them or reuses their services, only their already-registered schemas.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Article.name, schema: ArticleSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Video.name, schema: VideoSchema },
      { name: Club.name, schema: ClubSchema },
      { name: Athlete.name, schema: AthleteSchema },
      { name: AthleteProfile.name, schema: AthleteProfileSchema },
      { name: Coach.name, schema: CoachSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
