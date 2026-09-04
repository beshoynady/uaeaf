import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type SiteSettingsDocument = HydratedDocument<SiteSettings>;

/** `defaultSeo` embed — site-wide SEO fallbacks. */
@Schema({ _id: false })
export class DefaultSeo {
  @Prop({ type: LocalizedTextSchema, default: null })
  titleSuffix: LocalizedText | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  defaultOgImageId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  defaultDescription: LocalizedText | null;
}

export const DefaultSeoSchema = SchemaFactory.createForClass(DefaultSeo);

/** Implements: siteSettings collection, Domain 11 — CMS & Page Composition
 *  (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Singleton — enforced in `SiteSettingsService` (confirmed decision #8).
 *  Not workflow-governed (no `publicationState`, absent from both Domain 7
 *  closed lists).
 *
 *  Several fields are `[RESTRICTED]` and must never reach a public
 *  response: `isMaintenanceMode`, `googleAnalyticsId`, `metaPixelId`,
 *  `sessionTimeoutMinutes`, `maxLoginAttempts`, `systemEmailSender`. The
 *  public route serves `SiteSettingsPublicResponseDto`, which structurally
 *  omits them.
 *
 *  `privacyPolicyPageId`/`termsOfUsePageId`/`accessibilityStatementPageId`
 *  are polymorphic (`pages | staticPages`). `staticPages` is a Domain 4
 *  collection, out of scope this week, so these stay plain `ObjectId` with
 *  no `ref:` — the established pattern for poly refs to not-yet-built
 *  collections (Week 2's `notifications.triggerId`, Week 3's
 *  `officialAssignments.targetId`).
 *
 *  ⚠️ Flagged architectural overlap, not silently resolved:
 *  `sessionTimeoutMinutes` and `maxLoginAttempts` duplicate concerns Week 1
 *  deliberately implemented as fixed constants in `config/auth.config.ts`
 *  (lockout threshold 5 / 15 min). These board fields are implemented here
 *  as data, but nothing reads them yet — `AuthService` still uses the Week 1
 *  constants. Wiring auth to read runtime DB settings would change Week 1-2
 *  behaviour, which this week's brief explicitly excludes. Needs an owner
 *  decision on which is authoritative. */
@Schema({ collection: 'siteSettings' })
export class SiteSettings extends BaseSchema {
  @Prop({ type: DefaultSeoSchema, default: null })
  defaultSeo: DefaultSeo | null;

  /** Short 1-2 sentence federation description shown in the footer —
   *  independently editable from the full `aboutFederationPage` content. */
  @Prop({ type: LocalizedTextSchema, default: null })
  footerAboutBlurb: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  copyrightText: LocalizedText | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  logoId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  logoDarkId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  faviconId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  privacyPolicyPageId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  termsOfUsePageId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  accessibilityStatementPageId: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false })
  cookieConsentEnabled: boolean;

  @Prop({ type: LocalizedTextSchema, default: null })
  cookieConsentText: LocalizedText | null;

  /** `[RESTRICTED]` — excluded from the public response. */
  @Prop({ type: Boolean, default: false })
  isMaintenanceMode: boolean;

  /** `[PUBLIC]` — shown to visitors while `isMaintenanceMode` is true. */
  @Prop({ type: LocalizedTextSchema, default: null })
  maintenanceMessage: LocalizedText | null;

  /** `[RESTRICTED]`. */
  @Prop({ type: String, default: null })
  googleAnalyticsId: string | null;

  /** `[RESTRICTED]`. */
  @Prop({ type: String, default: null })
  metaPixelId: string | null;

  /** `[RESTRICTED]` — dashboard auto-logout duration. See the flagged
   *  overlap with `config/auth.config.ts` above. */
  @Prop({ type: Number, default: null })
  sessionTimeoutMinutes: number | null;

  /** `[RESTRICTED]` — dashboard lockout threshold. Same flagged overlap. */
  @Prop({ type: Number, default: null })
  maxLoginAttempts: number | null;

  /** `[RESTRICTED]` — the address system notification emails are sent
   *  FROM; distinct from `contactUsPage.email`, the public contact
   *  address. */
  @Prop({ type: String, default: null })
  systemEmailSender: string | null;
}

export const SiteSettingsSchema = SchemaFactory.createForClass(SiteSettings);
