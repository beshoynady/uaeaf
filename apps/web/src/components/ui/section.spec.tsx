import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Section, SectionStack, needsSeparator, REGISTER_CLASSES } from "./section";

/**
 * The adjacency rule is the reason this file exists.
 *
 * ADR-0059 §D2 measured Federation Green against Federation Red at 1.15:1.
 * Two bands at that ratio do not read as a mistake in review — they read as
 * one band, which is why the rule needs a test rather than a reviewer.
 */

describe("Section", () => {
  it("carries every register's surface and text in one declaration", () => {
    for (const register of ["neutral", "green", "red", "black"] as const) {
      const { container, unmount } = render(<Section register={register}>محتوى</Section>);
      const section = container.querySelector("section");
      expect(section?.className).toContain(REGISTER_CLASSES[register].surface);
      expect(section).toHaveAttribute("data-register", register);
      unmount();
    }
  });

  it("stays an unnamed region unless it is given a heading to point at", () => {
    // A `<section>` becomes a landmark only when it has an accessible name.
    // Naming every band would fill the landmark list with entries a screen
    // reader user cannot act on.
    const { container } = render(<Section>محتوى</Section>);
    expect(container.querySelector("section")).not.toHaveAttribute("aria-labelledby");
  });

  it("wraps its content in the public container by default", () => {
    const { container } = render(<Section>محتوى</Section>);
    // Chapter 5 §5.3: 1440px maximum for the public experience.
    expect(container.querySelector("section > div")?.className).toContain("max-w-[1440px]");
  });

  it("lets a band reach the viewport edge when it has to", () => {
    const { container } = render(
      <Section bleed>
        <span>صورة</span>
      </Section>,
    );
    expect(container.querySelector("section > div")).toBeNull();
  });
});

describe("green/red adjacency", () => {
  it("inserts the separator between green and red, in both orders", () => {
    for (const pair of [
      ["green", "red"],
      ["red", "green"],
    ] as const) {
      const { unmount } = render(
        <SectionStack>
          <Section register={pair[0]}>أ</Section>
          <Section register={pair[1]}>ب</Section>
        </SectionStack>,
      );
      expect(screen.getAllByTestId("section-separator")).toHaveLength(1);
      unmount();
    }
  });

  it("does not insert one where the pair is legible on its own", () => {
    render(
      <SectionStack>
        <Section register="green">أ</Section>
        <Section register="neutral">ب</Section>
        <Section register="black">ج</Section>
        <Section register="green">د</Section>
      </SectionStack>,
    );
    expect(screen.queryAllByTestId("section-separator")).toHaveLength(0);
  });

  it("keeps the separator out of the accessibility tree", () => {
    render(
      <SectionStack>
        <Section register="green">أ</Section>
        <Section register="red">ب</Section>
      </SectionStack>,
    );
    const separator = screen.getByTestId("section-separator");
    expect(separator).toHaveAttribute("aria-hidden", "true");
    expect(separator).toBeEmptyDOMElement();
  });

  it("treats a node it cannot read as breaking the chain, not as safe", () => {
    // A wrapper, a fragment, a mapped list — anything whose register this
    // stack cannot see. Assuming the previous register still applies would
    // suppress a separator that is needed; assuming nothing is the safe
    // reading, and the pair on either side of the unknown node is no longer
    // an adjacency this stack can vouch for.
    expect(needsSeparator("green", null)).toBe(false);
    expect(needsSeparator(null, "red")).toBe(false);
    expect(needsSeparator("green", "red")).toBe(true);
  });
});
