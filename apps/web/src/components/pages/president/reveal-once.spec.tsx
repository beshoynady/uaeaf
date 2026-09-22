import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RevealOnce } from "./reveal-once";

/** What the live observers are watching: a disconnected one watches nothing. */
const observed: Element[] = [];

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query }));

/** Two blocks below the fold: one that opted into the reduced fade, one that did not. */
const blocks = () => {
  document.body.innerHTML = `
    <div id="plain" data-reveal=""><p data-reveal-part="rise">plain</p></div>
    <div id="fading" data-reveal="" data-reveal-reduced="fade"><p data-reveal-part="rise">fading</p></div>`;
  for (const block of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
    block.getBoundingClientRect = () => ({ top: window.innerHeight + 200 }) as DOMRect;
  }
};

const state = (id: string) => document.getElementById(id)?.dataset.revealState;

beforeEach(() => {
  observed.length = 0;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      mine: Element[] = [];
      observe = (element: Element) => {
        this.mine.push(element);
        observed.push(element);
      };
      unobserve = () => {};
      disconnect = () => {
        for (const element of this.mine) observed.splice(observed.indexOf(element), 1);
        this.mine = [];
      };
    },
  );
  blocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("RevealOnce", () => {
  it("holds every block below the fold until it enters", () => {
    reducedMotion(false);
    render(<RevealOnce />);

    expect(state("plain")).toBe("waiting");
    expect(state("fading")).toBe("waiting");
  });

  it("under reduced motion, leaves every block at rest except one that opted into the fade", () => {
    reducedMotion(true);
    render(<RevealOnce />);

    // The default across the site: nothing waits, nothing moves.
    expect(state("plain")).toBeUndefined();
    // The homepage news and media sections (owner decision 2026-09-22): a
    // fade, which motion.css draws with no transform under this query.
    expect(state("fading")).toBe("waiting");
    expect(observed.map((element) => element.id)).toEqual(["fading"]);
  });

  it("still watches a block after its effect runs twice, as it does in development", () => {
    // StrictMode mounts, cleans up and mounts again. The cleanup disconnects
    // the first observer; a second run that skipped every block already
    // marked `waiting` left each one waiting for an observer that no longer
    // existed, which under the reduced fade meant a section never shown.
    reducedMotion(true);
    render(
      <StrictMode>
        <RevealOnce />
      </StrictMode>,
    );

    expect(state("fading")).toBe("waiting");
    expect(observed.map((element) => element.id)).toEqual(["fading"]);
  });
});
