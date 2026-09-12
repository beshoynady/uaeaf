/**
 * The queue behind the toast region — the rules of Chapter 8 L4, kept apart
 * from React so they can be tested as rules rather than through a rendered
 * tree.
 *
 * The rules it implements, and the finding each comes from:
 *
 * - **FB.6** at most three at once; the rest wait. Four stacked messages is
 *   not four times the information, it is a wall the reader skips.
 * - **FB.11** 4–6s for anything that is not an error; an error never
 *   auto-dismisses, because the one message the reader must be able to
 *   re-read is the one saying something went wrong.
 * - **FB.16** the same event twice is one toast with a counter, not two.
 * - **FB.17** a promise's outcome replaces its loading message in the same
 *   slot, so the row does not jump while the reader is looking at it.
 * - **FB.21** timers stop while a dialog is open, and while the pointer or
 *   the keyboard is inside the region — a message that expires while it is
 *   being read was never shown.
 * - **FB.22** every message records where it came from. Not shown to anyone;
 *   it is what makes a burst of toasts diagnosable after the fact.
 * - **FB.25** a message carrying an `eventId` is shown once, however many
 *   times it arrives. Stronger than FB.16's text match, which fails the
 *   moment the same event is worded two ways.
 *
 * What it deliberately does NOT implement, and why:
 *
 * - **FB.23** rate limiting. It governs a stream of unrelated events — the
 *   chapter's example is live result updates. Every toast this dashboard
 *   raises is the result of a click, so there is no such stream to limit
 *   yet. The queue is capped instead, which bounds the damage without
 *   inventing a limiter for a source that does not exist.
 * - **FB.24** cross-tab synchronisation. It governs session-level events
 *   (session expired, forced logout), which this region does not carry.
 *
 * ADR-0016 bounds what may be a toast at all: never an error that prevents
 * the task. A refusal the reader must act on belongs inline, beside the
 * control that refused.
 */

export const TOAST_TONES = ["success", "info", "warning", "error"] as const;
export type ToastTone = (typeof TOAST_TONES)[number];

/** FB.22's closed list. Internal metadata — never rendered. */
export const TOAST_SOURCES = [
  "validation",
  "api",
  "navigation",
  "permission",
  "realtime",
  "background-job",
  "offline",
  "system",
] as const;
export type ToastSource = (typeof TOAST_SOURCES)[number];

/** FB.6. */
export const MAX_VISIBLE_TOASTS = 3;

/**
 * How many may wait behind the visible three.
 *
 * A queue is a promise to show every message eventually; past this many, that
 * promise is worse than the messages. The overflow is counted, not kept — the
 * region says how many were dropped rather than pretending to hold them.
 */
export const MAX_QUEUED_TOASTS = 10;

/** FB.11's window. 5s is its midpoint. */
export const DEFAULT_TOAST_DURATION = 5_000;

export interface ToastSpec {
  tone: ToastTone;
  title: string;
  description?: string;
  /** FB.22. Required: a message with no recorded origin is the one nobody
   *  can explain later. */
  source: ToastSource;
  /**
   * Two toasts sharing this are the same event happening again (FB.16).
   * Without one, every toast is its own — which is right for messages that
   * name a specific record.
   */
  dedupeKey?: string;
  /** FB.25. The same id is shown once, whatever its wording. */
  eventId?: string;
  /** Milliseconds, or `null` to stay until dismissed. Defaults by tone. */
  duration?: number | null;
}

export interface ToastRecord extends Omit<ToastSpec, "duration"> {
  id: string;
  /** How many times this event has happened. 1 unless merged (FB.16). */
  count: number;
  duration: number | null;
}

/** An error stays until the reader dismisses it (FB.11). */
export function defaultDurationFor(tone: ToastTone): number | null {
  return tone === "error" ? null : DEFAULT_TOAST_DURATION;
}

type Listener = () => void;

/**
 * What a subscriber reads.
 *
 * A separate object rather than the store's own arrays, because the store
 * mutates those in place and `useSyncExternalStore` compares by reference — a
 * snapshot that is the same array after a push is a change React never sees.
 */
export interface ToastSnapshot {
  visible: readonly ToastRecord[];
  queued: number;
  dropped: number;
}

/** The server renders no toasts, so every server snapshot is this one — and
 *  it must be a stable reference or React re-renders forever. */
export const EMPTY_TOAST_SNAPSHOT: ToastSnapshot = { visible: [], queued: 0, dropped: 0 };

interface Timer {
  /** What is left to run when the queue is resumed. */
  remaining: number;
  startedAt: number | null;
  handle: ReturnType<typeof setTimeout> | null;
}

export class ToastStore {
  private records: ToastRecord[] = [];
  private queue: ToastRecord[] = [];
  private timers = new Map<string, Timer>();
  private listeners = new Set<Listener>();
  private seenEventIds = new Set<string>();
  private paused = false;
  private sequence = 0;
  private dropped = 0;
  private snapshot: ToastSnapshot = EMPTY_TOAST_SNAPSHOT;

  /** Visible toasts, oldest first. */
  get visible(): readonly ToastRecord[] {
    return this.records;
  }

  /** How many are waiting for a slot. */
  get queued(): number {
    return this.queue.length;
  }

  /** How many were refused because the queue was full. */
  get droppedCount(): number {
    return this.dropped;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Bound, so it can be handed to `useSyncExternalStore` directly. */
  readonly getSnapshot = (): ToastSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Shows a toast, or merges it into the one already saying the same thing.
   *
   * Returns the id either way, so a caller holding it can later replace the
   * message in place — which is how a pending-then-resolved pair keeps its
   * slot. Returns `null` when nothing was shown: a repeat of an `eventId`
   * already handled, or a queue with no room left.
   */
  show(spec: ToastSpec): string | null {
    if (spec.eventId !== undefined) {
      if (this.seenEventIds.has(spec.eventId)) {
        return null;
      }
      this.seenEventIds.add(spec.eventId);
    }

    const existing = spec.dedupeKey
      ? [...this.records, ...this.queue].find((record) => record.dedupeKey === spec.dedupeKey)
      : undefined;

    if (existing) {
      existing.count += 1;
      // The repeat is news, so the reader gets the full window again.
      this.restartTimer(existing);
      this.emit();
      return existing.id;
    }

    this.sequence += 1;
    const record: ToastRecord = {
      ...spec,
      id: `toast-${this.sequence}`,
      count: 1,
      duration: spec.duration === undefined ? defaultDurationFor(spec.tone) : spec.duration,
    };

    if (this.records.length < MAX_VISIBLE_TOASTS) {
      this.records.push(record);
      this.startTimer(record);
    } else if (this.queue.length < MAX_QUEUED_TOASTS) {
      this.queue.push(record);
    } else {
      this.dropped += 1;
      this.emit();
      return null;
    }

    this.emit();
    return record.id;
  }

  /**
   * Rewrites a toast in place, keeping its position.
   *
   * The alternative — dismiss and show — moves the message to the end of the
   * row at the exact moment it changes from "Saving…" to "Saved", which is
   * the moment the reader is looking straight at it (FB.17).
   */
  update(id: string, spec: Partial<ToastSpec>): void {
    const record =
      this.records.find((item) => item.id === id) ?? this.queue.find((item) => item.id === id);
    if (!record) {
      return;
    }

    Object.assign(record, spec);
    if (spec.duration !== undefined) {
      record.duration = spec.duration;
    } else if (spec.tone) {
      record.duration = defaultDurationFor(spec.tone);
    }

    if (this.records.includes(record)) {
      this.restartTimer(record);
    }
    this.emit();
  }

  dismiss(id: string): void {
    const index = this.records.findIndex((record) => record.id === id);
    if (index === -1) {
      this.queue = this.queue.filter((record) => record.id !== id);
      this.emit();
      return;
    }

    this.clearTimer(id);
    this.records.splice(index, 1);

    const next = this.queue.shift();
    if (next) {
      this.records.push(next);
      this.startTimer(next);
    }

    this.emit();
  }

  dismissAll(): void {
    for (const id of [...this.timers.keys()]) {
      this.clearTimer(id);
    }
    this.records = [];
    this.queue = [];
    this.dropped = 0;
    this.emit();
  }

  /** Stops every timer where it stands (FB.21). Re-entrant: two reasons to
   *  pause — a hover and an open dialog — must not cancel each other, so a
   *  second pause is a no-op rather than a second stopwatch. */
  pause(): void {
    if (this.paused) {
      return;
    }
    this.paused = true;
    for (const timer of this.timers.values()) {
      if (timer.handle === null || timer.startedAt === null) {
        continue;
      }
      clearTimeout(timer.handle);
      timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
      timer.handle = null;
      timer.startedAt = null;
    }
    this.emit();
  }

  resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    for (const [id, timer] of this.timers) {
      this.arm(id, timer);
    }
    this.emit();
  }

  private startTimer(record: ToastRecord): void {
    if (record.duration === null) {
      return;
    }
    const timer: Timer = { remaining: record.duration, startedAt: null, handle: null };
    this.timers.set(record.id, timer);
    if (!this.paused) {
      this.arm(record.id, timer);
    }
  }

  private restartTimer(record: ToastRecord): void {
    this.clearTimer(record.id);
    this.startTimer(record);
  }

  private arm(id: string, timer: Timer): void {
    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => {
      this.dismiss(id);
    }, timer.remaining);
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer?.handle) {
      clearTimeout(timer.handle);
    }
    this.timers.delete(id);
  }

  private emit(): void {
    this.snapshot = { visible: [...this.records], queued: this.queue.length, dropped: this.dropped };
    for (const listener of this.listeners) {
      listener();
    }
  }
}
