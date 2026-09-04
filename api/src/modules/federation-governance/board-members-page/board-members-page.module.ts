import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoardMembersPage, BoardMembersPageSchema } from './schemas/board-members-page.schema.js';
import { BoardMembersPageRepository } from './board-members-page.repository.js';
import { BoardMembersPageService } from './board-members-page.service.js';
import { BoardMembersPageController } from './board-members-page.controller.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BoardMembersPage.name, schema: BoardMembersPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [BoardMembersPageController],
  providers: [BoardMembersPageRepository, BoardMembersPageService],
  exports: [BoardMembersPageService],
})
export class BoardMembersPageModule {}
