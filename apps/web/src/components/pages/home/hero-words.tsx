/**
 * A line of hero text as words the transition can move one at a time.
 *
 * By word and never by character: Arabic letters join, and splitting a word
 * into per-character elements breaks the joining and the diacritics. Per word
 * is the finest split the script allows (ADR-0076 D3).
 *
 * The server renders every word at rest, with no inline style: a crawler, a
 * printed page and a reader with no JavaScript get the whole sentence,
 * selectable and searchable. The controller supplies any offset at animation
 * time, as the first value of a keyframe array, so a hidden state is never
 * rendered. Each word sits in a mask that clips vertically (`motion.css`), so
 * the words leave and arrive by movement alone, without opacity.
 */
export const HeroWords = ({ text }: { text: string }) =>
  text.split(/(\s+)/).map((chunk, index) =>
    /^\s+$/.test(chunk) || chunk === "" ? (
      chunk
    ) : (
      <span key={`${index}-${chunk}`} className="hero-word-mask">
        <span data-hero-word="" className="hero-word">
          {chunk}
        </span>
      </span>
    ),
  );
