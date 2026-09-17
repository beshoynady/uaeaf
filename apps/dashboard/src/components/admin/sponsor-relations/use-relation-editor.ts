"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import type { FieldError } from "@/lib/admin/sponsor-relations/organizations";
import { fetchRelationSend, runRelationSave, type RelationRequest } from "@/lib/admin/sponsor-relations/relations-save";

/**
 * The save cycle the sponsors, partners and memberships screens share
 * (ADR-0085, the hero screen's pattern).
 *
 * Saving is publishing: nothing leaves the screen until Save, the draft is
 * checked with the API's own rules before anything is sent, and the plan runs
 * as the fewest writes. What the API still refuses is listed; what landed
 * before the refusal is re-read, and only what did not land stays unsaved.
 */

export type Failure = { code: string; partial: boolean } | null;

export const useRelationEditor = <D>({
  initial,
  isDirty,
  adopt,
  validate,
  requests,
  savedKey,
}: {
  initial: D;
  isDirty: (saved: D, draft: D) => boolean;
  adopt: (draft: D, created: Readonly<Record<string, string>>) => D;
  validate: (draft: D) => FieldError[];
  requests: (saved: D, draft: D) => RelationRequest[];
  /** The toast's dedupe key, one per screen. */
  savedKey: string;
}) => {
  const t = useTranslations("SponsorRelations");
  const router = useRouter();
  const toast = useToast();

  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [seenInitial, setSeenInitial] = useState(initial);
  // What the last save stored, while the server's re-read is on its way; `null`
  // after a partial save, when only the stored side can move on.
  const [awaiting, setAwaiting] = useState<{ stored: D | null } | null>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [failure, setFailure] = useState<Failure>(null);
  const [saving, setSaving] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<string | null>(null);
  const summary = useRef<HTMLDivElement>(null);

  const update = useCallback((recipe: (current: D) => D) => {
    setDraft(recipe);
    // A refusal stays listed until the next save re-checks it; only a whole-save
    // failure message goes, since nothing it named is pending now.
    setFailure((current) => (current && !current.partial ? null : current));
  }, []);

  // A re-read arrives as a new `initial`. The draft follows only when it is still
  // exactly what the save stored, so an edit typed in between is kept.
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setSaved(initial);
    if (awaiting) {
      if (awaiting.stored && !isDirty(awaiting.stored, draft)) setDraft(initial);
      setAwaiting(null);
    }
  }

  const dirty = isDirty(saved, draft);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Some browsers still need the legacy return value to show the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // `beforeunload` does not see the router's own navigation, so a click on a link
  // that leaves this page asks first. Captured before React's handlers.
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [dirty]);

  /** Returns the created ids, or `null` when nothing was saved in full. */
  const save = async (): Promise<Record<string, string> | null> => {
    // Read at the press (CLAUDE.md §31). The body is inert while the requests
    // run, so this is still the draft when they come back.
    const current = draft;
    const found = validate(current);
    setErrors(found);
    setFailure(null);
    if (found.length > 0) {
      window.requestAnimationFrame(() => summary.current?.focus());
      return null;
    }

    setSaving(true);
    try {
      const result = await runRelationSave(requests(saved, current), fetchRelationSend);
      if (result.ok) {
        const stored = adopt(current, result.created);
        setDraft(stored);
        // Saved now, not when the re-read lands: a second Save in between would
        // re-plan writes that already happened.
        setSaved(stored);
        setAwaiting({ stored });
        toast.show({ tone: "success", title: t("savedToast"), description: t("savedToastBody"), source: "api", dedupeKey: savedKey });
        router.refresh();
        return result.created;
      }
      setDraft(adopt(current, result.created));
      setErrors(result.errors);
      setFailure({ code: result.code, partial: result.completed > 0 });
      if (result.completed > 0) {
        setAwaiting({ stored: null });
        router.refresh();
      }
      window.requestAnimationFrame(() => summary.current?.focus());
      return null;
    } finally {
      setSaving(false);
    }
  };

  const forgetErrors = (prefix: string) => setErrors((current) => current.filter((error) => !error.path.startsWith(prefix)));

  return {
    saved,
    draft,
    update,
    dirty,
    errors,
    failure,
    saving,
    awaiting: awaiting !== null,
    save,
    summary,
    forgetErrors,
    pendingLeave,
    setPendingLeave,
    leave: () => {
      const href = pendingLeave;
      setPendingLeave(null);
      if (href) router.push(href);
    },
  };
};

/** Moves focus to a field, or into the first control of a group. */
export const focusElement = (id: string) => {
  const element = document.getElementById(id);
  if (!element) return;
  const control = element.matches("input, textarea, select, button")
    ? element
    : element.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select, button");
  if (control) {
    control.focus();
    return;
  }
  element.setAttribute("tabindex", "-1");
  element.focus();
};
