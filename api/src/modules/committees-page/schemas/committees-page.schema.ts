import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';

export type CommitteesPageDocument = HydratedDocument<CommitteesPage>;

/** Implements: committeesPage collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  The hero/intro wrapper for the public Committees listing page — the
 *  committee records themselves live in the separate, workflow-governed
 *  `committees` collection. This wrapper is NOT workflow-governed: the
 *  board gives it no `publicationState` and it is absent from both Domain 7
 *  closed lists (same exemption class as `albums`).
 *
 *  Singleton — at most one row, enforced in `CommitteesPagesService`
 *  (confirmed decision #8). */
@Schema({ collection: 'committeesPage' })
export class CommitteesPage extends HeroPageSchema {
  /** e.g. "حوكمة وتمكين". */
  @Prop({ type: LocalizedTextSchema, required: true })
  introHeading: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  introText: LocalizedText;
}

export const CommitteesPageSchema = SchemaFactory.createForClass(CommitteesPage);
