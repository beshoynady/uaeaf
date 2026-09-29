import type { AppLocale } from "./routing";

import arAlbums from "../../messages/ar/albums.json";
import arChrome from "../../messages/ar/chrome.json";
import arContact from "../../messages/ar/contact.json";
import arGovernance from "../../messages/ar/governance.json";
import arHome from "../../messages/ar/home.json";
import arNews from "../../messages/ar/news.json";
import arShell from "../../messages/ar/shell.json";
import arVideo from "../../messages/ar/video.json";
import enAlbums from "../../messages/en/albums.json";
import enChrome from "../../messages/en/chrome.json";
import enContact from "../../messages/en/contact.json";
import enGovernance from "../../messages/en/governance.json";
import enHome from "../../messages/en/home.json";
import enNews from "../../messages/en/news.json";
import enShell from "../../messages/en/shell.json";
import enVideo from "../../messages/en/video.json";

/**
 * Every message file under `messages/<locale>/`. Explicit (not a glob or a
 * directory read) so the bundler sees each import statically and a file
 * missing for one locale fails the build rather than dropping a namespace.
 */
export const MESSAGE_FILES = [
  "chrome",
  "shell",
  "home",
  "news",
  "video",
  "albums",
  "governance",
  "contact",
] as const;

const FILES_BY_LOCALE = {
  ar: {
    chrome: arChrome,
    shell: arShell,
    home: arHome,
    news: arNews,
    video: arVideo,
    albums: arAlbums,
    governance: arGovernance,
    contact: arContact,
  },
  en: {
    chrome: enChrome,
    shell: enShell,
    home: enHome,
    news: enNews,
    video: enVideo,
    albums: enAlbums,
    governance: enGovernance,
    contact: enContact,
  },
} as const;

/** Merges a locale's message files into the single tree next-intl expects. */
export const loadMessages = (locale: AppLocale) => {
  const files = FILES_BY_LOCALE[locale];
  return {
    ...files.chrome,
    ...files.shell,
    ...files.home,
    ...files.news,
    ...files.video,
    ...files.albums,
    ...files.governance,
    ...files.contact,
  };
};
