import type { LocalizedText } from "@/lib/api/types";
import { isMongoId } from "./request-shapes";

/**
 * The singleton content pages, held as data.
 *
 * Each of these is one row the API upserts with a `PUT` — no list, no
 * versions, no publication state. Ten of them carry exactly a hero title, a
 * hero subtitle and an optional image; writing that form out ten times would
 * be ten places for a field name to be misspelled in a way nothing catches
 * until an editor's text silently fails to save.
 *
 * Deliberately NOT in this list:
 *
 * - `siteSettings`. It shares the `GET`/`PUT` shape and nothing else: it is
 *   maintenance mode, analytics ids, session timeouts and pointers to legal
 *   pages. Filing platform configuration under "pages" because the HTTP verb
 *   matches is the kind of merge Chapter 11 of the design system forbids.
 * - `presidentMessagePage`, `aboutFederationPage`, `visionMissionPage`,
 *   `strategicPlansPage`. Those are workflow-governed: they carry a
 *   `publicationState`, their public read goes through
 *   `publications -> revisions.snapshotData`, and — as of 2026-09-08 — the
 *   API exposes Create, Read and Delete for them but no update of any kind.
 *   An editor screen for them cannot exist until it does.
 */

/** A field's `name` may be dotted (`map.title`). The editor keeps a flat map
 *  of controls; `readPageBody` puts the value back under its group, which is
 *  the shape the API's nested DTOs expect. */
export type PageField =
  | { kind: "localized"; name: string; required: boolean; multiline?: boolean }
  | { kind: "media"; name: string }
  | { kind: "text"; name: string; required: boolean; inputType: "email" | "url" | "text" }
  | { kind: "phones"; name: string }
  | { kind: "address"; name: string }
  | { kind: "socialLinks"; name: string }
  | { kind: "messageTypeLabels"; name: string };

/** The closed vocabulary `contactMessages` validates a submission against.
 *  An option outside it would be offered on the public form and then refused
 *  by the endpoint, so the editor cannot introduce one. */
export const CONTACT_MESSAGE_TYPES = ["Complaint", "Suggestion", "Inquiry", "General"] as const;

export interface StaticPage {
  /** URL segment, message key, and the last part of the API path. */
  key: string;
  apiPath: string;
  /** The string `@RequirePermission` uses upstream, so the screen can hide
   *  what the API would refuse. */
  resourceType: string;
  fields: readonly PageField[];
}

/** What all but two of these pages are: a headline over a background. */
const HERO: readonly PageField[] = [
  { kind: "media", name: "heroImageId" },
  { kind: "localized", name: "heroTitle", required: true },
  { kind: "localized", name: "heroSubtitle", required: true },
];

function heroPage(key: string, resourceType: string): StaticPage {
  return { key, apiPath: `/${key}-page`, resourceType, fields: HERO };
}

export const STATIC_PAGES: readonly StaticPage[] = [
  heroPage("news", "newsPage"),
  heroPage("athletes", "athletesPage"),
  heroPage("clubs", "clubsPage"),
  heroPage("coaches", "coachesPage"),
  heroPage("disciplines", "disciplinesPage"),
  heroPage("records", "recordsPage"),
  heroPage("results-rankings", "resultsRankingsPage"),
  heroPage("albums", "albumsPage"),
  heroPage("videos", "videosPage"),
  heroPage("board-members", "boardMembersPage"),
  {
    key: "committees",
    apiPath: "/committees-page",
    resourceType: "committeesPage",
    fields: [
      ...HERO,
      { kind: "localized", name: "introHeading", required: true },
      { kind: "localized", name: "introText", required: true, multiline: true },
    ],
  },
  {
    key: "contact-us",
    apiPath: "/contact-us-page",
    resourceType: "contactUsPage",
    fields: [
      ...HERO,
      { kind: "text", name: "email", required: true, inputType: "email" },
      { kind: "text", name: "website", required: false, inputType: "url" },
      { kind: "text", name: "googleMapsUrl", required: false, inputType: "url" },
      { kind: "localized", name: "officeHours", required: false },
      { kind: "localized", name: "locationSummary", required: false },
      { kind: "phones", name: "phones" },
      { kind: "address", name: "address" },
      { kind: "socialLinks", name: "socialLinks" },
      // The three cards whose value lives in a dedicated field above. The
      // phone card's label is part of `phones` and is edited there.
      { kind: "localized", name: "cardLabels.email", required: false },
      { kind: "localized", name: "cardLabels.location", required: false },
      { kind: "localized", name: "cardLabels.officeHours", required: false },
      { kind: "localized", name: "form.title", required: false },
      { kind: "localized", name: "form.consentNote", required: false, multiline: true },
      { kind: "messageTypeLabels", name: "form.messageTypeLabels" },
      { kind: "localized", name: "map.title", required: false },
      { kind: "media", name: "map.imageId" },
      { kind: "localized", name: "map.pinTitle", required: false },
      { kind: "localized", name: "map.pinSubtitle", required: false },
      { kind: "text", name: "map.directionsUrl", required: false, inputType: "url" },
      { kind: "localized", name: "map.note", required: false, multiline: true },
    ],
  },
];

export function findStaticPage(key: string): StaticPage | undefined {
  return STATIC_PAGES.find((page) => page.key === key);
}

/** The eight optional parts of a postal address, in the order they are
 *  written on an envelope in the UAE. */
export const ADDRESS_PARTS = [
  "building",
  "street",
  "area",
  "city",
  "emirate",
  "country",
  "poBox",
  "postalCode",
] as const;

export type PageBody = Record<string, unknown>;

export type PageBodyResult =
  | { ok: true; body: PageBody }
  | { ok: false; code: "invalidRequest" };

const REJECT = { ok: false, code: "invalidRequest" } as const;

/**
 * Reads a page's submitted values against its own field list.
 *
 * Two rules do most of the work. Fields the page does not declare are
 * dropped, because `forbidNonWhitelisted` upstream rejects the whole request
 * over one stray key — a value left behind by another page's form would fail
 * the save with nothing on screen explaining why. And a value that is simply
 * unset is omitted rather than sent as null or an empty string, because
 * `@IsOptional()` skips an absent field while null fails the validator for
 * the field's own type.
 */
export function readPageBody(page: StaticPage, value: unknown): PageBodyResult {
  const input = (value ?? {}) as Record<string, unknown>;
  const body: PageBody = {};

  /** Writes a value at `a.b`, creating the group only when something lands in
   *  it — an empty group would be a stored object the public page has to
   *  null-check for no reason. */
  const put = (name: string, written: unknown) => {
    const dot = name.indexOf(".");
    if (dot === -1) {
      body[name] = written;
      return;
    }
    const group = name.slice(0, dot);
    const leaf = name.slice(dot + 1);
    const existing = (body[group] as Record<string, unknown>) ?? {};
    existing[leaf] = written;
    body[group] = existing;
  };

  for (const field of page.fields) {
    const raw = input[field.name];

    switch (field.kind) {
      case "localized": {
        const text = readLocalized(raw);
        if (text === "invalid" || (field.required && text === null)) {
          return REJECT;
        }
        if (text !== null) {
          put(field.name, text);
        }
        break;
      }
      case "media": {
        if (raw === undefined || raw === null || raw === "") break;
        if (!isMongoId(raw)) return REJECT;
        put(field.name, raw);
        break;
      }
      case "text": {
        const trimmed = typeof raw === "string" ? raw.trim() : "";
        if (trimmed.length === 0) {
          if (field.required) return REJECT;
          break;
        }
        // Lowercased for the same reason the user schema lowercases an
        // email: it is an address, and its case carries no meaning.
        put(field.name, field.inputType === "email" ? trimmed.toLowerCase() : trimmed);
        break;
      }
      case "phones": {
        if (!Array.isArray(raw)) break;
        const phones = raw
          .map((entry) => entry as { label?: unknown; number?: unknown })
          .map((entry) => ({ label: readLocalized(entry.label), number: String(entry.number ?? "").trim() }))
          .filter(
            (entry): entry is { label: LocalizedText; number: string } =>
              entry.label !== null && entry.label !== "invalid" && entry.number.length > 0,
          );
        if (phones.length > 0) put(field.name, phones);
        break;
      }
      case "address": {
        if (typeof raw !== "object" || raw === null) break;
        const source = raw as Record<string, unknown>;
        const address: Record<string, string> = {};
        for (const part of ADDRESS_PARTS) {
          const trimmed = typeof source[part] === "string" ? (source[part] as string).trim() : "";
          if (trimmed.length > 0) address[part] = trimmed;
        }
        // An address with every part blank is not an empty address, it is
        // no address — and sending `{}` would store one.
        if (Object.keys(address).length > 0) put(field.name, address);
        break;
      }
      case "socialLinks": {
        if (!Array.isArray(raw)) break;
        const links = raw
          .map((entry) => entry as { platform?: unknown; url?: unknown })
          .map((entry) => ({
            platform: String(entry.platform ?? "").trim(),
            url: String(entry.url ?? "").trim(),
          }))
          // Both halves or neither: a platform with no link is a dead chip
          // on the public footer, and a link with no platform has no label.
          .filter((entry) => entry.platform.length > 0 && entry.url.length > 0);
        if (links.length > 0) put(field.name, links);
        break;
      }
      case "messageTypeLabels": {
        if (!Array.isArray(raw)) break;
        const labels = raw
          .map((entry) => entry as { value?: unknown; label?: unknown })
          .map((entry) => ({ value: String(entry.value ?? ""), label: readLocalized(entry.label) }))
          .filter(
            (entry): entry is { value: string; label: LocalizedText } =>
              (CONTACT_MESSAGE_TYPES as readonly string[]).includes(entry.value) &&
              entry.label !== null &&
              entry.label !== "invalid",
          );
        if (labels.length > 0) put(field.name, labels);
        break;
      }
    }
  }

  return { ok: true, body };
}

/** `null` for "not filled in at all", `"invalid"` for a half-filled pair —
 *  which upstream rejects with `@MinLength(1)` and which would otherwise
 *  store a record that renders blank in one language. */
function readLocalized(value: unknown): LocalizedText | null | "invalid" {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { ar, en } = value as Record<string, unknown>;
  const trimmedAr = typeof ar === "string" ? ar.trim() : "";
  const trimmedEn = typeof en === "string" ? en.trim() : "";
  if (trimmedAr.length === 0 && trimmedEn.length === 0) {
    return null;
  }
  if (trimmedAr.length === 0 || trimmedEn.length === 0) {
    return "invalid";
  }
  return { ar: trimmedAr, en: trimmedEn };
}
