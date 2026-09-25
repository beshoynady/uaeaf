import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RichText, splitEmphasis } from "./rich-text";

/**
 * The story paragraphs are the one place on this page where an editor marks
 * emphasis, and they do it with `**text**` in a plain string.
 *
 * The rule the tests exist to hold: whatever an editor types, it is text. No
 * branch of this renderer reaches `dangerouslySetInnerHTML`, so an editor with
 * the Update grant cannot put markup — or a script — into a page every visitor
 * loads. `**` is the entire vocabulary; everything else is literal, including
 * anything that looks like HTML.
 */

describe("splitEmphasis", () => {
  it("returns one plain run for a string with no marks", () => {
    expect(splitEmphasis("a plain sentence")).toEqual([{ text: "a plain sentence", emphasis: false }]);
  });

  it("marks the run between a pair of double asterisks", () => {
    expect(splitEmphasis("founded in **1974** by decree")).toEqual([
      { text: "founded in ", emphasis: false },
      { text: "1974", emphasis: true },
      { text: " by decree", emphasis: false },
    ]);
  });

  it("marks several runs in one string", () => {
    expect(splitEmphasis("**one** and **two**").filter((run) => run.emphasis)).toEqual([
      { text: "one", emphasis: true },
      { text: "two", emphasis: true },
    ]);
  });

  it("marks a run that is the whole string", () => {
    expect(splitEmphasis("**all of it**")).toEqual([{ text: "all of it", emphasis: true }]);
  });

  /** An editor mid-sentence has typed the opening pair and not the closing
   *  one. Printing the rest of the paragraph as emphasised — or dropping it —
   *  is worse than printing what they typed. */
  it("leaves an unclosed pair as literal text", () => {
    expect(splitEmphasis("an **unfinished thought")).toEqual([
      { text: "an **unfinished thought", emphasis: false },
    ]);
  });

  it("leaves an empty pair as literal text rather than an empty element", () => {
    expect(splitEmphasis("nothing **** here")).toEqual([{ text: "nothing **** here", emphasis: false }]);
  });

  it("treats a single asterisk as an ordinary character", () => {
    expect(splitEmphasis("2 * 3 = 6")).toEqual([{ text: "2 * 3 = 6", emphasis: false }]);
  });

  it("handles Arabic text and its emphasis the same way", () => {
    expect(splitEmphasis("صدر مرسوم بإشهار **الجمعية** عام 1974")).toEqual([
      { text: "صدر مرسوم بإشهار ", emphasis: false },
      { text: "الجمعية", emphasis: true },
      { text: " عام 1974", emphasis: false },
    ]);
  });

  it("copes with an empty string", () => {
    expect(splitEmphasis("")).toEqual([]);
  });
});

describe("RichText", () => {
  it("draws an emphasised run as a <strong>", () => {
    render(<RichText text="founded in **1974**" />);

    expect(screen.getByText("1974").tagName).toBe("STRONG");
  });

  /**
   * The load-bearing test. An editor is not an author of markup, and this
   * component is the only thing standing between what they type and every
   * visitor's browser.
   */
  it("prints markup as text instead of rendering it", () => {
    const { container } = render(<RichText text={'<img src=x onerror="alert(1)">'} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it("prints a script tag as text", () => {
    const { container } = render(<RichText text="<script>alert(1)</script>" />);

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toBe("<script>alert(1)</script>");
  });

  it("prints markup as text even inside an emphasised run", () => {
    const { container } = render(<RichText text="**<b>bold</b>**" />);

    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<b>bold</b>").tagName).toBe("STRONG");
  });
});
