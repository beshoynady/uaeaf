import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from './schemas/membership.schema.js';
import { MembershipsRepository } from './memberships.repository.js';
import { MembershipsService } from './memberships.service.js';
import { MembershipsController } from './memberships.controller.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Membership.name, schema: MembershipSchema }]), MediaAssetsModule],
  controllers: [MembershipsController],
  providers: [MembershipsRepository, MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
