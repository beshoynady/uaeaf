import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NavigationItem, NavigationItemSchema } from './schemas/navigation-items.schema.js';
import { NavigationItemsRepository } from './navigation-items.repository.js';
import { NavigationItemsService } from './navigation-items.service.js';
import { NavigationItemsController } from './navigation-items.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NavigationItem.name, schema: NavigationItemSchema }]),
  ],
  controllers: [NavigationItemsController],
  providers: [NavigationItemsRepository, NavigationItemsService],
  exports: [NavigationItemsService],
})
export class NavigationItemsModule {}
