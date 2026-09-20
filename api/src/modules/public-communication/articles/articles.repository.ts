import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { QueryFilter } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Article } from './schemas/article.schema.js';
import type { ArticleDocument } from './schemas/article.schema.js';

/** Implements: articles collection, Domain 4 — News & Editorial. */
@Injectable()
export class ArticlesRepository extends BaseRepository<ArticleDocument> {
  constructor(@InjectModel(Article.name) model: Model<ArticleDocument>) {
    super(model);
  }

  /** One article by its public URL segment. Soft-delete aware through
   *  `findOne`, which is what makes a deleted article's slug reusable. */
  async findBySlug(slug: string): Promise<ArticleDocument | null> {
    return this.findOne({ slug } as QueryFilter<ArticleDocument>);
  }

  /**
   * A page of articles, newest first.
   *
   * Sorted here rather than by the caller because both listings want the same
   * order and neither wants Mongo's natural one: the newsroom reads its own
   * list newest-first, and so does a visitor.
   *
   * `publishDate` is null on everything unpublished, so `createdAt` breaks the
   * tie and keeps drafts in a stable, meaningful order among themselves.
   */
  async findPage(
    filter: QueryFilter<ArticleDocument>,
    skip: number,
    limit: number,
  ): Promise<{ items: ArticleDocument[]; total: number }> {
    const scoped = { ...filter, archivedAt: null } as QueryFilter<ArticleDocument>;
    const [items, total] = await Promise.all([
      this.model.find(scoped).sort({ publishDate: -1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(scoped).exec(),
    ]);
    return { items, total };
  }
}
