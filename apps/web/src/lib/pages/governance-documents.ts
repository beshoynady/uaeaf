import type { AppLocale } from "@/i18n/routing";

/**
 * The Regulations & Policies page's data layer.
 *
 * **This page is served from seed data, and that is a recorded gap rather than
 * a shortcut.** The collection exists — `governanceDocuments`, Domain 1 — and
 * so does a public read path, but the public path is
 * `GET /governance-documents/:id/public`: **one document, by id**. Listing them
 * needs `GET /governance-documents`, which requires the
 * `governanceDocuments:Read` permission and is therefore not reachable from a
 * public page.
 *
 * So a public list endpoint is the missing piece, and adding one is a backend
 * change this task is explicitly not permitted to make. The shapes below are
 * therefore built to match what that endpoint will return — the schema's own
 * fields, in the schema's own vocabulary — so that replacing this module with a
 * fetch is a change of source, not a change of page.
 *
 * Every record here is marked `provenance: "seed"`. Nothing in it is a real
 * federation document: the titles name the document a real row would hold and
 * the page states plainly that the list is not yet live.
 */

/** `GOVERNANCE_DOCUMENT_TYPES` in `governance-documents.schema.ts`, verbatim. */
export type GovernanceDocumentType = "Regulation" | "Policy" | "Form" | "Guide" | "Decision";

/** How the page groups its documents. Narrower than the type enum on purpose:
 *  a reader browses by "what kind of thing is this", not by the five states a
 *  workflow entity can be in. */
export type DocumentGroup = "regulations" | "policies" | "forms" | "guides";

export type GovernanceDocument = {
  id: string;
  title: Record<AppLocale, string>;
  description: Record<AppLocale, string>;
  type: GovernanceDocumentType;
  group: DocumentGroup;
  documentVersion: string;
  /** ISO 8601, or absent. Absent renders as **nothing**, never as a dash. */
  publishedAt?: string;
  /** Bytes, or absent. Same rule. */
  fileSize?: number;
  /** Where the file will be served from once one is uploaded. */
  href: string;
  /** The federation's founding regulation: one card, first in its grid. */
  featured?: boolean;
  /** `"seed"` until a public list endpoint exists. */
  provenance: "seed" | "api";
};

const GROUP_OF: Record<GovernanceDocumentType, DocumentGroup> = {
  Regulation: "regulations",
  Policy: "policies",
  Form: "forms",
  Guide: "guides",
  // A board decision is published as a policy document for readers; the type
  // stays `Decision` so the record still round-trips to the schema.
  Decision: "policies",
};

export const groupOf = (type: GovernanceDocumentType): DocumentGroup => GROUP_OF[type];

/**
 * Seed records.
 *
 * Titles name real document *kinds* a federation holds, which is what a page
 * skeleton needs. No file is attached to any of them, so `href` points at the
 * page itself rather than at a PDF that does not exist — a download link to a
 * 404 is worse than a link that goes nowhere visible.
 *
 * Two records deliberately carry **no** `publishedAt` and **no** `fileSize`:
 * they are what proves the absent-metadata rule on a real page rather than
 * only in the Brand Kit.
 */
const SEED: readonly GovernanceDocument[] = [
  {
    id: "seed-statute",
    title: { ar: "النظام الأساسي للاتحاد", en: "Federation Statute" },
    description: {
      ar: "الوثيقة المؤسِّسة التي تحدد أغراض الاتحاد وهيكله وعضويته وآليات اتخاذ القرار فيه.",
      en: "The founding document setting out the federation's purposes, structure, membership and decision-making.",
    },
    type: "Regulation",
    group: "regulations",
    documentVersion: "—",
    href: "/about/governance/policies",
    featured: true,
    provenance: "seed",
  },
  {
    id: "seed-competition-regulation",
    title: { ar: "لائحة المسابقات", en: "Competition Regulation" },
    description: {
      ar: "قواعد تنظيم المسابقات المحلية: التسجيل، والفئات، والتأهل، والاحتجاجات.",
      en: "How local competitions are run: entry, categories, qualification and protests.",
    },
    type: "Regulation",
    group: "regulations",
    documentVersion: "—",
    href: "/about/governance/policies",
    provenance: "seed",
  },
  {
    id: "seed-registration-regulation",
    title: { ar: "لائحة تسجيل اللاعبين", en: "Athlete Registration Regulation" },
    description: {
      ar: "شروط تسجيل اللاعبين وانتقالهم بين الأندية، والمستندات المطلوبة لكل حالة.",
      en: "Athlete registration and club transfer conditions, and the documents each requires.",
    },
    type: "Regulation",
    group: "regulations",
    documentVersion: "—",
    href: "/about/governance/policies",
    provenance: "seed",
  },
  {
    id: "seed-antidoping-policy",
    title: { ar: "سياسة مكافحة المنشطات", en: "Anti-Doping Policy" },
    description: {
      ar: "التزامات الاتحاد واللاعبين تجاه القواعد الدولية لمكافحة المنشطات، وإجراءات الفحص.",
      en: "The federation's and athletes' obligations under international anti-doping rules, and testing procedure.",
    },
    type: "Policy",
    group: "policies",
    documentVersion: "—",
    href: "/about/governance/policies",
    provenance: "seed",
  },
  {
    id: "seed-safeguarding-policy",
    title: { ar: "سياسة حماية القاصرين", en: "Safeguarding Policy" },
    description: {
      ar: "قواعد حماية اللاعبين تحت السن، ومسؤوليات المدربين والإداريين، وقنوات الإبلاغ.",
      en: "Protection of under-age athletes, the duties of coaches and officials, and reporting channels.",
    },
    type: "Policy",
    group: "policies",
    documentVersion: "—",
    href: "/about/governance/policies",
    provenance: "seed",
  },
  {
    id: "seed-privacy-policy",
    title: { ar: "سياسة الخصوصية وحماية البيانات", en: "Privacy and Data Protection Policy" },
    description: {
      ar: "كيف يجمع الاتحاد البيانات الشخصية ويستخدمها ويحفظها، وحقوق أصحابها.",
      en: "How the federation collects, uses and retains personal data, and the rights of its subjects.",
    },
    type: "Policy",
    group: "policies",
    // No `publishedAt` and no `fileSize` on purpose — the absent-metadata rule.
    href: "/about/governance/policies",
    documentVersion: "—",
    provenance: "seed",
  },
  {
    id: "seed-registration-form",
    title: { ar: "نموذج طلب تسجيل نادٍ", en: "Club Registration Form" },
    description: {
      ar: "النموذج الذي يقدمه النادي لطلب الانتساب إلى الاتحاد.",
      en: "The form a club submits to apply for federation affiliation.",
    },
    type: "Form",
    group: "forms",
    documentVersion: "—",
    href: "/about/governance/policies",
    provenance: "seed",
  },
  {
    id: "seed-protest-form",
    title: { ar: "نموذج تقديم احتجاج", en: "Protest Submission Form" },
    description: {
      ar: "النموذج الرسمي لتقديم احتجاج على نتيجة أو إجراء خلال إحدى المسابقات.",
      en: "The official form for protesting a result or a procedure during a competition.",
    },
    type: "Form",
    group: "forms",
    documentVersion: "—",
    href: "/about/governance/policies",
    provenance: "seed",
  },
];

/**
 * The page's documents.
 *
 * Async, and returning the seed list, because the endpoint it will call is
 * async: keeping the signature is what makes the eventual swap a one-file
 * change. There is deliberately no `guides` record — that group renders its
 * empty state, which is the other half of what this page has to get right.
 */
export const loadGovernanceDocuments = async (): Promise<readonly GovernanceDocument[]> => SEED;

/*
 * Search and formatting live in `governance-documents-search.ts`.
 *
 * They were here first, and moving them is not tidiness: the page's browser is
 * a Client Component and imports them, which put this module — and the seed
 * records below — into the client module graph. Splitting makes it certain that
 * the records never ship, rather than relying on tree shaking to notice.
 */
