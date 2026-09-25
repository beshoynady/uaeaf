import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AboutFederationPage, AboutFederationPageSchema } from './schemas/about-federation-page.schema.js';
import { AboutFederationPagesRepository } from './about-federation-page.repository.js';
import { AboutFederationPagesService } from './about-federation-page.service.js';
import { AboutFederationStatsService } from './about-federation-stats.service.js';
import { AboutFederationPagesController } from './about-federation-page.controller.js';
import { PublicationsModule } from '../../workflow/publications/publications.module.js';
import { RevisionsModule } from '../../workflow/revisions/revisions.module.js';
import { PublishingModule } from '../../workflow/publishing/publishing.module.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';
import { FederationAppointmentsModule } from '../federation-appointments/federation-appointments.module.js';
import { Club, ClubSchema } from '../../people-organizations/clubs/schemas/club.schema.js';
import { Athlete, AthleteSchema } from '../../people-organizations/athletes/schemas/athlete.schema.js';
import { Official, OfficialSchema } from '../../people-organizations/officials/schemas/official.schema.js';

/**
 * The three record collections are registered here only to be counted.
 *
 * Registering the same model+schema pair in a second module's `forFeature()`
 * is safe — Mongoose reuses the already-compiled model for a given
 * connection+name while the schema instance is reference-identical, which it
 * is here. Importing each owning module instead would pull its controllers
 * and services in for the sake of a `countDocuments`, and the ecosystem
 * section needs nothing else from them.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AboutFederationPage.name, schema: AboutFederationPageSchema },
      { name: Club.name, schema: ClubSchema },
      { name: Athlete.name, schema: AthleteSchema },
      { name: Official.name, schema: OfficialSchema },
    ]),
    PublicationsModule,
    RevisionsModule,
    PublishingModule,
    MediaAssetsModule,
    // The leadership panel names whoever is serving now; the board module
    // owns that fact.
    FederationAppointmentsModule,
  ],
  controllers: [AboutFederationPagesController],
  providers: [AboutFederationPagesRepository, AboutFederationPagesService, AboutFederationStatsService],
  exports: [AboutFederationPagesService],
})
export class AboutFederationPagesModule {}
