import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AboutFederationPagesRepository } from './about-federation-page.repository.js';
import type { AboutFederationPageDocument } from './schemas/about-federation-page.schema.js';
import { CreateAboutFederationPageDto } from './dto/create-about-federation-page.dto.js';
import { PublicationsService } from '../workflow/publications/publications.service.js';
import { RevisionsService } from '../workflow/revisions/revisions.service.js';
import { MediaAssetsService } from '../media-center/media-assets/media-assets.service.js';

/** Implements: aboutFederationPage collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B), wired like Week 3's
 *  `DocumentsService` mode (a). */
@Injectable()
export class AboutFederationPagesService {
  constructor(
    private readonly repository: AboutFederationPagesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  async create(dto: CreateAboutFederationPageDto): Promise<AboutFederationPageDocument> {
    if (dto.heroImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.heroImageId);
    }
    if (dto.firstPresidentPhoto) {
      await this.mediaAssetsService.assertUsableImage(dto.firstPresidentPhoto);
    }

    return this.repository.create({
      heroImageId: dto.heroImageId ? new Types.ObjectId(dto.heroImageId) : null,
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      foundingDate: new Date(dto.foundingDate),
      historicalIntro: dto.historicalIntro,
      foundingDecreeCaption: dto.foundingDecreeCaption,
      roleHeading: dto.roleHeading,
      roleText: dto.roleText,
      globalMembershipYear: dto.globalMembershipYear,
      globalMembershipHeading: dto.globalMembershipHeading,
      globalMembershipText: dto.globalMembershipText,
      firstPresidentPhoto: dto.firstPresidentPhoto
        ? new Types.ObjectId(dto.firstPresidentPhoto)
        : null,
      firstPresidentName: dto.firstPresidentName,
      firstPresidentTitle: dto.firstPresidentTitle,
      firstPresidentBio: dto.firstPresidentBio,
      achievements: dto.achievements ?? [],
      publicationState: dto.publicationState,
    });
  }

  async findAll(): Promise<AboutFederationPageDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AboutFederationPageDocument | null> {
    return this.repository.findById(id);
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule). */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot('aboutFederationPage', new Types.ObjectId(id));
  }

  /** @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable('aboutFederationPage', new Types.ObjectId(id));
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AboutFederationPageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
