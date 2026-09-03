import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NavigationMenu, NavigationMenuSchema } from './schemas/navigation-menus.schema.js';
import { NavigationMenusRepository } from './navigation-menus.repository.js';
import { NavigationMenusService } from './navigation-menus.service.js';
import { NavigationMenusController } from './navigation-menus.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NavigationMenu.name, schema: NavigationMenuSchema }]),
  ],
  controllers: [NavigationMenusController],
  providers: [NavigationMenusRepository, NavigationMenusService],
  exports: [NavigationMenusService],
})
export class NavigationMenusModule {}
