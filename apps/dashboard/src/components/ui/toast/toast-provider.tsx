"use client";

import { createContext, use, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { EMPTY_TOAST_SNAPSHOT, ToastStore } from "./toast-store";
import type { ToastSnapshot, ToastSpec } from "./toast-store";
import { ToastRegion } from "./toast-region";

/**
 * One queue for the whole signed-in shell.
 *
 * Mounted in the `(app)` layout rather than per page, for the reason the
 * chapter's queueing rule exists at all: three screens each owning their own
 * region would stack three regions the moment one of them navigated, and
 * FB.6's "at most three visible" would be a promise each made only to itself.
 *
 * Nothing here knows what a message says. Callers pass text they have already
 * translated, because they are the ones holding the record's name — this
 * layer owns when a message appears and when it leaves, not what it reads.
 */
const ToastContext = createContext<ToastStore | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  // `useState` with an initialiser, not `useMemo`: React may discard a memo
  // at any time, and a discarded store would take every pending timer with it.
  const [store] = useState(() => new ToastStore());

  return (
    <ToastContext value={store}>
      {children}
      <ToastRegion store={store} />
    </ToastContext>
  );
}

/**
 * The queue itself, for raising and replacing messages.
 *
 * @throws when called outside the provider — a toast that silently goes
 *   nowhere is worse than a crash in development, because the screen looks
 *   like it saved and said nothing.
 */
export function useToastStore(): ToastStore {
  const store = use(ToastContext);
  if (!store) {
    throw new Error("useToastStore must be used inside <ToastProvider>.");
  }
  return store;
}

/**
 * What most callers want: raise a message, get back a handle to replace it.
 *
 * The handle is what makes FB.17 work — `show` a pending message, then
 * `update` that same id with the outcome, and it changes in place instead of
 * jumping to the end of the row as the reader looks at it.
 */
export interface ToastHandle {
  show: (spec: ToastSpec) => string | null;
  update: (id: string, spec: Partial<ToastSpec>) => void;
  dismiss: (id: string) => void;
}

export function useToast(): ToastHandle {
  const store = useToastStore();
  // Every method is bound to the instance and the instance never changes, so
  // this object is safe to build per render — it is read, never compared.
  return {
    show: (spec) => store.show(spec),
    update: (id, spec) => {
      store.update(id, spec);
    },
    dismiss: (id) => {
      store.dismiss(id);
    },
  };
}

/** What the region renders. Server renders nothing — toasts are events, and
 *  an event that survived a page load would be reporting the past (FB.10). */
export function useToastSnapshot(store: ToastStore): ToastSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY_TOAST_SNAPSHOT);
}
