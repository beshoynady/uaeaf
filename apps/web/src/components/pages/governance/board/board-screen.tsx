import type { AppLocale } from "@/i18n/routing";
import type { BoardPageView } from "@/lib/governance/types";

import { BoardChairman } from "./board-chairman";
import { BoardHero } from "./board-hero";
import { BoardLeadership } from "./board-leadership";
import { BoardMembers } from "./board-members";
import { BoardStructure } from "./board-structure";

/**
 * The Board of Directors page, drawn entirely from one `BoardPageView`.
 *
 * The chart comes before the people because the page answers "how is the
 * federation governed" first and "who holds each post" second, and each
 * section decides for itself whether it has anything to draw. A fragment: the
 * layout already renders the page's one `<main>`.
 */
export const BoardScreen = ({ board, locale }: { board: BoardPageView; locale: AppLocale }) => (
  <>
    <BoardHero board={board} locale={locale} />
    <BoardStructure chart={board.chart} locale={locale} />
    <BoardChairman chairman={board.chairman} locale={locale} />
    <BoardLeadership leadership={board.leadership} locale={locale} />
    <BoardMembers members={board.members} locale={locale} />
  </>
);
