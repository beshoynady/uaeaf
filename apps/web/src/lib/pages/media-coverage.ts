/**
 * "UAEAF in the Media" on the homepage (Homepage Specification §11b,
 * `CT-EXTERNALMEDIA-001`): what other outlets published about the federation.
 *
 * No coverage collection exists yet, so the section draws bracketed
 * placeholders exactly as the approved canvas does, and only outside
 * production (owner decision 2026-09-22). Production renders nothing until
 * real coverage has a source. It is never filled with the federation's own
 * `FederationInMedia` articles: those are its own reporting, and §11b keeps
 * the two content types apart.
 */

/** Five, so the track overflows at 1440px as the canvas draws it: four whole
 *  cards and the start of a fifth under the edge fade (owner decision
 *  2026-09-22). */
export const COVERAGE_PLACEHOLDER_COUNT = 5;

/** The hidden flag: placeholders are a development view, never a public one. */
export const showsCoveragePlaceholders = (nodeEnv: string | undefined = process.env.NODE_ENV): boolean =>
  nodeEnv !== "production";
