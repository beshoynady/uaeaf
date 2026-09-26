import { callUpstream } from "@/lib/api/upstream";
import type { LocalizedText, PeopleKind, PersonOption } from "./types";

/**
 * Athletes and clubs, for the album's "who appears" pickers.
 *
 * Read from `GET /athletes/public` and `GET /clubs/public` — the two reference
 * lists that exist today. Neither takes a search term, so the search happens
 * here, on the server, over the pages those endpoints return: the browser asks
 * the route handler, the handler asks the API, and only the matches travel
 * back.
 *
 * Both are public reads, so no token is sent. A list that cannot be read is an
 * empty list — the pickers then find nothing, which is less than the editor
 * wanted and not a failure of the album they are editing.
 */

/** The endpoint's own ceiling (`limit` max 200), and a stop after five pages:
 *  a thousand names is past what a search over a federation's roster needs,
 *  and a runaway loop against a public endpoint is not a risk worth taking. */
const PAGE_LIMIT = 200;
const MAX_PAGES = 5;

/** How many matches one search returns. A result list longer than this is
 *  one nobody reads; typing another letter is faster than scrolling. */
export const SEARCH_RESULT_LIMIT = 12;

const toPerson = (raw: unknown): PersonOption | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as { id?: unknown; _id?: unknown; name?: unknown };
  const id = typeof row.id === "string" ? row.id : typeof row._id === "string" ? row._id : null;
  const name = row.name as Partial<LocalizedText> | undefined;
  if (!id || typeof name !== "object" || name === null) return null;
  return { id, name: { ar: typeof name.ar === "string" ? name.ar : "", en: typeof name.en === "string" ? name.en : "" } };
};

export const readPeople = async (kind: PeopleKind): Promise<PersonOption[]> => {
  const people: PersonOption[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const answer = await callUpstream<{ items?: unknown[]; total?: number }>(
      `/${kind}/public?page=${page}&limit=${PAGE_LIMIT}`,
    ).catch(() => null);
    const items = Array.isArray(answer?.items) ? answer.items : [];
    people.push(...items.flatMap((item) => toPerson(item) ?? []));
    if (items.length < PAGE_LIMIT || (typeof answer?.total === "number" && people.length >= answer.total)) break;
  }
  return people;
};

/** Arabic letters written with and without their marks are the same name to
 *  a reader, so the marks are dropped before comparing — "مُحمد" finds "محمد". */
const fold = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[ً-ٰٟ̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Matches in either language, names that start with the term first. */
export const searchPeople = (
  people: readonly PersonOption[],
  term: string,
  limit: number = SEARCH_RESULT_LIMIT,
): PersonOption[] => {
  const needle = fold(term);
  if (needle === "") return [];
  const scored = people.flatMap((person) => {
    const names = [fold(person.name.ar), fold(person.name.en)];
    if (names.some((name) => name.startsWith(needle))) return [{ person, rank: 0 }];
    if (names.some((name) => name.includes(needle))) return [{ person, rank: 1 }];
    return [];
  });
  return scored.sort((a, b) => a.rank - b.rank).slice(0, limit).map(({ person }) => person);
};

/** The named people among these ids, in the order the ids were given. An id
 *  the list no longer holds is kept with an empty name, so the editor can
 *  still see and remove it rather than having it vanish from the form while it
 *  stays on the record. */
export const pickPeople = (people: readonly PersonOption[], ids: readonly string[]): PersonOption[] => {
  const byId = new Map(people.map((person) => [person.id, person]));
  return ids.map((id) => byId.get(id) ?? { id, name: { ar: "", en: "" } });
};
