import type { FieldError } from "./sponsor-relations/organizations";
import type { Read } from "./sponsor-relations/load";
import type { RelationRequest } from "./sponsor-relations/relations-save";

/**
 * The footer screen's model (ADR-0092 D12).
 *
 * The footer owns only its words: the description under the federation's
 * name, the copyright line, and the headings of its three titled columns. They
 * live on the site settings and are saved whole through
 * `PUT /site-settings/footer`. A text left empty in both languages is saved as
 * `null`, which the site reads as its built-in text.
 *
 * Everything else the footer shows — the channels, the place and its map, the
 * email, the office hours — belongs to the contact page's record, its one
 * source, and is only read here so the screen can show it where it appears.
 * Writing it from here would make two screens save one record, and that
 * record's save replaces it whole: each would undo the other's work.
 */

export interface LocalizedDraft {
  ar: string;
  en: string;
}

export interface FooterDraft {
  footerAboutBlurb: LocalizedDraft;
  copyrightText: LocalizedDraft;
  headings: { quickLinks: LocalizedDraft; location: LocalizedDraft; contact: LocalizedDraft };
}

export const HEADING_KEYS = ["quickLinks", "location", "contact"] as const;
export type HeadingKey = (typeof HEADING_KEYS)[number];

type Localized = { ar: string; en: string };

/** What the settings row stores for the footer. */
export interface FooterRecord {
  footerAboutBlurb?: Localized | null;
  copyrightText?: Localized | null;
  footerHeadings?: Partial<Record<HeadingKey, Localized | null>> | null;
}

/** What the footer shows from the contact page's record, as the screen lists it. */
export interface FooterSourced {
  channels: { platform: string; url: string; hasIcon: boolean }[];
  place: Localized | null;
  region: Localized | null;
  coordinates: { latitude: number; longitude: number } | null;
  directionsUrl: string | null;
  email: string | null;
  officeHours: Localized | null;
}

const blank = (): LocalizedDraft => ({ ar: "", en: "" });

export const EMPTY_FOOTER_DRAFT: FooterDraft = {
  footerAboutBlurb: blank(),
  copyrightText: blank(),
  headings: { quickLinks: blank(), location: blank(), contact: blank() },
};

const toDraft = (value: Localized | null | undefined): LocalizedDraft => ({ ar: value?.ar ?? "", en: value?.en ?? "" });

export const fromFooterRecord = (stored: FooterRecord | null | undefined): FooterDraft => ({
  footerAboutBlurb: toDraft(stored?.footerAboutBlurb),
  copyrightText: toDraft(stored?.copyrightText),
  headings: {
    quickLinks: toDraft(stored?.footerHeadings?.quickLinks),
    location: toDraft(stored?.footerHeadings?.location),
    contact: toDraft(stored?.footerHeadings?.contact),
  },
});

/** Every text on the screen, with the path its error is shown at. */
const texts = (draft: FooterDraft): [string, LocalizedDraft][] => [
  ["footer.footerAboutBlurb", draft.footerAboutBlurb],
  ["footer.copyrightText", draft.copyrightText],
  ...HEADING_KEYS.map((key): [string, LocalizedDraft] => [`footer.headings.${key}`, draft.headings[key]]),
];

/** A text in one language only would render blank in the other, and the API
 *  refuses it; both or neither. */
export const validateFooter = (draft: FooterDraft): FieldError[] =>
  texts(draft)
    .filter(([, value]) => (value.ar.trim() === "") !== (value.en.trim() === ""))
    .map(([path]) => ({ path, code: "bothLanguages" }));

export const isFooterDirty = (saved: FooterDraft, draft: FooterDraft): boolean => JSON.stringify(saved) !== JSON.stringify(draft);

const toBody = (value: LocalizedDraft): Localized | null =>
  value.ar.trim() === "" && value.en.trim() === "" ? null : { ar: value.ar.trim(), en: value.en.trim() };

/** The footer is one record, written whole. */
export const footerRequests = (saved: FooterDraft, draft: FooterDraft): RelationRequest[] =>
  isFooterDirty(saved, draft)
    ? [
        {
          method: "PUT",
          url: "/api/admin/site-settings/footer",
          body: {
            footerAboutBlurb: toBody(draft.footerAboutBlurb),
            copyrightText: toBody(draft.copyrightText),
            footerHeadings: {
              quickLinks: toBody(draft.headings.quickLinks),
              location: toBody(draft.headings.location),
              contact: toBody(draft.headings.contact),
            },
          },
          errorPrefix: "footer",
        },
      ]
    : [];

type Parsed = { ok: true; body: Record<string, unknown> } | { ok: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `null`, or a pair of strings; `undefined` for anything else. The values are
 *  the API's to judge — this only keeps the shape. */
const readLocalized = (value: unknown): Localized | null | undefined => {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || typeof value.ar !== "string" || typeof value.en !== "string") return undefined;
  return { ar: value.ar, en: value.en };
};

/**
 * What the route handler forwards: the footer's three fields and nothing else.
 * The API refuses a whole request over one unknown key, and a field that
 * belongs to another settings screen is not this one's to send.
 */
export const readFooterBody = (body: unknown): Parsed => {
  if (!isRecord(body)) return { ok: false };
  const footerAboutBlurb = readLocalized(body.footerAboutBlurb);
  const copyrightText = readLocalized(body.copyrightText);
  const headings = body.footerHeadings ?? null;
  if (footerAboutBlurb === undefined || copyrightText === undefined || (headings !== null && !isRecord(headings))) {
    return { ok: false };
  }
  const read = HEADING_KEYS.map((key) => [key, headings === null ? null : readLocalized(headings[key])] as const);
  if (read.some(([, value]) => value === undefined)) return { ok: false };
  return {
    ok: true,
    body: { footerAboutBlurb, copyrightText, footerHeadings: headings === null ? null : Object.fromEntries(read) },
  };
};

export type FooterLoad = { state: "ready"; initial: FooterDraft; sourced: FooterSourced } | { state: "loadFailed" };

type ContactRecord = {
  email?: string | null;
  officeHours?: Localized | null;
  socialLinks?: { platform: string; url: string; iconId?: string | null }[];
  map?: {
    latitude?: number | null;
    longitude?: number | null;
    pinTitle?: Localized | null;
    pinSubtitle?: Localized | null;
    directionsUrl?: string | null;
  } | null;
};

/**
 * What the screen opens on. A read that fails is reported rather than opened on
 * empty fields: saved from there, they would overwrite what is stored.
 */
export const loadFooter = async (read: Read): Promise<FooterLoad> => {
  try {
    const [settings, contact] = (await Promise.all([read("/site-settings"), read("/contact-us-page")])) as [
      FooterRecord | null,
      ContactRecord | null,
    ];
    const map = contact?.map;
    return {
      state: "ready",
      initial: fromFooterRecord(settings),
      sourced: {
        channels: (contact?.socialLinks ?? []).map((link) => ({ platform: link.platform, url: link.url, hasIcon: Boolean(link.iconId) })),
        place: map?.pinTitle ?? null,
        region: map?.pinSubtitle ?? null,
        coordinates:
          typeof map?.latitude === "number" && typeof map?.longitude === "number"
            ? { latitude: map.latitude, longitude: map.longitude }
            : null,
        directionsUrl: map?.directionsUrl ?? null,
        email: contact?.email ?? null,
        officeHours: contact?.officeHours ?? null,
      },
    };
  } catch {
    return { state: "loadFailed" };
  }
};
