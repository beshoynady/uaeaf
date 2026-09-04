import { Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../common/schemas/hero-page.schema.js';

export type AlbumsPageDocument = HydratedDocument<AlbumsPage>;

/** Implements: albumsPage collection, Domain 11 — CMS & Page Composition.
 *  A hero wrapper for the public Albums gallery listing page: the actual
 *  album listing is queried directly from `albums`, exactly like
 *  `athletesPage` queries `athletes`/`athleteProfiles` — this collection
 *  carries only the shared `heroImageId`/`heroTitle`/`heroSubtitle` trio
 *  from `HeroPageSchema` and nothing else.
 *
 *  Singleton — at most one row, enforced in `AlbumsPageService`. Not
 *  workflow-governed: absent from the Domain 7 closed entity-type lists
 *  (`common/constants/workflow-entity-types.ts`), the same exemption class
 *  as `albums` and `athletesPage` (2026-09-04 follow-on to ADR-0054). */
@Schema({ collection: 'albumsPage' })
export class AlbumsPage extends HeroPageSchema {}

export const AlbumsPageSchema = SchemaFactory.createForClass(AlbumsPage);
