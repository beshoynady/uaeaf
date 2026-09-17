import type { RichTextNode } from "@/components/rich-text/rich-text";

/**
 * The public API's response shapes.
 *
 * Every type here mirrors a DTO that already exists upstream in
 * `api/src/modules/**`. Nothing is added, renamed or widened: the owner's
 * standing boundary is that any need for a new field or data structure goes
 * through the backend and the admin panel first, so a shape invented here to
 * make a page look finished would be exactly the wrong move.
 *
 * Where a page needs something the API does not serve, the gap is reported
 * rather than filled — see `public-pages.ts` and the slice report.
 */

/** `LocalizedTextSchema`. Both halves are required upstream (`@MinLength(1)`),
 *  so a record that exists has text in both languages. */
export interface LocalizedText {
  ar: string;
  en: string;
}

/** `HeroPageSchema` — the trio shared by all twelve singleton page wrappers.
 *
 *  `heroImageId` is a raw `mediaAssets` reference, not a URL. Resolve it
 *  through `fetchPublicMedia()` — `GET /media-assets/public?ids=…`. */
export interface HeroPage {
  heroImageId: string | null;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
}

/** `UpsertCommitteesPageDto` adds two fields to the hero trio. */
export interface CommitteesPage extends HeroPage {
  introHeading: LocalizedText;
  introText: LocalizedText;
}

export interface LabelledPhone {
  label: LocalizedText;
  number: string;
}

/** `PostalAddressDto` — every part optional, all plain strings. */
export interface PostalAddress {
  country?: string;
  emirate?: string;
  city?: string;
  area?: string;
  street?: string;
  building?: string;
  poBox?: string;
  postalCode?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

/** `UpsertContactUsPageDto` — the richest of the twelve by a wide margin, and
 *  the only one whose public read carries enough to build a real page. */
export interface ContactUsPage extends HeroPage {
  email: string;
  phones?: LabelledPhone[];
  address?: PostalAddress;
  googleMapsUrl?: string;
  officeHours?: LocalizedText;
  website?: string;
  socialLinks?: SocialLink[];
  /** One line for the location card. The postal `address` is the full eight
   *  parts the footer and the structured-data block need. */
  locationSummary?: LocalizedText | null;
  cardLabels?: ContactCardLabels | null;
  form?: ContactFormContent | null;
  map?: ContactMapContent | null;
}

/** The phone card is absent: its label is `phones[].label`. */
export interface ContactCardLabels {
  email?: LocalizedText | null;
  location?: LocalizedText | null;
  officeHours?: LocalizedText | null;
}

/** `value` is one of `CONTACT_MESSAGE_TYPES`; only the label is editable. */
export interface ContactMessageTypeLabel {
  value: ContactMessageType;
  label: LocalizedText;
}

export const CONTACT_MESSAGE_TYPES = ["Complaint", "Suggestion", "Inquiry", "General"] as const;
export type ContactMessageType = (typeof CONTACT_MESSAGE_TYPES)[number];

export interface ContactFormContent {
  title?: LocalizedText | null;
  consentNote?: LocalizedText | null;
  messageTypeLabels?: ContactMessageTypeLabel[];
}

export interface ContactMapContent {
  title?: LocalizedText | null;
  imageId?: string | null;
  pinTitle?: LocalizedText | null;
  pinSubtitle?: LocalizedText | null;
  /** Routing target, distinct from `googleMapsUrl`, which opens the place. */
  directionsUrl?: string | null;
  note?: LocalizedText | null;
}

/** `PublicImageDto`: an image the projection has already resolved, with the
 *  asset's own alt text. */
export interface PublicImage {
  url: string;
  altText: LocalizedText;
  width: number;
  height: number;
}

/** `PublicValueDto`. `iconKey` is one of the API's twelve value-icon keys. */
export interface PublicValue {
  title: LocalizedText;
  description: LocalizedText;
  iconKey: string;
  displayOrder: number;
}

/** `PresidentMessagePublicResponseDto` from
 *  `GET /president-message-page/current/public`: the Live publication's
 *  snapshot, field by field (ADR-0069 D3). */
export interface PresidentMessagePublic {
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  signatoryName: LocalizedText;
  signatoryTitle: LocalizedText;
  pullQuote: LocalizedText | null;
  messageBody: { ar: RichTextNode; en: RichTextNode };
  valuesTitle: LocalizedText | null;
  values: PublicValue[];
  heroImage: PublicImage | null;
  featuredImage: PublicImage | null;
  seo: {
    metaTitle: LocalizedText | null;
    metaDescription: LocalizedText | null;
    ogImage: PublicImage | null;
  } | null;
  /** The Live publication's date, which the message is signed with. */
  publishedAt: string;
}

/** A strategic goal, sent as `PublicValueDto`: `iconKey` is one of the API's
 *  twelve value-icon keys, as a value's is. */
export interface PublicContentBlock {
  title: LocalizedText;
  description: LocalizedText;
  iconKey: string;
  displayOrder: number;
}

/** `VisionMissionPublicResponseDto` from
 *  `GET /vision-mission-page/current/public`: the newest Live publication,
 *  field by field (ADR-0070). */
export interface VisionMissionPublic {
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  heroImage: PublicImage | null;
  visionTitle: LocalizedText | null;
  visionText: LocalizedText;
  visionImage: PublicImage | null;
  missionTitle: LocalizedText | null;
  missionText: LocalizedText;
  missionImage: PublicImage | null;
  goalsTitle: LocalizedText | null;
  strategicGoals: PublicContentBlock[];
  coreValues: PublicValue[];
  valuesImage: PublicImage | null;
  ctaImage: PublicImage | null;
  seo: PresidentMessagePublic["seo"];
  publishedAt: string;
}

/** One entry of a strategic plan list (`PublicPlanItemDto`). `id` is the
 *  stored item's own id, stable across reorders, so a key or an anchor never
 *  changes when the editor moves the item (ADR-0075). Hidden items are not
 *  sent. */
export interface PlanItemPublic {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  displayOrder: number;
}

/** A phase of the plan's timeline: an item with one of the four phase icons. */
export interface PlanPhasePublic extends PlanItemPublic {
  iconKey: string;
}

/** A key performance indicator: the figure as stored text ("2030", "+30%")
 *  and its label. */
export interface PlanMetricPublic {
  id: string;
  value: string;
  label: LocalizedText;
  displayOrder: number;
}

/** A step of the execution path; its description is optional. */
export interface PlanStepPublic {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  displayOrder: number;
}

/** `StrategicPlanPublicResponseDto` from
 *  `GET /strategic-plans-page/current/public`: the newest Live publication,
 *  field by field (ADR-0075). */
export interface StrategicPlanPublic {
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  heroImage: PublicImage | null;
  introHeading: LocalizedText;
  introText: LocalizedText;
  introImage: PublicImage | null;
  phasesTitle: LocalizedText | null;
  phases: PlanPhasePublic[];
  pillarsTitle: LocalizedText;
  pillarsText: LocalizedText | null;
  pillars: PlanItemPublic[];
  objectivesTitle: LocalizedText;
  objectivesImage: PublicImage | null;
  objectives: PlanItemPublic[];
  metricsTitle: LocalizedText;
  metricsImage: PublicImage | null;
  metrics: PlanMetricPublic[];
  executionTitle: LocalizedText;
  executionText: LocalizedText | null;
  executionSteps: PlanStepPublic[];
  ctaTitle: LocalizedText;
  ctaText: LocalizedText | null;
  ctaImage: PublicImage | null;
  seo: PresidentMessagePublic["seo"];
  publishedAt: string;
}

/** `MediaAssetPublicResponseDto` from `GET /media-assets/public?ids=…`.
 *  Excludes `storageKey`, `checksum` and `albumId` upstream. */
export interface MediaAssetPublic {
  id: string;
  file: {
    url: string;
    mimeType: string;
    width: number;
    height: number;
    size: number;
    photographer: string | null;
    captureDate: string | null;
  };
  caption: LocalizedText;
  altText: LocalizedText;
  displayOrder: number;
  isFeatured: boolean;
}

/** `FederationPersonnelPublicResponseDto` from `GET /federation-personnel/public`.
 *  Structurally excludes `internalContact` upstream — this is the public-safe
 *  class, not a filtered view of the full record. */
export interface FederationPersonnelPublic {
  id: string;
  fullName: LocalizedText;
  photoId: string | null;
  shortBio: LocalizedText | null;
  biography: LocalizedText | null;
  nationalityId: string;
  publicContact: { email: string | null; phone: string | null } | null;
  status: string;
  socialLinks: SocialLink[];
}

/** `AthletePublicResponseDto`. `dateOfBirth` is structurally absent upstream
 *  (ADR-0028 / Federal Law 26/2025) — do not reintroduce it here. */
export interface AthletePublic {
  id: string;
  name: LocalizedText;
  nationalityId: string;
  disciplineIds: string[];
  gender: string;
  residencyType: string;
  federationName: LocalizedText | null;
}

/** `AthletePublicListResponseDto`. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** `PagePublicResponseDto` — `GET /pages/public/:slug`.
 *
 *  The route answers HTTP 200 with a literal `null` body for a slug that is
 *  missing or still Draft, so `null` is a routing state here rather than a
 *  fault. `status` is absent on purpose: only a Published row ever resolves,
 *  which makes the flag the gate and not display data. */
export interface PagePublic {
  id: string;
  slug: string;
  title: LocalizedText;
  seo: {
    metaTitle: LocalizedText | null;
    metaDescription: LocalizedText | null;
    ogImageId: string | null;
  } | null;
}

/** `PageSectionPublicResponseDto` — `GET /page-sections/public/by-page/:pageId`.
 *
 *  `configuration` is a free-form object upstream and stays one here: the
 *  board declares it section-specific and unconstrained, so narrowing it in
 *  this file would be inventing a contract the API does not keep. Each
 *  consumer reads the keys it knows and treats the rest as absent. */
export interface PageSectionPublic {
  id: string;
  sectionType: string;
  sectionTitle: LocalizedText | null;
  sectionSubtitle: LocalizedText | null;
  itemLimit: number | null;
  ctaText: LocalizedText | null;
  ctaUrl: string | null;
  displayOrder: number;
  selectionMode: string;
  items: string[];
  configuration: Record<string, unknown> | null;
}

/** `FocalPointDto` — where a picture must keep looking under a crop, as
 *  percentages that map straight onto `object-position`. */
export interface FocalPoint {
  x: number;
  y: number;
}

/** `HeroImagePublicResponseDto` — a picture with the point this slide framed
 *  it on. The point belongs to the slide, not to the asset: the same
 *  photograph is cropped differently on another page. */
export interface HeroImage {
  image: PublicImage;
  focalPoint: FocalPoint;
}

/** `HeroLtrImagePublicResponseDto` — the landscape picture a left-to-right
 *  reader sees, already resolved from the slide's `ltrImageMode`. The focal
 *  point is where the subject stands in what the reader sees: for a mirrored
 *  picture, the flipped one. */
export interface HeroLtrImage extends HeroImage {
  mirrored: boolean;
}

/** `HeroCtaPublicResponseDto`. Only a visible button is sent, so there is no
 *  `isVisible` here — receiving the object *is* the visibility. */
export interface HeroCta {
  label: LocalizedText;
  url: string;
  /** An absolute `https://` link. The reader opens it in a new tab with
   *  `rel="noopener noreferrer"`; an internal path is routed with the
   *  locale prefix instead. */
  isExternal: boolean;
}

/** `HeroSlidePublicResponseDto` — `GET /hero-slides/public/by-section/:id`.
 *
 *  The images arrive resolved rather than as ids: the hero is the page's
 *  Largest Contentful Paint, and a reader that received ids would owe another
 *  round trip before it could emit an `img src`. `mobile` is `null` unless the
 *  slide switched its phone crop on, and the reader falls back to `desktop`
 *  with its own focal point rather than drawing an empty frame.
 *
 *  `mediaAssets.isAiGenerated` is structurally absent: the provenance mark is
 *  an internal editorial signal and reaches no visitor in any form. */
export interface HeroSlidePublic {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  desktop: HeroImage | null;
  /** For English. `null` falls back to `desktop` as it is. */
  desktopLtr: HeroLtrImage | null;
  mobile: HeroImage | null;
  videoId: string | null;
  eyebrow: LocalizedText | null;
  title: LocalizedText;
  subtitle: LocalizedText;
  primaryCta: HeroCta | null;
  secondaryCta: HeroCta | null;
  displayOrder: number;
}

/** An organisation's name as it writes itself (ADR-0085 D4): either side may be
 *  `null`, never both. Drawn through `displayName` from `@uaeaf/content/sponsors`. */
export interface OrganizationNamePublic {
  ar: string | null;
  en: string | null;
}

/** `SponsorPublicResponseDto` — a sponsor inside a running sponsorship. The
 *  contract terms (`restricted`) and the demo mark never reach the site. */
export interface SponsorPublic {
  id: string;
  name: OrganizationNamePublic;
  logo: PublicImage | null;
  website: string | null;
  categoryLabel: LocalizedText | null;
}

/** `SponsorshipPublicResponseDto` — `GET /sponsorships/public`: visible, running
 *  at the time of the request, not cancelled. The site asks the window again at
 *  render time (`isInWindow`), because this read is cached. */
export interface SponsorshipPublic {
  id: string;
  sponsor: SponsorPublic;
  tier: "Strategic" | "Official" | "Supporting";
  targetType: "Federation" | "Championship" | "Event";
  scopeLabel: LocalizedText | null;
  isFeatured: boolean;
  displayOrder: number;
  startDate: string;
  endDate: string | null;
}

/** `OrganizationCardPublicDto` — `GET /partnerships/public` and
 *  `GET /memberships/public`: a logo and a name. */
export interface OrganizationCardPublic {
  id: string;
  name: OrganizationNamePublic;
  logo: PublicImage | null;
  displayOrder: number;
}

/** `SponsorStripSettingsDto`, on `GET /site-settings/public` (ADR-0077 D5). */
export interface SponsorStripSettingsPublic {
  isVisible: boolean;
  displayMode: "logo" | "logoName" | "logoNameScope";
  selection: "allActive" | "manual";
  sponsorshipIds: string[];
  order: "tier" | "manual";
  pinTopTier: boolean;
  speed: "slow" | "medium" | "fast";
}
