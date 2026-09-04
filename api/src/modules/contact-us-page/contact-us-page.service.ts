import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../media-center/media-assets/media-assets.service.js';
import { ContactUsPagesRepository } from './contact-us-page.repository.js';
import type { ContactUsPageDocument } from './schemas/contact-us-page.schema.js';
import { UpsertContactUsPageDto } from './dto/upsert-contact-us-page.dto.js';

/** Implements: contactUsPage collection, Domain 1 — Federation &
 *  Governance. Singleton (decision #8) — see `SingletonPageService`. */
@Injectable()
export class ContactUsPagesService extends SingletonPageService<ContactUsPageDocument> {
  constructor(
    repository: ContactUsPagesRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  async upsert(dto: UpsertContactUsPageDto): Promise<ContactUsPageDocument> {
    if (dto.heroImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.heroImageId);
    }
    return this.upsertDocument({
      heroImageId: dto.heroImageId ? new Types.ObjectId(dto.heroImageId) : null,
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      email: dto.email,
      phones: dto.phones ?? [],
      address: dto.address
        ? {
            country: dto.address.country ?? null,
            emirate: dto.address.emirate ?? null,
            city: dto.address.city ?? null,
            area: dto.address.area ?? null,
            street: dto.address.street ?? null,
            building: dto.address.building ?? null,
            poBox: dto.address.poBox ?? null,
            postalCode: dto.address.postalCode ?? null,
          }
        : null,
      googleMapsUrl: dto.googleMapsUrl ?? null,
      officeHours: dto.officeHours ?? null,
      website: dto.website ?? null,
      socialLinks: dto.socialLinks ?? [],
    });
  }
}
