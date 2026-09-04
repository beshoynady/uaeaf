import { Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../common/schemas/hero-page.schema.js';

export type VideosPageDocument = HydratedDocument<VideosPage>;

/** Implements: videosPage collection, Domain 11 — CMS & Page Composition.
 *  A hero wrapper for the public Videos listing page: the actual video
 *  listing is queried directly from `videos`, exactly like `athletesPage`
 *  queries `athletes`/`athleteProfiles` — this collection carries only the
 *  shared `heroImageId`/`heroTitle`/`heroSubtitle` trio from
 *  `HeroPageSchema` and nothing else.
 *
 *  Singleton — at most one row, enforced in `VideosPageService`. Not
 *  workflow-governed: absent from the Domain 7 closed entity-type lists
 *  (`common/constants/workflow-entity-types.ts`), the same exemption class
 *  as `videos` and `athletesPage` (2026-09-04 follow-on to ADR-0054). */
@Schema({ collection: 'videosPage' })
export class VideosPage extends HeroPageSchema {}

export const VideosPageSchema = SchemaFactory.createForClass(VideosPage);
