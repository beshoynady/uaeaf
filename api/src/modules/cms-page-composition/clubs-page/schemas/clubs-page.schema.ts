import { Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../../common/schemas/hero-page.schema.js';

export type ClubsPageDocument = HydratedDocument<ClubsPage>;

/** Implements: clubsPage collection, Domain 11 — CMS & Page Composition
 *  (live FigJam Physical Model, re-read fresh 2026-09-03). A hero wrapper
 *  for the public Clubs listing page: the board defines exactly the shared
 *  `heroImageId`/`heroTitle`/`heroSubtitle` trio and nothing else, so
 *  the fields come from `HeroPageSchema` rather than being restated here.
 *
 *  Singleton — at most one row, enforced in `ClubsPageService` (confirmed
 *  decision #8). Not workflow-governed: the board gives it no
 *  `publicationState` and it is absent from the Domain 7 closed
 *  entity-type lists, the same exemption class as `albums`. */
@Schema({ collection: 'clubsPage' })
export class ClubsPage extends HeroPageSchema {}

export const ClubsPageSchema = SchemaFactory.createForClass(ClubsPage);
