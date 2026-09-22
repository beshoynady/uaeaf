import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CONTACT_MESSAGE_TYPES } from '../../../public-communication/contact-messages/schemas/contact-messages.schema.js';
import type { ContactMessageType } from '../../../public-communication/contact-messages/schemas/contact-messages.schema.js';
import { HeroPageDto } from '../../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { SocialLinkDto } from '../../../people-organizations/clubs/dto/social-link.dto.js';

/** Request shape for one `socialLinks[]` entry: the shared platform and URL,
 *  and on this page an optional icon of its own. */
export class ContactSocialLinkDto extends SocialLinkDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'A `mediaAssets` image drawn instead of the platform\'s built-in icon. Empty keeps the built-in one.',
  })
  @IsOptional()
  @IsMongoId()
  iconId?: string | null;
}

/** Request shape for one `phones[]` entry. */
export class LabelledPhoneDto {
  @ApiProperty({ type: LocalizedTextDto, description: 'e.g. Main Line / Help Center.' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  label: LocalizedTextDto;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  number: string;
}

/** Request shape for `address` — all parts plain strings, per the board. */
export class PostalAddressDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() country?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() emirate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() area?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() street?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() building?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() poBox?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() postalCode?: string;
}

/** Labels for the three contact cards that read their value from a dedicated
 *  field. The phone card is absent: its label is `phones[].label`. */
export class ContactCardLabelsDto {
  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  email?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  location?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  officeHours?: LocalizedTextDto;
}

/** One option in the message-type select. `value` is validated against the
 *  same closed vocabulary the submission endpoint enforces, so a relabelled
 *  option can never become one `POST /contact-messages` would reject. */
export class ContactMessageTypeLabelDto {
  @ApiProperty({ enum: CONTACT_MESSAGE_TYPES })
  @IsIn(CONTACT_MESSAGE_TYPES)
  value: ContactMessageType;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested() @Type(() => LocalizedTextDto)
  label: LocalizedTextDto;
}

/** Editable content of the message form. */
export class ContactFormContentDto {
  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  consentNote?: LocalizedTextDto;

  @ApiProperty({ type: [ContactMessageTypeLabelDto], required: false })
  @IsOptional() @IsArray() @ValidateNested({ each: true })
  @Type(() => ContactMessageTypeLabelDto)
  messageTypeLabels?: ContactMessageTypeLabelDto[];
}

/** Editable content of the map panel. */
export class ContactMapContentDto {
  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiProperty({ required: false, minimum: -90, maximum: 90, description: 'Where the live map is centred.' })
  @IsOptional() @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @ApiProperty({ required: false, minimum: -180, maximum: 180, description: 'Where the live map is centred.' })
  @IsOptional() @IsNumber() @Min(-180) @Max(180)
  longitude?: number;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  pinTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  pinSubtitle?: LocalizedTextDto;

  @ApiProperty({ required: false, description: 'Routing target, distinct from googleMapsUrl.' })
  @IsOptional() @IsString()
  directionsUrl?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional() @ValidateNested() @Type(() => LocalizedTextDto)
  note?: LocalizedTextDto;
}

/** Request body for PUT /contact-us-page. Singleton: one upsert DTO. */
export class UpsertContactUsPageDto extends HeroPageDto {
  @ApiProperty({ description: 'Public-facing contact address for the whole site.' })
  @IsEmail()
  email: string;

  @ApiProperty({ type: [LabelledPhoneDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabelledPhoneDto)
  phones?: LabelledPhoneDto[];

  @ApiProperty({ type: PostalAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PostalAddressDto)
  address?: PostalAddressDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  googleMapsUrl?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  officeHours?: LocalizedTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ type: [ContactSocialLinkDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactSocialLinkDto)
  socialLinks?: ContactSocialLinkDto[];

  @ApiProperty({
    type: LocalizedTextDto,
    required: false,
    description: 'One-line place name for the location card, not the postal address.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  locationSummary?: LocalizedTextDto;

  @ApiProperty({ type: ContactCardLabelsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactCardLabelsDto)
  cardLabels?: ContactCardLabelsDto;

  @ApiProperty({ type: ContactFormContentDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactFormContentDto)
  form?: ContactFormContentDto;

  @ApiProperty({ type: ContactMapContentDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactMapContentDto)
  map?: ContactMapContentDto;
}
