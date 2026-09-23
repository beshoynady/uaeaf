"use client";

import { useEffect } from "react";

/**
 * Warns before unsaved work is thrown away.
 *
 * ── Why a hook and not `EditorShell` ───────────────────────────────────────
 *
 * The create screen had no guard at all: closing the tab midway through a new
 * article lost every word, silently. The obvious repair is to give the create
 * branch the same `EditorShell` the edit branch uses — but that shell exists
 * to save a record that already has an id (it PATCHes
 * `/api/admin/editorial/:type/:id`), to show its version history and to
 * report its editorial state. None of the three exists before the first save,
 * so adopting the shell would mean threading "there is no record yet" through
 * all of it.
 *
 * The guard is the only part both screens need, so the guard is what moves.
 * One hook, two call sites, and neither screen grows a branch it does not use
 * (owner decision 2026-09-23: the simplest and least duplicated of the two).
 *
 * ── What it can and cannot catch ───────────────────────────────────────────
 *
 * `beforeunload` covers the closed tab, the reload and the typed address —
 * the cases that lose work outright. It deliberately does NOT cover in-app
 * navigation: the App Router gives no cancellable navigation event, and the
 * workarounds all involve intercepting clicks on every link on the page,
 * which breaks the back button in exchange for a prompt. In-app navigation
 * keeps the React tree alive on a `router.push` within the same layout, so
 * the ordinary case of clicking away and returning does not lose the draft.
 *
 * Registered only while `dirty`, so a saved form never argues with someone
 * trying to leave it.
 */
export const useUnsavedGuard = (dirty: boolean): void => {
  useEffect(() => {
    if (!dirty) {
      return;
    }

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Some browsers still require the legacy return value to show the prompt.
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
};
