import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { useAmbientMotion } from "./use-ambient-motion";

/**
 * ADR-0099 D1 permits unprompted motion only while six conditions hold
 * together. Five of them are state, and this hook owns all five — so these
 * tests are the executable form of that clause.
 *
 * Each condition is exercised on its own, and the guard in
 * `ambient-motion-contract.spec.ts` proves by mutation that removing any one
 * of them turns a test red.
 */

let observerCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
let disconnected = false;

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduce : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
};

/** A ref pointing at a real element, which is what the hook observes. */
const elementRef = () => {
  const element = document.createElement("div");
  document.body.append(element);
  return { current: element };
};

beforeEach(() => {
  observerCallback = null;
  disconnected = false;
  setReducedMotion(false);
  setHidden(false);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
      unobserve() {}
      takeRecords() {
        return [];
      }
    },
  );
});

describe("useAmbientMotion", () => {
  it("runs when the element is on screen, the tab is visible and motion is allowed", () => {
    const { result } = renderHook(() => useAmbientMotion(elementRef()));

    act(() => observerCallback?.([{ isIntersecting: true }]));

    expect(result.current.running).toBe(true);
  });

  it("does not run under prefers-reduced-motion, whatever else is true", () => {
    setReducedMotion(true);

    const { result } = renderHook(() => useAmbientMotion(elementRef()));
    act(() => observerCallback?.([{ isIntersecting: true }]));

    expect(result.current.running).toBe(false);
  });

  it("stops when the element leaves the viewport", () => {
    const { result } = renderHook(() => useAmbientMotion(elementRef()));

    act(() => observerCallback?.([{ isIntersecting: true }]));
    expect(result.current.running).toBe(true);

    act(() => observerCallback?.([{ isIntersecting: false }]));
    expect(result.current.running).toBe(false);
  });

  it("stops when the tab is hidden and resumes when it returns", () => {
    const { result } = renderHook(() => useAmbientMotion(elementRef()));
    act(() => observerCallback?.([{ isIntersecting: true }]));

    act(() => {
      setHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.running).toBe(false);

    act(() => {
      setHidden(false);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.running).toBe(true);
  });

  it("stops while the reader is pointing at it, and resumes when they leave", () => {
    const { result } = renderHook(() => useAmbientMotion(elementRef()));
    act(() => observerCallback?.([{ isIntersecting: true }]));

    act(() => result.current.handlers.onPointerEnter());
    expect(result.current.running).toBe(false);

    act(() => result.current.handlers.onPointerLeave());
    expect(result.current.running).toBe(true);
  });

  it("stops while focus is inside it, which is the keyboard reader's hover", () => {
    const { result } = renderHook(() => useAmbientMotion(elementRef()));
    act(() => observerCallback?.([{ isIntersecting: true }]));

    act(() => result.current.handlers.onFocus());
    expect(result.current.running).toBe(false);

    act(() => result.current.handlers.onBlur());
    expect(result.current.running).toBe(true);
  });

  it("stops when the reader presses pause, and stays stopped when they look away and back", () => {
    const { result } = renderHook(() => useAmbientMotion(elementRef()));
    act(() => observerCallback?.([{ isIntersecting: true }]));

    act(() => result.current.toggle());
    expect(result.current.running).toBe(false);
    expect(result.current.paused).toBe(true);

    act(() => result.current.handlers.onPointerEnter());
    act(() => result.current.handlers.onPointerLeave());
    expect(result.current.running).toBe(false);
  });

  it("reports itself paused under reduced motion, so a control can describe the real state", () => {
    setReducedMotion(true);

    const { result } = renderHook(() => useAmbientMotion(elementRef()));

    expect(result.current.available).toBe(false);
  });

  it("disconnects its observer when the component goes away", () => {
    const { unmount } = renderHook(() => useAmbientMotion(elementRef()));

    unmount();

    expect(disconnected).toBe(true);
  });
});
