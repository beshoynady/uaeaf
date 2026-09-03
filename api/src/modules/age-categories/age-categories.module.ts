import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgeCategory, AgeCategorySchema } from './schemas/age-category.schema.js';
import { AgeCategoriesRepository } from './age-categories.repository.js';
import { AgeCategoriesService } from './age-categories.service.js';
import { AgeCategoriesController } from './age-categories.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: AgeCategory.name, schema: AgeCategorySchema }])],
  controllers: [AgeCategoriesController],
  providers: [AgeCategoriesRepository, AgeCategoriesService],
  exports: [AgeCategoriesService],
})
export class AgeCategoriesModule {}
