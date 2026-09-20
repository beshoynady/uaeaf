import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Article, ArticleSchema } from './schemas/article.schema.js';
import { ArticlesRepository } from './articles.repository.js';
import { ArticlesService } from './articles.service.js';
import { ArticlesController } from './articles.controller.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';
import { PublicationsModule } from '../../workflow/publications/publications.module.js';
import { PublishingModule } from '../../workflow/publishing/publishing.module.js';
import { AuditLogsModule } from '../../workflow/audit-logs/audit-logs.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Article.name, schema: ArticleSchema }]),
    MediaAssetsModule,
    // The article row is read for identity and order; every word a visitor
    // reads comes from the publication's revision.
    PublicationsModule,
    // Reviewing and publishing are the engine's, not this module's. The
    // controller wires the two together.
    PublishingModule,
    // `ArticlesService` writes its own short audit rows, because the global
    // interceptor would write the whole TipTap body instead.
    AuditLogsModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesRepository, ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
