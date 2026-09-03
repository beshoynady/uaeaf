import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Album } from './schemas/album.schema.js';
import type { AlbumDocument } from './schemas/album.schema.js';

/** Implements: albums collection, Domain 5 — Media Center. */
@Injectable()
export class AlbumsRepository extends BaseRepository<AlbumDocument> {
  constructor(@InjectModel(Album.name) model: Model<AlbumDocument>) {
    super(model);
  }
}
