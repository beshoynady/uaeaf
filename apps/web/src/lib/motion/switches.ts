/**
 * The off switches for the site's motion: one word per kind of motion, and one
 * place that turns a word into something the page can act on.
 *
 * The owner asked that anything added before the launch can be put out
 * without a build. So the switch is an environment variable the server reads
 * when it renders, `UAEAF_MOTION_OFF=press,hero`, and it reaches the page as
 * words on `<html data-motion-off>`. The stylesheet matches a word with
 * `[data-motion-off~="press"]`; a client component reads the same attribute.
 * One mechanism, and nothing to keep in step.
 *
 * With nothing set the attribute is absent and the page's HTML is what it was
 * before any of this existed.
 *
 * It works without a build only because the layout revalidates (`revalidate`
 * in `app/[locale]/layout.tsx`): a page rendered once at build time would have
 * the value it was built with for good.
 */
export const MOTION_KEYS = ["press", "hero", "seam", "rise", "route"] as const;

export type MotionKey = (typeof MOTION_KEYS)[number];

const isKey = (word: string): word is MotionKey => (MOTION_KEYS as readonly string[]).includes(word);

const offKeys = (raw: string | undefined): readonly MotionKey[] => {
  const words = (raw ?? "").split(",").map((word) => word.trim());
  return words.includes("all") ? MOTION_KEYS : words.filter(isKey);
};

/** Whether one kind of motion is off: for a server component that renders a
 *  motion's element or does not. Off, the element is not in the page at all. */
export const motionIsOff = (key: MotionKey, raw: string | undefined = process.env.UAEAF_MOTION_OFF): boolean =>
  offKeys(raw).includes(key);

/** The value of `<html data-motion-off>`, or undefined when nothing is off.
 *  A word this module does not know is dropped: the value comes from the
 *  environment and is printed into every page. */
export const motionOffAttribute = (raw: string | undefined = process.env.UAEAF_MOTION_OFF): string | undefined => {
  const off = offKeys(raw);
  return off.length > 0 ? off.join(" ") : undefined;
};
