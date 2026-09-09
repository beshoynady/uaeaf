import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { SocialLink, SocialLinkSchema } from '../../../../common/schemas/social-link.schema.js';
import { CONTACT_MESSAGE_TYPES } from '../../../public-communication/contact-messages/schemas/contact-messages.schema.js';
import type { ContactMessageType } from '../../../public-communication/contact-messages/schemas/contact-messages.schema.js';

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

/** Labels for the three contact cards whose value lives in a dedicated field.
 *  The phone card is absent on purpose — its label is `phones[].label`. */
@Schema({ _id: false })
export class ContactCardLabels {
  @Prop({ type: LocalizedTextSchema, default: null })
  email: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  location: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  officeHours: LocalizedText | null;
}

export const ContactCardLabelsSchema = SchemaFactory.createForClass(ContactCardLabels);

/** One option in the form's message-type select.
 *
 *  `value` is constrained to `CONTACT_MESSAGE_TYPES`, the closed vocabulary
 *  `contactMessages` validates submissions against. Only the label is content:
 *  an editor may rename or reorder the options, but cannot introduce a type
 *  the submission endpoint would reject. */
@Schema({ _id: false })
export class ContactMessageTypeLabel {
  @Prop({ type: String, enum: CONTACT_MESSAGE_TYPES, required: true })
  value: ContactMessageType;

  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;
}

export const ContactMessageTypeLabelSchema =
  SchemaFactory.createForClass(ContactMessageTypeLabel);

/** The message form's editable content. Field labels and placeholders are UI
 *  chrome and stay in the translation catalogues; what an editor owns is the
 *  heading, the consent sentence and the option labels. */
@Schema({ _id: false })
export class ContactFormContent {
  @Prop({ type: LocalizedTextSchema, default: null })
  title: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  consentNote: LocalizedText | null;

  @Prop({ type: [ContactMessageTypeLabelSchema], default: [] })
  messageTypeLabels: ContactMessageTypeLabel[];
}

export const ContactFormContentSchema = SchemaFactory.createForClass(ContactFormContent);

/** The map panel. `imageId` is a still picture, not a live embed — the page
 *  shows a placeholder until the federation approves an official Maps address,
 *  which is what `note` tells the reader. `directionsUrl` is a second target
 *  from `googleMapsUrl`: one opens the place, the other opens routing. */
@Schema({ _id: false })
export class ContactMapContent {
  @Prop({ type: LocalizedTextSchema, default: null })
  title: LocalizedText | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  imageId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  pinTitle: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  pinSubtitle: LocalizedText | null;

  @Prop({ type: String, default: null })
  directionsUrl: string | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  note: LocalizedText | null;
}

export const ContactMapContentSchema = SchemaFactory.createForClass(ContactMapContent);

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

  /** The short place name on the third contact card. Deliberately not derived
   *  from `address`: that is the eight-part postal address the footer and the
   *  structured-data block need in full, while the card shows one line. */
  @Prop({ type: LocalizedTextSchema, default: null })
  locationSummary: LocalizedText | null;

  @Prop({ type: ContactCardLabelsSchema, default: null })
  cardLabels: ContactCardLabels | null;

  @Prop({ type: ContactFormContentSchema, default: null })
  form: ContactFormContent | null;

  @Prop({ type: ContactMapContentSchema, default: null })
  map: ContactMapContent | null;
}

export const ContactUsPageSchema = SchemaFactory.createForClass(ContactUsPage);
