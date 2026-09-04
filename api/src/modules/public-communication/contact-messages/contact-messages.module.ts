import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactMessage, ContactMessageSchema } from './schemas/contact-messages.schema.js';
import { ContactMessagesRepository } from './contact-messages.repository.js';
import { ContactMessagesService } from './contact-messages.service.js';
import { ContactMessagesController } from './contact-messages.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ContactMessage.name, schema: ContactMessageSchema }])],
  controllers: [ContactMessagesController],
  providers: [ContactMessagesRepository, ContactMessagesService],
  exports: [ContactMessagesService],
})
export class ContactMessagesModule {}
