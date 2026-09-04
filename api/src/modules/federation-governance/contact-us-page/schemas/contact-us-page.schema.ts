import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { SocialLink, SocialLinkSchema } from '../../../../common/schemas/social-link.schema.js';

export type ContactUsPageDocument = HydratedDocument<ContactUsPage>;

/** One labelled phone number, e.g. Main Line / Help Center. */
@Schema({ _id: false })
export class LabelledPhone {
  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;

  @Prop({ type: String, required: true })
  number: string;
}

export const LabelledPhoneSchema = SchemaFactory.createForClass(LabelledPhone);

/** The federation's postal address. Every part is a plain String on the
 *  board — deliberately not bilingual, verified per-field. */
@Schema({ _id: false })
export class PostalAddress {
  @Prop({ type: String, default: null })
  country: string | null;

  @Prop({ type: String, default: null })
  emirate: string | null;

  @Prop({ type: String, default: null })
  city: string | null;

  @Prop({ type: String, default: null })
  area: string | null;

  @Prop({ type: String, default: null })
  street: string | null;

  @Prop({ type: String, default: null })
  building: string | null;

  @Prop({ type: String, default: null })
  poBox: string | null;

  @Prop({ type: String, default: null })
  postalCode: string | null;
}

export const PostalAddressSchema = SchemaFactory.createForClass(PostalAddress);

/** Implements: contactUsPage collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  The single source of truth for site-wide contact display (footer,
 *  floating icons): `email`, `address`, `officeHours`, `website` and
 *  `socialLinks` were all moved here off the `federation` record on the
 *  board, so they are deliberately NOT duplicated on `Federation`.
 *  Distinct from `siteSettings.systemEmailSender`, which is the internal
 *  sending address rather than the public contact address.
 *
 *  Not workflow-governed (no `publicationState`, absent from both Domain 7
 *  closed lists). Singleton — enforced in `ContactUsPagesService`. */
@Schema({ collection: 'contactUsPage' })
export class ContactUsPage extends HeroPageSchema {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: [LabelledPhoneSchema], default: [] })
  phones: LabelledPhone[];

  @Prop({ type: PostalAddressSchema, default: null })
  address: PostalAddress | null;

  @Prop({ type: String, default: null })
  googleMapsUrl: string | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  officeHours: LocalizedText | null;

  @Prop({ type: String, default: null })
  website: string | null;

  @Prop({ type: [SocialLinkSchema], default: [] })
  socialLinks: SocialLink[];
}

export const ContactUsPageSchema = SchemaFactory.createForClass(ContactUsPage);
