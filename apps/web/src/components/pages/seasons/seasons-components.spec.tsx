import { describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import type { SeasonPhase, SeasonPublic } from "@/lib/seasons/types";
import { SeasonAbout } from "./season-about";
import { SeasonEventsSection } from "./season-events-section";
import { SeasonStatsRow } from "./season-stats-row";
import { SeasonTimeline } from "./season-timeline";
import { SeasonsArchive } from "./seasons-archive-grid";

// 1 September 2026 – 31 August 2027, each stored as Dubai midnight of its day.
const START = "2026-08-31T20:00:00.000Z";
const END = "2027-08-30T20:00:00.000Z";
const DURING = new Date("2026-12-15T08:00:00Z");

const phase = (type: SeasonPhase["type"], ar: string, from: string, to: string): SeasonPhase => ({
  name: { ar, en: ar },
  type,
  from,
  to,
});

const PHASES: SeasonPhase[] = [
  phase("preparation", "المعسكر", START, "2026-10-30T20:00:00.000Z"),
  phase("domestic", "الدوري", "2026-10-31T20:00:00.000Z", "2027-02-27T20:00:00.000Z"),
  // Overlaps the domestic phase: a different type, which the API allows.
  phase("international", "البطولة الآسيوية", "2027-01-31T20:00:00.000Z", "2027-03-30T20:00:00.000Z"),
  phase("rest", "الراحة", "2027-06-30T20:00:00.000Z", END),
];

const season = (slug: string, startDate: string, endDate: string, extra: Partial<SeasonPublic> = {}): SeasonPublic => ({
  id: slug,
  name: { ar: `موسم ${slug}`, en: `Season ${slug}` },
  shortName: slug.slice(2, 4) + "/" + slug.slice(7, 9),
  slug,
  tagline: null,
  logoId: null,
  bannerId: null,
  shareImageId: null,
  about: { ar: "نبذة", en: "About" },
  closingSummary: null,
  startDate,
  endDate,
  phases: [],
  keyDates: [],
  calendarDocumentId: null,
  documentIds: [],
  isCurrent: false,
  seo: null,
  ...extra,
});

describe("SeasonTimeline", () => {
  const renderTimeline = (now = DURING) =>
    renderWithIntl(
      <SeasonTimeline
        phases={PHASES}
        keyDates={[{ title: { ar: "فتح التسجيل", en: "Registration" }, date: "2026-09-30T20:00:00.000Z" }]}
        startDate={START}
        endDate={END}
        now={now}
        locale="ar"
      />,
    );

  it("names every phase's type in text, so colour is never the only difference", () => {
    renderTimeline();
    const list = screen.getByRole("list", { name: "مراحل الموسم بالترتيب" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items.map((item) => item.getAttribute("data-phase"))).toEqual(["preparation", "domestic", "international", "rest"]);
    for (const [item, type] of items.map((item, index) => [item, ["إعداد", "داخلي", "خارجي", "راحة"][index]] as const)) {
      expect(item).toHaveTextContent(type);
    }
  });

  it("draws overlapping phases of different types in separate lanes", () => {
    renderTimeline();
    const lanes = screen.getAllByRole("listitem").filter((item) => item.hasAttribute("data-phase"));
    const laneOf = (name: string) =>
      lanes.find((item) => item.textContent?.includes(name))?.style.getPropertyValue("--season-lane");
    expect(laneOf("الدوري")).toBe("1");
    expect(laneOf("البطولة الآسيوية")).toBe("2");
  });

  it("says where today is while the season runs, and not after it", () => {
    renderTimeline();
    expect(screen.getByText(/^اليوم: 15 ديسمبر 2026$/)).toBeInTheDocument();
  });

  it("does not mark today outside the season", () => {
    renderTimeline(new Date("2027-09-15T08:00:00Z"));
    expect(screen.queryByText(/^اليوم:/)).toBeNull();
  });

  it("lists the key dates beneath, with their Dubai day", () => {
    renderTimeline();
    const keyDates = screen.getByRole("list", { name: "مواعيد مهمة" });
    expect(keyDates).toHaveTextContent("1 أكتوبر");
    expect(keyDates).toHaveTextContent("فتح التسجيل");
  });
});

describe("SeasonStatsRow", () => {
  it("never prints an unknown count, and prints a real zero", () => {
    renderWithIntl(<SeasonStatsRow stats={{ events: null, albums: 0, videos: 4 }} locale="ar" />);
    const row = screen.getByRole("region", { name: "الموسم بالأرقام" });
    expect(row).not.toHaveTextContent("فعالية");
    expect(row).toHaveTextContent("0");
    expect(row).toHaveTextContent("4");
  });

  it("draws nothing when no count is known", () => {
    const { container } = renderWithIntl(<SeasonStatsRow stats={{ events: null, albums: null, videos: null }} locale="ar" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("SeasonEventsSection", () => {
  it("shows an empty state and no count", () => {
    renderWithIntl(<SeasonEventsSection ground="base" />);
    expect(screen.getByText("لا توجد فعاليات منشورة لهذا الموسم بعد")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "فعاليات الموسم" })).not.toHaveTextContent(/\d/);
  });
});

describe("SeasonAbout", () => {
  const withClosing = { about: { ar: "نبذة", en: "About" }, closingSummary: { ar: "الختام", en: "Close" }, startDate: START, endDate: END };

  it("keeps the closing summary off the page through the whole of the last day", () => {
    renderWithIntl(<SeasonAbout season={withClosing} now={new Date("2027-08-31T19:59:00Z")} locale="ar" ground="base" />);
    expect(screen.queryByTestId("season-closing")).toBeNull();
  });

  it("shows it once the last day has ended", () => {
    renderWithIntl(<SeasonAbout season={withClosing} now={new Date("2027-08-31T20:00:00Z")} locale="ar" ground="base" />);
    expect(screen.getByTestId("season-closing")).toHaveTextContent("الختام");
  });
});

describe("SeasonsArchive", () => {
  const archive = [
    season("2027-2028", "2027-08-31T20:00:00.000Z", "2028-08-30T20:00:00.000Z"),
    season("2026-2027", START, END, { isCurrent: true }),
    season("2025-2026", "2025-08-31T20:00:00.000Z", "2026-08-30T20:00:00.000Z"),
    season("2024-2025", "2024-08-31T20:00:00.000Z", "2025-08-30T20:00:00.000Z"),
  ];
  const renderArchive = (seasons: SeasonPublic[] | null) =>
    renderWithIntl(<SeasonsArchive seasons={seasons} stats={new Map()} logos={new Map()} now={DURING} locale="ar" />);

  it("says the archive cannot be shown when the API did not answer", () => {
    renderArchive(null);
    expect(screen.getByText("تعذّر عرض المواسم الآن")).toBeInTheDocument();
  });

  it("says nothing is published yet for an empty archive", () => {
    renderArchive([]);
    expect(screen.getByText("لا توجد مواسم منشورة بعد")).toBeInTheDocument();
  });

  it("features the current season and files the others as upcoming or previous", () => {
    renderArchive(archive);
    expect(screen.getByRole("heading", { level: 2, name: "موسم 2026-2027" })).toBeInTheDocument();
    const upcoming = screen.getByRole("region", { name: "المواسم القادمة" });
    const previous = screen.getByRole("region", { name: "المواسم السابقة" });
    expect(within(upcoming).getAllByRole("article")).toHaveLength(1);
    expect(within(previous).getAllByRole("article")).toHaveLength(2);
  });

  it("prints a card's known counts and leaves an unknown one out", () => {
    renderWithIntl(
      <SeasonsArchive
        seasons={archive}
        stats={new Map([["2024-2025", { events: null, albums: 2, videos: null }]])}
        logos={new Map()}
        now={DURING}
        locale="ar"
      />,
    );
    const card = screen.getByRole("heading", { name: "موسم 2024-2025" }).closest("article");
    expect(card).toHaveTextContent("2 ألبوم صور");
    expect(card).not.toHaveTextContent("فيديو");
  });

  it("finds a season by a year typed in Arabic-Indic digits", () => {
    renderArchive(archive);
    fireEvent.change(screen.getByRole("searchbox", { name: "ابحث عن موسم بالسنة" }), { target: { value: "٢٠٢٤" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "موسم 2024-2025" })).toBeInTheDocument();
  });

  // A live region inserted together with its message is not reliably read
  // (WCAG 4.1.3): the region has to be in the page, empty, before the
  // no-match sentence is put in it.
  it("has the no-match live region in the page, empty, before any search", () => {
    renderArchive(archive);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("says when no season matches, and clears the search from there", () => {
    renderArchive(archive);
    fireEvent.change(screen.getByRole("searchbox", { name: "ابحث عن موسم بالسنة" }), { target: { value: "1999" } });
    expect(screen.getByText("لا يوجد موسم يطابق «1999»")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "مسح البحث" }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });
});
