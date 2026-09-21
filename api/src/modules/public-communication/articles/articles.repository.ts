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

  /**
   * The newsroom counted, in one pass over the collection.
   *
   * One `$facet` rather than six `countDocuments` calls: the screen draws the
   * numbers side by side, and six round trips would let them disagree — a
   * state count taken before a publish and a category count taken after it
   * describe two different newsrooms.
   *
   * Soft-deleted rows are excluded, so the numbers match what the list shows.
   * `archived` is counted separately because it is a flag over `Live`, not a
   * state beside it: an archived article is inside the `Live` figure too, and
   * a reader needs both to make sense of either.
   */
  async summarise(): Promise<{
    byState: Record<string, number>;
    byCategory: Record<string, number>;
    archived: number;
  }> {
    const [result] = await this.model
      .aggregate<{
        byState: { _id: string; n: number }[];
        byCategory: { _id: string; n: number }[];
        archived: { n: number }[];
      }>([
        { $match: { archivedAt: null } },
        {
          $facet: {
            byState: [{ $group: { _id: '$publicationState', n: { $sum: 1 } } }],
            byCategory: [{ $group: { _id: '$category', n: { $sum: 1 } } }],
            archived: [{ $match: { archived: true } }, { $count: 'n' }],
          },
        },
      ])
      .exec();

    const tally = (rows: { _id: string; n: number }[] = []) =>
      Object.fromEntries(rows.map((row) => [row._id, row.n]));

    return {
      byState: tally(result?.byState),
      byCategory: tally(result?.byCategory),
      // `$count` emits no document at all for an empty match, which reads as
      // `undefined` rather than zero.
      archived: result?.archived?.[0]?.n ?? 0,
    };
  }
}
