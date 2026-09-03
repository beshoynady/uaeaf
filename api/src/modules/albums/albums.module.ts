import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from './schemas/album.schema.js';
import { AlbumsRepository } from './albums.repository.js';
import { AlbumsService } from './albums.service.js';
import { AlbumsController } from './albums.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Album.name, schema: AlbumSchema }]), MediaAssetsModule],
  controllers: [AlbumsController],
  providers: [AlbumsRepository, AlbumsService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
