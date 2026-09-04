import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CONTACT_MESSAGE_TYPES, CONTACT_MESSAGE_REPLY_CHANNELS } from '../schemas/contact-messages.schema.js';
import type { ContactMessageType, ContactMessageReplyChannel } from '../schemas/contact-messages.schema.js';

/** Request body for the PUBLIC contact form (POST /contact-messages).
 *
 *  Deliberately accepts ONLY what a citizen legitimately supplies. Every
 *  operational field — `status`, `hardDeleteEligibleAt`, `assignedToId`,
 *  `assignedToType`, `workflowInstanceId`, and all four reply fields — is
 *  server- or staff-controlled and is NOT accepted here, so an anonymous
 *  submitter can never pre-set triage state or forge a reply record. */
export class CreateContactMessageDto {
  @ApiProperty({ enum: CONTACT_MESSAGE_TYPES })
  @IsIn(CONTACT_MESSAGE_TYPES)
  messageType: ContactMessageType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  senderName: string;

  @ApiProperty()
  @IsEmail()
  senderEmail: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  senderPhone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  messageBody: string;
}

/** Request body for PATCH /contact-messages/:id/reply — staff only. */
export class ReplyToContactMessageDto {
  @ApiProperty({ description: 'The reply text. Recording only — the system does not send it.' })
  @IsString()
  @MinLength(1)
  replyBody: string;

  @ApiProperty({ enum: CONTACT_MESSAGE_REPLY_CHANNELS })
  @IsIn(CONTACT_MESSAGE_REPLY_CHANNELS)
  replyChannel: ContactMessageReplyChannel;
}
