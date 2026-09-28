/**
 * `key → <svg>` for every nav leaf, plus a generic fallback for any key the
 * map does not name. Stroke-only glyphs, one visual language for the whole
 * mega panel row.
 */

type IconProps = { className?: string };

const STROKE = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": "true" as const,
  focusable: "false" as const,
};

const AboutOverview = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.2" />
  </svg>
);

const PresidentMessage = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
  </svg>
);

const BoardMembers = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="9" cy="9" r="2.8" />
    <circle cx="17" cy="10.5" r="2.2" />
    <path d="M4 19c.6-3 2.4-4.6 5-4.6s4.4 1.6 5 4.6M15 19c.4-2.2 1.6-3.4 3.4-3.4" />
  </svg>
);

const Committees = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="4.5" y="5" width="15" height="14" rx="1.6" />
    <path d="M8 9.5h8M8 13h8M8 16.5h5" />
  </svg>
);

const VisionMission = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

const StrategicPlan = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M5 19V9l5.5-4.5L16 9v10" />
    <path d="M5 19h11M9 19v-5h3v5" />
  </svg>
);

const Policies = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M7 4.5h7l3.5 3.5V19.5H7z" />
    <path d="M14 4.5V8h3.5M9.5 12.5h5M9.5 15.5h5" />
  </svg>
);

const DiscoverAthletics = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M4.5 18 10 8.5l3 4.5 2-3 4.5 8" />
    <circle cx="17.5" cy="6.5" r="1.7" />
  </svg>
);

const DisciplinesEvents = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="12" cy="9" r="3.2" />
    <path d="M9 11.8 6 19.5M15 11.8l3 7.7M8.5 19.5h7" />
  </svg>
);

const AgeCategories = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="8.5" cy="8" r="2.5" />
    <circle cx="16" cy="9.5" r="1.9" />
    <path d="M4 19c.5-3.3 2.3-5 4.5-5s4 1.7 4.5 5M14.5 19c.3-2.4 1.4-3.7 3-3.7" />
  </svg>
);

const StartTraining = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M6 6.5v11M18 6.5v11M6 12h12" />
    <path d="M3.5 9v6M20.5 9v6" />
  </svg>
);

const Clubs = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M12 4.5 5 7v5.5c0 4.2 3 6.6 7 7.5 4-.9 7-3.3 7-7.5V7z" />
  </svg>
);

const Athletes = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="12" cy="6.2" r="2.3" />
    <path d="M6 19.5 10 12l-2.3-3M18 19.5 14 12l2.3-3M9.7 9h4.6" />
  </svg>
);

const NationalTeams = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="8.5" cy="8" r="2.4" />
    <circle cx="15.5" cy="8" r="2.4" />
    <path d="M4 19c.4-3 2.1-4.6 4.5-4.6S12.6 16 13 19M12.5 19c.4-2.9 2-4.5 4.3-4.5S20.6 16.1 21 19" />
  </svg>
);

const Coaches = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M5 19c0-4.4 3.1-7 7-7s7 2.6 7 7" />
    <path d="M9 12V6.5a3 3 0 0 1 6 0V12" />
  </svg>
);

const Officials = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="5" y="4.5" width="14" height="15" rx="1.6" />
    <path d="M9 4.5v3M15 4.5v3M8 12l2.5 2.5L16 9" />
  </svg>
);

const Championships = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M7 4.5h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 7 11M17 6h2.5v1.5A3.5 3.5 0 0 1 17 11" />
    <path d="M12 14.5v3M9 19.5h6" />
  </svg>
);

const ResultsRankings = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M6 19.5v-6M12 19.5V8M18 19.5v-9.5" />
  </svg>
);

const Records = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <path d="M12 4.5 6 8v4.3c0 4 2.6 6.4 6 7.2 3.4-.8 6-3.2 6-7.2V8z" />
    <path d="M9.7 12.2l1.6 1.6 3-3.4" />
  </svg>
);

const AllEvents = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="4.5" y="5.5" width="15" height="13.5" rx="1.6" />
    <path d="M4.5 9.5h15M8 4v3M16 4v3" />
  </svg>
);

const SeasonAgenda = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="4.5" y="5.5" width="15" height="13.5" rx="1.6" />
    <path d="M4.5 9.5h15M8 4v3M16 4v3M8.5 13h2M13.5 13h2M8.5 16h2" />
  </svg>
);

const CurrentSeason = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

const SeasonsArchive = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="4.5" y="8" width="15" height="11" rx="1.4" />
    <path d="M4.5 8 6.5 4.5h11L19.5 8M10 12.5h4" />
  </svg>
);

const News = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="4.5" y="5.5" width="15" height="13" rx="1.4" />
    <path d="M8 9.5h8M8 12.5h8M8 15.5h5" />
  </svg>
);

const PhotoAlbums = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="4" y="6" width="16" height="12.5" rx="1.4" />
    <circle cx="9" cy="11" r="1.7" />
    <path d="M4.5 17 9.5 13l3 2.5 3-3 4 4.5" />
  </svg>
);

const Videos = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="4" y="6" width="12" height="12" rx="1.4" />
    <path d="M16 10.5 20 8v8l-4-2.5z" />
  </svg>
);

const LiveStream = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <circle cx="12" cy="12" r="2.4" />
    <path d="M8.3 8.3a5.2 5.2 0 0 0 0 7.4M15.7 8.3a5.2 5.2 0 0 1 0 7.4M5.3 5.3a9.4 9.4 0 0 0 0 13.4M18.7 5.3a9.4 9.4 0 0 1 0 13.4" />
  </svg>
);

const Contact = ({ className }: IconProps) => (
  <svg {...STROKE} className={className}>
    <rect x="4" y="5.5" width="16" height="13" rx="1.6" />
    <path d="m4.5 6.5 7.5 6 7.5-6" />
  </svg>
);

/**
 * Any key with no destination glyph, so a future nav item never renders
 * nothing or crashes.
 *
 * `data-icon-fallback` is load-bearing for `nav-icon.spec.tsx`: without a
 * marker distinguishing this glyph from a mapped one, a test that only checks
 * "some `<svg>` rendered" cannot tell a real icon from every key silently
 * falling through to this one.
 */
const Fallback = ({ className }: IconProps) => (
  <svg {...STROKE} data-icon-fallback="true" className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.5v4.5" />
    <circle cx="12" cy="15.7" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

const ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  aboutOverview: AboutOverview,
  presidentMessage: PresidentMessage,
  boardMembers: BoardMembers,
  committees: Committees,
  visionMission: VisionMission,
  strategicPlan: StrategicPlan,
  policies: Policies,
  discoverAthletics: DiscoverAthletics,
  disciplinesEvents: DisciplinesEvents,
  ageCategories: AgeCategories,
  startTraining: StartTraining,
  clubs: Clubs,
  athletes: Athletes,
  nationalTeams: NationalTeams,
  coaches: Coaches,
  officials: Officials,
  championships: Championships,
  resultsRankings: ResultsRankings,
  records: Records,
  allEvents: AllEvents,
  seasonAgenda: SeasonAgenda,
  currentSeason: CurrentSeason,
  seasonsArchive: SeasonsArchive,
  news: News,
  photoAlbums: PhotoAlbums,
  videos: Videos,
  liveStream: LiveStream,
  contact: Contact,
};

/**
 * The glyph for a nav leaf's key, sized `--icon-size-sm` inside its caller's
 * `--space-10` tile. Falls back to a generic mark rather than rendering
 * nothing for a key this map does not name.
 */
export const NavIcon = ({ name, className = "size-[var(--icon-size-sm)]" }: { name: string; className?: string }) => {
  const Icon = ICONS[name] ?? Fallback;
  return <Icon className={className} />;
};
