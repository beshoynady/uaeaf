import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactMessage, ContactMessageSchema } from './schemas/contact-messages.schema.js';
import { ContactMessagesRepository } from './contact-messages.repository.js';
import { ContactMessagesService } from './contact-messages.service.js';
import { ContactMessagesController } from './contact-messages.controller.js';
import { AuditLogsModule } from '../../workflow/audit-logs/audit-logs.module.js';
import { StepUpModule } from '../../../common/authz/step-up.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ContactMessage.name, schema: ContactMessageSchema }]),
    AuditLogsModule,
    StepUpModule,
  ],
  controllers: [ContactMessagesController],
  providers: [ContactMessagesRepository, ContactMessagesService],
  exports: [ContactMessagesService],
})
export class ContactMessagesModule {}
