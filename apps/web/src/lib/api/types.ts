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
