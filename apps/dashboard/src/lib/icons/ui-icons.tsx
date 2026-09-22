import type { ReactElement } from "react";

/**
 * The dashboard's UI icons: navigation, actions and state (ADR-0068 D6.1).
 *
 * From lucide (ISC, lucide-static 0.469.0), vendored as paths rather than an
 * icon dependency — ADR-0065 D6 admits a third-party UI package only for a
 * WAI-ARIA pattern with focus management, which an icon set is not, and
 * `plan-phase-icons.tsx` set the same precedent.
 *
 * CMP-ICON-001 as amended by D6.3: `currentColor`, a 1.5 stroke, and hidden
 * from assistive technology — every icon here sits inside a control that
 * already carries its name, so reading the icon too would say it twice.
 * Direction is the caller's: an arrow that points along the reading direction
 * takes `rtl:-scale-x-100` where it is used.
 */
const PATHS = {
  // ── Screens ────────────────────────────────────────────────────────────
  "layout-dashboard": (
    <g>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </g>
  ),
  users: (
    <g>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </g>
  ),
  "key-round": (
    <g>
      <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </g>
  ),
  files: (
    <g>
      <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
      <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" />
      <path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8" />
    </g>
  ),
  "message-square-quote": (
    <g>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 12a2 2 0 0 0 2-2V8H8" />
      <path d="M14 12a2 2 0 0 0 2-2V8h-2" />
    </g>
  ),
  target: (
    <g>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </g>
  ),
  map: (
    <g>
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </g>
  ),
  newspaper: (
    <g>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </g>
  ),
  "clipboard-check": (
    <g>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </g>
  ),
  "list-checks": (
    <g>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </g>
  ),
  image: (
    <g>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </g>
  ),
  "gallery-horizontal": (
    <g>
      <path d="M2 3v18" />
      <rect width="12" height="18" x="6" y="3" rx="2" />
      <path d="M22 3v18" />
    </g>
  ),
  handshake: (
    <g>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
      <path d="M3 4h8" />
    </g>
  ),
  "building-2": (
    <g>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </g>
  ),
  "badge-check": (
    <g>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </g>
  ),
  "panel-bottom": (
    <g>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 15h18" />
    </g>
  ),

  // ── Shell ──────────────────────────────────────────────────────────────
  search: (
    <g>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </g>
  ),
  "panel-left-close": (
    <g>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </g>
  ),
  "panel-left-open": (
    <g>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </g>
  ),
  menu: (
    <g>
      <path d="M4 12h16" />
      <path d="M4 6h16" />
      <path d="M4 18h16" />
    </g>
  ),
  x: (
    <g>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </g>
  ),

  inbox: (
    <g>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </g>
  ),

  // ── Actions and state ──────────────────────────────────────────────────
  bell: (
    <g>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </g>
  ),
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  plus: (
    <g>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </g>
  ),
  minus: <path d="M5 12h14" />,
  "arrow-up": (
    <g>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </g>
  ),
  "arrow-down": (
    <g>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </g>
  ),
  "circle-alert": (
    <g>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </g>
  ),
  lock: (
    <g>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </g>
  ),
} satisfies Record<string, ReactElement>;

export type UiIconName = keyof typeof PATHS;

/**
 * The icon each screen shows in the navigation, most of all in the collapsed
 * sidebar where it is the only thing drawn. Keyed by the `Nav` message key.
 * Groups have none: collapsed, a group draws its screens' icons under a rule.
 */
export const NAV_ICON: Record<string, UiIconName> = {
  overview: "layout-dashboard",
  users: "users",
  roles: "key-round",
  pages: "files",
  presidentMessage: "message-square-quote",
  visionMission: "target",
  strategicPlan: "map",
  messages: "inbox",
  newsList: "newspaper",
  newsReview: "clipboard-check",
  approvalPolicies: "list-checks",
  homepageHero: "image",
  homepageSponsorStrip: "gallery-horizontal",
  homepageSponsors: "handshake",
  homepagePartners: "building-2",
  homepageMemberships: "badge-check",
  homepageFooter: "panel-bottom",
};

export const UiIcon = ({ name, className }: { name: UiIconName; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className ?? "size-[var(--icon-size-sm)] shrink-0"}
  >
    {PATHS[name]}
  </svg>
);
