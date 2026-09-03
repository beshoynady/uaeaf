import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { HeroSlide } from './schemas/hero-slides.schema.js';
import type { HeroSlideDocument } from './schemas/hero-slides.schema.js';

/** Implements: heroSlides collection, Domain 11 — CMS & Page Composition. */
@Injectable()
export class HeroSlidesRepository extends BaseRepository<HeroSlideDocument> {
  constructor(@InjectModel(HeroSlide.name) model: Model<HeroSlideDocument>) {
    super(model);
  }
}
