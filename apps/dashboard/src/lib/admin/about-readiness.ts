import type { LocalizedText } from "@/lib/api/types";

/**
 * What the About page's editor is told before they send the page for approval.
 *
 * Computed from the draft in the browser rather than asked of the API,
 * because it answers a question about what the editor has typed *now* — an
 * answer that has to change as they type, not when they save.
 *
 * Three levels, distinguished by what the editor is expected to do:
 *
 * - **required** blocks the submission. Only one thing qualifies: a required
 *   field written in one language and not the other. The page is published in
 *   both, so half a field is a page that is broken for half its readers, and
 *   no reviewer should be asked to approve that.
 * - **warning** does not block. An empty picture slot prints an
 *   identity-coloured surface — a deliberate design, not a failure — and a
 *   federation that has not finished scanning its archive must still be able
 *   to publish its history.
 * - **info** is not a problem at all. An undated milestone is being withheld
 *   exactly as intended; the notice exists so that its absence from the page
 *   is never discovered by surprise.
 */

export type AboutSectionKey =
  | "hero"
  | "facts"
  | "story"
  | "timeline"
  | "achievements"
  | "pioneers"
  | "leadership"
  | "governance"
  | "ecosystem"
  | "cta";

/** What an editor may switch off (ADR-0101). */
export const HIDEABLE_SECTIONS: readonly AboutSectionKey[] = [
  "facts",
  "story",
  "timeline",
  "achievements",
  "pioneers",
  "governance",
  "cta",
];

/** Printed in this order, always (ADR-0101 D3). */
export const SECTION_ORDER: readonly AboutSectionKey[] = [
  "hero",
  "facts",
  "story",
  "timeline",
  "achievements",
  "pioneers",
  "leadership",
  "governance",
  "ecosystem",
  "cta",
];

/** The two sections whose presence follows their source, not a switch. */
export const AUTOMATIC_SECTIONS: readonly AboutSectionKey[] = ["leadership", "ecosystem"];

export type SectionStatus = "complete" | "translation" | "images" | "hidden" | "auto";

export interface SectionReadiness {
  key: AboutSectionKey;
  status: SectionStatus;
  missingTranslations: number;
  missingImages: number;
  /** Present for the sections that hold a list. */
  visibleItems?: number;
  hiddenItems?: number;
  /** Present for the automatic sections: what their source holds today. */
  sourceCount?: number;
}

export interface Notice {
  level: "required" | "warning" | "info";
  section: AboutSectionKey;
  /** The id of the control to send the editor to. A notice they cannot act
   *  from is a complaint. */
  fieldId: string;
  kind: "translation" | "image" | "autoHidden";
  count: number;
}

export interface Readiness {
  sections: SectionReadiness[];
  notices: Notice[];
}

type Item = { _id?: string; isVisible?: boolean; imageId?: string | null };

export interface AboutDraft {
  hiddenSections: AboutSectionKey[];
  hero: { eyebrow: LocalizedText; title: LocalizedText; description: LocalizedText; imageId: string | null };
  facts: { items: ({ value: string; badge: LocalizedText; label: LocalizedText } & Item)[] };
  story: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    paragraphs: LocalizedText[];
    imageId: string | null;
    docCard: { label: LocalizedText; title: LocalizedText; date: LocalizedText };
  };
  timeline: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    items: ({ datePrecision: string; title: LocalizedText; description: LocalizedText } & Item)[];
  };
  achievements: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    items: ({ place: LocalizedText; title: LocalizedText; description: LocalizedText; medalLabel: LocalizedText | null } & Item)[];
  };
  pioneers: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    items: ({ name: LocalizedText; badge: LocalizedText; description: LocalizedText } & Item)[];
  };
  leadership: { eyebrow: LocalizedText; title: LocalizedText; quote: LocalizedText; priorities: LocalizedText[] };
  governance: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    cards: ({ title: LocalizedText; text: LocalizedText } & Item)[];
    link: { label: LocalizedText; href: string };
  };
  ecosystem: { eyebrow: LocalizedText; title: LocalizedText };
  cta: {
    title: LocalizedText;
    description: LocalizedText;
    primary: { label: LocalizedText; href: string };
    secondary: { label: LocalizedText; href: string };
  };
  seo: { metaTitle: LocalizedText | null; metaDescription: LocalizedText | null; ogImageId: string | null };
}

/** What the sections' figures are counted from, which the draft does not
 *  hold: both come from elsewhere and are read alongside it. */
export interface Sources {
  /** People serving in the current cycle, per the board module. */
  leaderCount: number;
  /** Tiles with a figure behind them, per the record counts. */
  statCount: number;
}

/** A pair is written when both halves are. A field the editor has not reached
 *  yet is empty in both and is not a *translation* problem — it is a field
 *  they have not reached yet, and the schema will not let it publish either
 *  way. Counting it here would fill the panel with rows for a page nobody has
 *  started. */
const halfWritten = (text: LocalizedText | null | undefined): boolean => {
  if (!text) {
    return false;
  }
  const ar = text.ar?.trim() ?? "";
  const en = text.en?.trim() ?? "";
  return (ar.length > 0) !== (en.length > 0);
};

const countHalfWritten = (...texts: (LocalizedText | null | undefined)[]): number =>
  texts.filter(halfWritten).length;

const visible = (item: Item): boolean => item.isVisible !== false;

/** Hidden from the page, by either route: the editor's own switch, or a date
 *  the federation has not confirmed. */
const withheld = (item: Item & { datePrecision?: string }): boolean =>
  !visible(item) || item.datePrecision === "unknown";

export const readinessOf = (draft: AboutDraft, sources: Sources): Readiness => {
  const hidden = new Set(draft.hiddenSections);
  const sections: SectionReadiness[] = [];
  const notices: Notice[] = [];

  const add = (
    key: AboutSectionKey,
    translations: number,
    images: number,
    extra: Partial<SectionReadiness> = {},
  ) => {
    // A section nobody will read cannot be the reason a page will not
    // publish: its problems are real but they are not this submission's.
    if (hidden.has(key)) {
      sections.push({ key, status: "hidden", missingTranslations: 0, missingImages: 0, ...extra });
      return;
    }

    if (translations > 0) {
      notices.push({ level: "required", section: key, fieldId: `about-${key}`, kind: "translation", count: translations });
    }
    if (images > 0) {
      notices.push({ level: "warning", section: key, fieldId: `about-${key}`, kind: "image", count: images });
    }

    const automatic = AUTOMATIC_SECTIONS.includes(key);
    const status: SectionStatus =
      translations > 0 ? "translation" : images > 0 ? "images" : automatic ? "auto" : "complete";

    sections.push({ key, status, missingTranslations: translations, missingImages: images, ...extra });
  };

  add(
    "hero",
    countHalfWritten(draft.hero.eyebrow, draft.hero.title, draft.hero.description),
    draft.hero.imageId ? 0 : 1,
  );

  add(
    "facts",
    draft.facts.items.reduce((total, item) => total + countHalfWritten(item.badge, item.label), 0),
    0,
    { visibleItems: draft.facts.items.filter(visible).length, hiddenItems: draft.facts.items.filter((item) => !visible(item)).length },
  );

  add(
    "story",
    countHalfWritten(
      draft.story.eyebrow,
      draft.story.title,
      draft.story.docCard.label,
      draft.story.docCard.title,
      draft.story.docCard.date,
      ...draft.story.paragraphs,
    ),
    draft.story.imageId ? 0 : 1,
  );

  const timelineHidden = draft.timeline.items.filter(withheld);
  add(
    "timeline",
    countHalfWritten(
      draft.timeline.eyebrow,
      draft.timeline.title,
      draft.timeline.description,
      ...draft.timeline.items.flatMap((item) => [item.title, item.description]),
    ),
    0,
    {
      visibleItems: draft.timeline.items.length - timelineHidden.length,
      hiddenItems: timelineHidden.length,
    },
  );

  if (!hidden.has("timeline")) {
    const undated = draft.timeline.items.filter((item) => item.datePrecision === "unknown").length;
    if (undated > 0) {
      notices.push({ level: "info", section: "timeline", fieldId: "about-timeline", kind: "autoHidden", count: undated });
    }
  }

  add(
    "achievements",
    countHalfWritten(
      draft.achievements.eyebrow,
      draft.achievements.title,
      draft.achievements.description,
      ...draft.achievements.items.flatMap((item) => [item.place, item.title, item.description, item.medalLabel]),
    ),
    draft.achievements.items.filter((item) => !item.imageId).length,
    {
      visibleItems: draft.achievements.items.filter(visible).length,
      hiddenItems: draft.achievements.items.filter((item) => !visible(item)).length,
    },
  );

  add(
    "pioneers",
    countHalfWritten(
      draft.pioneers.eyebrow,
      draft.pioneers.title,
      ...draft.pioneers.items.flatMap((item) => [item.name, item.badge, item.description]),
    ),
    draft.pioneers.items.filter((item) => !item.imageId).length,
    {
      visibleItems: draft.pioneers.items.filter(visible).length,
      hiddenItems: draft.pioneers.items.filter((item) => !visible(item)).length,
    },
  );

  add(
    "leadership",
    countHalfWritten(draft.leadership.eyebrow, draft.leadership.title, draft.leadership.quote, ...draft.leadership.priorities),
    0,
    { sourceCount: sources.leaderCount },
  );

  add(
    "governance",
    countHalfWritten(
      draft.governance.eyebrow,
      draft.governance.title,
      draft.governance.description,
      draft.governance.link.label,
      ...draft.governance.cards.flatMap((card) => [card.title, card.text]),
    ),
    0,
    {
      visibleItems: draft.governance.cards.filter(visible).length,
      hiddenItems: draft.governance.cards.filter((card) => !visible(card)).length,
    },
  );

  add("ecosystem", countHalfWritten(draft.ecosystem.eyebrow, draft.ecosystem.title), 0, {
    sourceCount: sources.statCount,
  });

  add(
    "cta",
    countHalfWritten(draft.cta.title, draft.cta.description, draft.cta.primary.label, draft.cta.secondary.label),
    0,
  );

  // Worst first: an editor scanning the panel should meet the thing that is
  // stopping them before the things that are not.
  const rank = { required: 0, warning: 1, info: 2 } as const;
  notices.sort((left, right) => rank[left.level] - rank[right.level]);

  return { sections, notices };
};

/** Whether the page may be sent for approval. Read from the notices rather
 *  than recomputed, so the button and the panel can never disagree about why. */
export const submissionBlocked = (readiness: Readiness): boolean =>
  readiness.notices.some((notice) => notice.level === "required");
