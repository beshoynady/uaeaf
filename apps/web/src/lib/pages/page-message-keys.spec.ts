import { describe, expect, it } from "vitest";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import { PREPARING_PAGES, PUBLIC_PAGES } from "./public-pages";

/**
 * Every catalogued page names its title, in both languages.
 *
 * A page whose key has no entry does not fail to build and does not fail a
 * render test: `next-intl` logs `MISSING_MESSAGE` to the server console and
 * hands back the key's own path. The page then ships with `Pages.about` where
 * its name belongs — in the `<title>`, in the tab, in the breadcrumb — and the
 * only sign is a line in a log nobody reads.
 *
 * Found on the About page, whose entry moved from `PREPARING_PAGES` to
 * `PUBLIC_PAGES` without a name being written for it. Pinned here for both
 * catalogues so the next page cannot repeat it.
 *
 * The two catalogues name titles differently and this reads each the way its
 * own pages do: a `PublicPage` carries a `messageKey` into the `Pages`
 * namespace, a `PreparingPage` a whole dotted `titleKey` into any namespace.
 */

const MESSAGES = { ar, en } as const;

/** Walks a dotted path, which is what `next-intl` does with a key. */
const resolve = (messages: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((node, segment) => {
    if (node !== null && typeof node === "object" && segment in node) {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, messages);

const named = (messages: unknown, path: string): boolean => {
  const value = resolve(messages, path);
  return typeof value === "string" && value.trim() !== "";
};

describe("every catalogued page has a name in both languages", () => {
  for (const [locale, messages] of Object.entries(MESSAGES)) {
    it(`PUBLIC_PAGES resolve under Pages in ${locale}`, () => {
      const missing = PUBLIC_PAGES.filter((page) => !named(messages, `Pages.${page.messageKey}`)).map(
        (page) => `${page.route} → Pages.${page.messageKey}`,
      );

      expect(missing).toEqual([]);
    });

    it(`PREPARING_PAGES resolve their titleKey in ${locale}`, () => {
      const missing = PREPARING_PAGES.filter((page) => !named(messages, page.titleKey)).map(
        (page) => `${page.route} → ${page.titleKey}`,
      );

      expect(missing).toEqual([]);
    });
  }
});
