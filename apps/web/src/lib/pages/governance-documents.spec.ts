import { describe, expect, it } from "vitest";

import {
  groupOf,
  loadGovernanceDocuments,
  type GovernanceDocument,
} from "./governance-documents";
import {
  fold,
  foldDocument,
  formatFileSize,
  formatPublishedAt,
  matchesFolded,
} from "./governance-documents-search";

/** The page folds the needle once and the haystack once; this mirrors that, so
 *  the test exercises the same path the browser does. */
const matchesQuery = (
  document: GovernanceDocument,
  query: string,
  locale: "ar" | "en",
): boolean => matchesFolded(foldDocument(document, locale), fold(query.trim()));

/**
 * The Regulations & Policies page's data rules.
 *
 * Two of them are the kind that look right and are not: Arabic search folding,
 * where a Unicode range that stops one code point short silently matches
 * nothing, and absent metadata, where returning a dash instead of `undefined`
 * renders a value a reader has to interpret.
 */

const document = (over: Partial<GovernanceDocument> = {}): GovernanceDocument => ({
  id: "t",
  title: { ar: "النظام الأساسي للاتحاد", en: "Federation Statute" },
  description: { ar: "الوثيقة المؤسِّسة", en: "The founding document" },
  type: "Regulation",
  group: "regulations",
  documentVersion: "—",
  href: "/x",
  provenance: "seed",
  ...over,
});

describe("Arabic search folds what a reader will not type", () => {
  it("finds a hamza-carrying word typed with a bare alef", () => {
    // The case this whole helper exists for. NFKD turns أ into ا + U+0654, so
    // a mark range ending at U+0652 leaves the hamza attached and this fails —
    // which is exactly how it failed in the browser before the range was
    // widened.
    expect(matchesQuery(document(), "الاساسي", "ar")).toBe(true);
  });

  it("finds it typed with the hamza too", () => {
    expect(matchesQuery(document(), "الأساسي", "ar")).toBe(true);
  });

  it("ignores diacritics on either side", () => {
    expect(matchesQuery(document(), "المؤسسة", "ar")).toBe(true);
  });

  it("folds ta marbuta to ha, which is how it is usually typed", () => {
    expect(matchesQuery(document({ title: { ar: "لائحة", en: "x" } }), "لائحه", "ar")).toBe(true);
  });

  it("is case-insensitive in English", () => {
    expect(matchesQuery(document(), "FEDERATION", "en")).toBe(true);
  });

  it("still says no to a word that is not there", () => {
    // The assertion that keeps the ones above honest: a fold aggressive enough
    // to match everything would pass all of them.
    expect(matchesQuery(document(), "زززز", "ar")).toBe(false);
    expect(matchesQuery(document(), "bicycle", "en")).toBe(false);
  });

  it("treats an empty query as no filter", () => {
    expect(matchesQuery(document(), "   ", "ar")).toBe(true);
  });
});

describe("absent metadata is absent, never a dash", () => {
  it("returns undefined for a missing size", () => {
    // `DocumentCard` renders nothing for `undefined` and a value for anything
    // else — so returning "—" here would put a dash on the card, which is a
    // value every reader interprets differently.
    expect(formatFileSize(undefined, "ar")).toBeUndefined();
  });

  it("returns undefined for a missing date", () => {
    expect(formatPublishedAt(undefined, "en")).toBeUndefined();
  });

  it("formats a size that is present", () => {
    expect(formatFileSize(1_200_000, "en")).toBe("1.2 MB");
  });

  it("formats a date that is present", () => {
    expect(formatPublishedAt("2026-03-12T00:00:00.000Z", "en")).toContain("2026");
  });
});

describe("the seed list", () => {
  it("maps every schema type to a group", () => {
    for (const type of ["Regulation", "Policy", "Form", "Guide", "Decision"] as const) {
      expect(groupOf(type)).toBeTruthy();
    }
  });

  it("carries exactly one featured document", () => {
    // The founding regulation, first in its grid. Two would make "featured"
    // mean nothing.
    return loadGovernanceDocuments().then((documents) => {
      expect(documents.filter((d) => d.featured === true)).toHaveLength(1);
    });
  });

  it("marks every record as seed, so nothing reads as live federation data", () => {
    return loadGovernanceDocuments().then((documents) => {
      expect(documents.every((d) => d.provenance === "seed")).toBe(true);
    });
  });

  it("includes a record with neither a date nor a size", () => {
    // The page's own proof of the absent-metadata rule. Without one, the rule
    // is only exercised in the Brand Kit.
    return loadGovernanceDocuments().then((documents) => {
      expect(
        documents.some((d) => d.publishedAt === undefined && d.fileSize === undefined),
      ).toBe(true);
    });
  });

  it("leaves one group empty, so the empty state is reachable", () => {
    return loadGovernanceDocuments().then((documents) => {
      expect(documents.some((d) => d.group === "guides")).toBe(false);
    });
  });
});
