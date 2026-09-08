const NEWLINE = String.fromCharCode(10);

/**
 * Comments replaced with equal-length whitespace.
 *
 * Contract tests search source text for the construct they forbid, and the
 * files being searched explain themselves in prose that names those same
 * constructs. Three separate rules reported their own explanatory comments
 * before this existed: a CSS guard flagged the sentence describing why the
 * guard is needed, an `<h1>` rule flagged the component whose comment says
 * "exactly one `<h1>`", and a token rule flagged the anti-pattern quoted to
 * warn against it.
 *
 * Whitespace rather than deletion so byte offsets survive — a reported
 * position still points at the real line. `://` is excluded from the
 * line-comment rule so a URL inside a string does not swallow the rest of
 * its line.
 */
export function stripComments(source: string): string {
  const blank = (text: string) =>
    text
      .split(NEWLINE)
      .map((line) => " ".repeat(line.length))
      .join(NEWLINE);

  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(
      /(^|[^:])(\/\/[^\r\n]*)/g,
      (_match, lead: string, comment: string) => lead + " ".repeat(comment.length),
    );
}
