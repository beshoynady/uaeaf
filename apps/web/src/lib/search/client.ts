"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppLocale } from "@/i18n/routing";

/**
 * Mirrors `SEARCH_SOURCE_KEYS`
 * (`api/src/modules/platform-administration/search/search-sources.ts`) — the
 * closed set of collections `GET /search/public` can be asked about.
 */
export const SEARCH_SOURCE_KEYS = ["articles", "albums", "videos", "clubs", "athletes", "coaches"] as const;
export type SearchSourceKey = (typeof SEARCH_SOURCE_KEYS)[number];

/** Mirrors `SearchHitDto`. */
export interface SearchHit {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  thumbnailId: string | null;
}

/**
 * Mirrors `SearchGroupDto`. Present only for a type that matched at least one
 * publicly visible row — `SearchService.search` drops every empty group
 * before it reaches this response, so `groups.length === 0` is the one signal
 * "nothing matched" ever needs.
 */
export interface SearchGroup {
  type: SearchSourceKey;
  total: number;
  items: SearchHit[];
}

export type SearchState = "idle" | "loading" | "ready" | "error";

/** A query shorter than this is never sent — it mirrors the service's own
 *  floor, so the dialog does not spend a request (or a rate-limit slot) on
 *  something the endpoint would answer `{ groups: [] }` to anyway. */
export const MIN_QUERY_LENGTH = 2;
export const DEFAULT_LIMIT = 5;
/** "Show more" raises one group's own limit to this and no further — the
 *  endpoint clamps `limit` here regardless of what is asked for, so a group
 *  whose `total` exceeds it has no further page to request. */
export const MAX_LIMIT = 10;
const DEBOUNCE_MS = 200;

const buildSearchUrl = (
  q: string,
  locale: AppLocale,
  types: readonly SearchSourceKey[] | undefined,
  limit: number,
): string => {
  const params = new URLSearchParams({ q, locale, limit: String(limit) });
  if (types && types.length > 0) params.set("types", types.join(","));
  return `/api/search?${params.toString()}`;
};

/** One request to the same-origin relay (`app/api/search/route.ts`), never to
 *  the API's own origin. Throws on a non-2xx response or a network failure —
 *  including an aborted request, which the caller is expected to have
 *  already decided not to care about via `signal`. */
const fetchSearchGroups = async (
  q: string,
  locale: AppLocale,
  types: readonly SearchSourceKey[] | undefined,
  limit: number,
  signal: AbortSignal,
): Promise<SearchGroup[]> => {
  const response = await fetch(buildSearchUrl(q, locale, types, limit), {
    signal,
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`search failed: ${response.status}`);
  const body = (await response.json()) as { groups: SearchGroup[] };
  return body.groups;
};

export interface UseSearchResult {
  groups: SearchGroup[];
  state: SearchState;
  /** Raises one group's own limit to `MAX_LIMIT` and merges the result back
   *  in, leaving every other group exactly as the main query returned it. */
  requestMore: (type: SearchSourceKey) => void;
  /** The type(s) whose "show more" request is still in flight. */
  loadingMore: ReadonlySet<SearchSourceKey>;
}

/**
 * Debounced, cancellable site search.
 *
 * Superseding is structural, not a flag read afterward: the effect's own
 * cleanup aborts the in-flight request before the next keystroke's request
 * starts, and both the success and the error branch check `signal.aborted`
 * before touching state — so a slow response for an earlier term can never
 * land after, and overwrite, a newer one. The same guard applies to
 * `requestMore`: a new term aborts any "show more" request the previous
 * term's groups were still expanding, since those groups are about to be
 * replaced or cleared.
 */
export const useSearch = (term: string, locale: AppLocale): UseSearchResult => {
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [loadingMore, setLoadingMore] = useState<ReadonlySet<SearchSourceKey>>(new Set());
  const moreControllers = useRef(new Map<SearchSourceKey, AbortController>());

  useEffect(() => {
    const trimmed = term.trim();

    moreControllers.current.forEach((controller) => controller.abort());
    moreControllers.current.clear();
    setLoadingMore(new Set());

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState("idle");
      setGroups([]);
      return;
    }

    const controller = new AbortController();
    setState("loading");

    const timer = setTimeout(() => {
      fetchSearchGroups(trimmed, locale, undefined, DEFAULT_LIMIT, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setGroups(result);
          setState("ready");
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState("error");
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, locale]);

  const requestMore = useCallback(
    (type: SearchSourceKey) => {
      const trimmed = term.trim();
      if (trimmed.length < MIN_QUERY_LENGTH) return;

      moreControllers.current.get(type)?.abort();
      const controller = new AbortController();
      moreControllers.current.set(type, controller);
      setLoadingMore((existing) => new Set(existing).add(type));

      fetchSearchGroups(trimmed, locale, [type], MAX_LIMIT, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          const expanded = result.find((group) => group.type === type);
          if (!expanded) return;
          setGroups((existing) => existing.map((group) => (group.type === type ? expanded : group)));
        })
        .catch(() => {
          // The five results already on screen stand — there is nothing to
          // roll back, and a failed expansion is not worth a second error
          // state for a control that is not the primary search itself.
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          moreControllers.current.delete(type);
          setLoadingMore((existing) => {
            const next = new Set(existing);
            next.delete(type);
            return next;
          });
        });
    },
    [term, locale],
  );

  return { groups, state, requestMore, loadingMore };
};
