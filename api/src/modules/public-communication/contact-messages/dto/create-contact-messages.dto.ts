import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CONTACT_MESSAGE_TYPES, CONTACT_MESSAGE_REPLY_CHANNELS } from '../schemas/contact-messages.schema.js';
import type { ContactMessageType, ContactMessageReplyChannel } from '../schemas/contact-messages.schema.js';

/** Request body for the PUBLIC contact form (POST /contact-messages).
 *
 *  Deliberately accepts ONLY what a citizen legitimately supplies. Every
 *  operational field — `status`, `hardDeleteEligibleAt`, `assignedToId`,
 *  `assignedToType`, `workflowInstanceId`, and all four reply fields — is
 *  server- or staff-controlled and is NOT accepted here, so an anonymous
 *  submitter can never pre-set triage state or forge a reply record.
 *
 *  `@MaxLength()` on every free-text field (schema-audit-2026-09-04.md
 *  §3.7, P1 finding): this is the platform's only unauthenticated write
 *  route — an anonymous caller had no bound on `senderName`/`messageBody`
 *  length beyond the framework's request-body size default (see also the
 *  explicit body-size limit added in `main.ts`). */
export class CreateContactMessageDto {
  @ApiProperty({ enum: CONTACT_MESSAGE_TYPES })
  @IsIn(CONTACT_MESSAGE_TYPES)
  messageType: ContactMessageType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  senderName: string;

  /** Optional as of 2026-09-10, by the product owner's decision. The pair
   *  below inverted: a telephone number reaches a citizen in this country
   *  more reliably than an email address does, and `replyChannel` already
   *  models both as equals. Still validated when supplied — an address that
   *  cannot receive is worse than none, because it looks like a channel.
   *
   *  Bilingual `message` strings on this pair specifically: ADR-0058 makes
   *  `code` the thing a client branches on and leaves `message` for a human
   *  reading a log, which is why nothing else here carries one. These two
   *  changed meaning, so an integrator who built against the old contract
   *  gets told what happened in a language they read rather than a bare
   *  English default from class-validator. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail({}, { message: 'senderEmail: أدخل بريدًا إلكترونيًا صحيحًا — enter a valid email address.' })
  @MaxLength(254)
  senderEmail?: string;

  /** Required as of 2026-09-10 — see `senderEmail` above. The Mongoose schema
   *  deliberately does NOT mirror this as `required: true`: every message
   *  stored before today was accepted without a telephone, and a schema-level
   *  requirement would fail validation the next time a staff member saved a
   *  reply onto one of them. This is the only public write path, so enforcing
   *  it here enforces it everywhere it can be enforced without breaking rows
   *  that were legitimate when they were written. */
  @ApiProperty()
  /** Trimmed before it is judged. `@IsNotEmpty()` rejects `''`, `null` and
   *  `undefined` and nothing else, so a body posting `"   "` satisfied a
   *  *required* field with no telephone number in it — the public form trims,
   *  but this endpoint must not depend on the form. The global
   *  `ValidationPipe` runs with `transform: true`, so what is stored is the
   *  trimmed value as well. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'senderPhone: رقم الهاتف مطلوب — a phone number is required.' })
  @MaxLength(30)
  senderPhone: string;

  @ApiProperty({
    required: false,
    description: "The form's subject line. Optional: the public form does not require it.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  messageBody: string;
}

/** Request body for PATCH /contact-messages/:id/reply — staff only. */
export class ReplyToContactMessageDto {
  @ApiProperty({ description: 'The reply text. Recording only — the system does not send it.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  replyBody: string;

  @ApiProperty({ enum: CONTACT_MESSAGE_REPLY_CHANNELS })
  @IsIn(CONTACT_MESSAGE_REPLY_CHANNELS)
  replyChannel: ContactMessageReplyChannel;
}
