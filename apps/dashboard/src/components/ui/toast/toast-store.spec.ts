import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TOAST_DURATION,
  MAX_QUEUED_TOASTS,
  MAX_VISIBLE_TOASTS,
  ToastStore,
  defaultDurationFor,
} from "./toast-store";
import type { ToastSpec } from "./toast-store";

/** The shortest spec a test can raise; each test overrides what it is about. */
function spec(overrides: Partial<ToastSpec> = {}): ToastSpec {
  return { tone: "success", title: "Saved", source: "api", ...overrides };
}

let store: ToastStore;

beforeEach(() => {
  vi.useFakeTimers();
  store = new ToastStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("auto-dismiss (FB.11)", () => {
  it("removes a success message after its window", () => {
    store.show(spec());

    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION - 1);
    expect(store.visible).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(store.visible).toHaveLength(0);
  });

  // The one message a reader must be able to re-read is the one saying
  // something went wrong.
  it("never expires an error", () => {
    store.show(spec({ tone: "error", title: "Could not reach the server" }));

    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION * 100);

    expect(store.visible).toHaveLength(1);
  });

  it("honours an explicit duration over the tone's default", () => {
    store.show(spec({ tone: "error", duration: 1_000 }));

    vi.advanceTimersByTime(1_000);

    expect(store.visible).toHaveLength(0);
  });

  it("defaults errors to no timer and everything else to the window", () => {
    expect(defaultDurationFor("error")).toBeNull();
    expect(defaultDurationFor("success")).toBe(DEFAULT_TOAST_DURATION);
    expect(defaultDurationFor("warning")).toBe(DEFAULT_TOAST_DURATION);
  });
});

describe("queueing (FB.6)", () => {
  it("shows three and holds the rest", () => {
    for (let index = 0; index < 5; index += 1) {
      store.show(spec({ title: `Message ${index}` }));
    }

    expect(store.visible).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(store.queued).toBe(2);
  });

  it("promotes a waiting message when a slot frees", () => {
    for (let index = 0; index < 4; index += 1) {
      store.show(spec({ title: `Message ${index}` }));
    }

    store.dismiss(store.visible[0].id);

    expect(store.visible.map((record) => record.title)).toEqual(["Message 1", "Message 2", "Message 3"]);
    expect(store.queued).toBe(0);
  });

  // A queue is a promise to show every message eventually; past a point that
  // promise is worse than the messages.
  it("counts what it refuses rather than growing without limit", () => {
    for (let index = 0; index < MAX_VISIBLE_TOASTS + MAX_QUEUED_TOASTS + 3; index += 1) {
      store.show(spec({ title: `Message ${index}` }));
    }

    expect(store.queued).toBe(MAX_QUEUED_TOASTS);
    expect(store.droppedCount).toBe(3);
  });

  it("returns null for a message it had no room for", () => {
    for (let index = 0; index < MAX_VISIBLE_TOASTS + MAX_QUEUED_TOASTS; index += 1) {
      store.show(spec({ title: `Message ${index}` }));
    }

    expect(store.show(spec({ title: "One too many" }))).toBeNull();
  });
});

describe("deduplication (FB.16)", () => {
  it("counts a repeat instead of stacking it", () => {
    store.show(spec({ tone: "error", title: "Network error", dedupeKey: "net" }));
    store.show(spec({ tone: "error", title: "Network error", dedupeKey: "net" }));
    store.show(spec({ tone: "error", title: "Network error", dedupeKey: "net" }));

    expect(store.visible).toHaveLength(1);
    expect(store.visible[0].count).toBe(3);
  });

  it("gives the repeat the full window again, because it is news", () => {
    store.show(spec({ dedupeKey: "saved" }));
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION - 100);

    store.show(spec({ dedupeKey: "saved" }));
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION - 100);
    expect(store.visible).toHaveLength(1);

    vi.advanceTimersByTime(100);
    expect(store.visible).toHaveLength(0);
  });

  it("keeps messages about different records apart", () => {
    store.show(spec({ title: "Saved Ahmed", dedupeKey: "user-1" }));
    store.show(spec({ title: "Saved Mariam", dedupeKey: "user-2" }));

    expect(store.visible).toHaveLength(2);
  });

  it("treats messages with no dedupe key as separate events", () => {
    store.show(spec());
    store.show(spec());

    expect(store.visible).toHaveLength(2);
  });
});

describe("idempotency (FB.25)", () => {
  // Stronger than FB.16's text match, which fails the moment the same event
  // is worded two ways.
  it("shows an event once however many times it arrives", () => {
    store.show(spec({ eventId: "evt-1", title: "Published" }));
    store.show(spec({ eventId: "evt-1", title: "Publication complete" }));

    expect(store.visible).toHaveLength(1);
    expect(store.visible[0].title).toBe("Published");
  });

  it("still ignores a repeat after the first has been dismissed", () => {
    store.show(spec({ eventId: "evt-1" }));
    store.dismiss(store.visible[0].id);

    expect(store.show(spec({ eventId: "evt-1" }))).toBeNull();
    expect(store.visible).toHaveLength(0);
  });
});

describe("replacement (FB.17)", () => {
  it("rewrites a message in place rather than moving it to the end", () => {
    const first = store.show(spec({ title: "First" }));
    const pending = store.show(spec({ tone: "info", title: "Saving…", duration: null }));
    store.show(spec({ title: "Third" }));

    store.update(pending!, { tone: "success", title: "Saved" });

    expect(store.visible.map((record) => record.title)).toEqual(["First", "Saved", "Third"]);
    expect(first).not.toBe(pending);
  });

  it("gives the replacement its new tone's timer", () => {
    const pending = store.show(spec({ tone: "info", title: "Saving…", duration: null }));

    store.update(pending!, { tone: "success", title: "Saved" });
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION);

    expect(store.visible).toHaveLength(0);
  });

  it("leaves an unknown id alone", () => {
    store.show(spec());

    store.update("toast-999", { title: "Nothing" });

    expect(store.visible[0].title).toBe("Saved");
  });
});

describe("interruptibility (FB.21)", () => {
  it("holds a timer where it stands while paused", () => {
    store.show(spec());
    vi.advanceTimersByTime(2_000);

    store.pause();
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION * 5);

    expect(store.visible).toHaveLength(1);
  });

  it("resumes with the remaining time, not a fresh window", () => {
    store.show(spec());
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION - 500);
    store.pause();
    vi.advanceTimersByTime(10_000);

    store.resume();
    vi.advanceTimersByTime(499);
    expect(store.visible).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(store.visible).toHaveLength(0);
  });

  // A hover and an open dialog are two reasons to pause. If the hover ending
  // resumed the timers, a message would expire behind the dialog covering it.
  it("does not let one reason to pause cancel another", () => {
    store.show(spec());

    store.pause();
    store.pause();
    store.resume();

    expect(store.isPaused).toBe(false);
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION);
    expect(store.visible).toHaveLength(0);
  });

  it("arms a message raised while paused only once resumed", () => {
    store.pause();
    store.show(spec());

    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION * 2);
    expect(store.visible).toHaveLength(1);

    store.resume();
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION);
    expect(store.visible).toHaveLength(0);
  });
});

describe("subscription", () => {
  it("notifies on every change and stops after unsubscribing", () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.show(spec());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.show(spec());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("clears everything, including the dropped count", () => {
    for (let index = 0; index < MAX_VISIBLE_TOASTS + MAX_QUEUED_TOASTS + 1; index += 1) {
      store.show(spec({ title: `Message ${index}` }));
    }

    store.dismissAll();

    expect(store.visible).toHaveLength(0);
    expect(store.queued).toBe(0);
    expect(store.droppedCount).toBe(0);
  });
});
