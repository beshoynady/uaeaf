import type { BoardPageView, OrgChartRow, OrgChartView } from "@/lib/governance/types";

/**
 * The chart's rows, highest rank first.
 *
 * Sorted here as well as by whoever built the view: the chart's reading order
 * is the hierarchy itself, so it cannot depend on how the endpoint sorted.
 */
export const orderedRows = (chart: OrgChartView): readonly OrgChartRow[] =>
  [...chart.rows].filter((row) => row.posts.length > 0).sort((a, b) => a.rank - b.rank);

/** People on the board, counted once each however many board posts they hold. */
export const boardHeadcount = (chart: OrgChartView): number =>
  new Set(chart.rows.flatMap((row) => row.posts.map((post) => post.person.id))).size;

/** Every committee the chart draws: the standing ones, their children, and the board's own. */
export const committeeCount = (chart: OrgChartView): number =>
  chart.standing.reduce((total, committee) => total + 1 + committee.children.length, 0) +
  chart.boardSubCommittees.length;

/**
 * Whether the structure section has anything to draw.
 *
 * Shared by the section and the hero's jump links, so a link can never point
 * at an anchor the page did not render.
 */
export const hasStructure = (chart: OrgChartView): boolean =>
  chart.memberClubCount > 0 || orderedRows(chart).length > 0 || committeeCount(chart) > 0;

/** Same rule for the members section. */
export const hasMembers = (board: BoardPageView): boolean => board.members.length > 0;
