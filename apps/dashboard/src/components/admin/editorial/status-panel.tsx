"use client";

import { BrandBorder } from "@uaeaf/brand-ui";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextField } from "@/components/auth/text-field";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import { localized } from "@/lib/api/types";
import {
  actionTargetId,
  needsReason,
  panelActions,
  readinessHeldActions,
  returnableSteps,
} from "@/lib/admin/editorial-state";
import type {
  EditorialActor,
  EditorialState,
  PanelAction,
  WorkflowStepSummary,
} from "@/lib/admin/editorial-state";
import type { AppLocale } from "@/i18n/routing";
import { ReadinessList } from "./readiness-list";
import { EditorialTimeline } from "./timeline";

/**
 * The status and approvals panel, for every workflow-governed type.
 *
 * It knows nothing about the president's message, and must not learn: the
 * eleven content pages after it mount this component unchanged, passing their
 * own `entityType` and record id.
 *
 * ## The one rule
 *
 * **The server decides, the panel draws.** Which decisions a person may take
 * depends on the publishing policy, four permissions, whether a review is
 * running, and whether this reader is handling its current step. Every one of
 * those lives in `PublishingService.editorialState`, and this component
 * renders `availableActions` verbatim — it never infers a button from `mode`,
 * from `publicationState`, or from a permission it happens to know. A panel
 * that reasoned for itself would sooner or later offer a button the API
 * refuses, and the reader would be told "forbidden" for pressing something
 * this screen invited them to press.
 *
 * ## Why it holds its own copy of the state
 *
 * `state` is the server's render. After that the panel re-reads through
 * `GET …/state` — on the explicit refresh, and after every decision — so the
 * two moments where the state provably changed are the only two it costs a
 * request. There is no polling: a page open all afternoon would otherwise
 * spend the afternoon asking a question whose answer only this reader's own
 * actions change.
 */
export const EditorialStatusPanel = ({
  entityType,
  entityId,
  state,
  onAction,
  fieldLabels,
}: {
  entityType: string;
  entityId: string;
  /** The state as the server rendered it. */
  state: EditorialState;
  /** Fired after a decision lands, so the page can re-read the record itself
   *  — publishing changes `publicationState`, and the form above shows it. */
  onAction?: (action: PanelAction) => void;
  /** Field names in the reader's words, keyed by the first segment of a
   *  blocker's path. See `ReadinessList` for why it is data, not a function. */
  fieldLabels?: Readonly<Record<string, string>>;
}) => {
  const t = useTranslations("Editorial");
  const errors = useTranslations("WriteErrors");
  const locale = useLocale() as AppLocale;
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();

  const [current, setCurrent] = useState(state);
  const [expanded, setExpanded] = useState(true);
  const [running, setRunning] = useState<PanelAction | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [prompting, setPrompting] = useState<PanelAction | null>(null);
  const [reason, setReason] = useState("");
  const [returnTo, setReturnTo] = useState("");

  const bodyId = useId();
  const readinessId = useId();
  const reasonId = useId();
  const returnToId = useId();

  // A fresh server render supersedes whatever this panel last fetched: the
  // page re-rendering means the record itself changed under it. React's own
  // "adjust state when a prop changes" shape — the comparison value is state,
  // not a ref, so the re-render happens before anything is painted rather
  // than after it.
  const [rendered, setRendered] = useState(state);
  if (rendered !== state) {
    setRendered(state);
    setCurrent(state);
  }

  const actions = panelActions(current);
  // Drawn, disabled, and described by the readiness list — because the server
  // said readiness is the only thing withholding them. An action withheld for
  // any other reason is simply not here, and must not be: a disabled publish
  // button in front of someone who holds no Publish blames the portrait for a
  // refusal the portrait has nothing to do with.
  const held = readinessHeldActions(current);
  const steps = current.workflow?.steps ?? [];
  const returnable = returnableSteps(current);

  const refresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/admin/editorial/${entityType}/${entityId}/state`);
      if (!response.ok) {
        // A failed refresh leaves the last known state on screen rather than
        // blanking it: stale and labelled beats empty and unexplained.
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setFailure(body?.code ?? "serviceUnavailable");
        return;
      }
      setCurrent((await response.json()) as EditorialState);
    } catch {
      setFailure("serviceUnavailable");
    } finally {
      setRefreshing(false);
    }
  };

  const run = async (action: PanelAction, body: Record<string, unknown>): Promise<void> => {
    const targetId = actionTargetId(action, entityId, current);
    if (targetId === null) {
      // A review decision with no instance to send it to. The state changed
      // under this panel; re-reading is the only correct move.
      setFailure("staleRecord");
      return;
    }

    setRunning(action);
    setFailure(null);
    try {
      const response = await fetch(`/api/admin/editorial/${entityType}/${targetId}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const failed = (await response.json().catch(() => null)) as { code?: string } | null;
        setFailure(failed?.code ?? "serviceUnavailable");
        return;
      }

      dismissPrompt();
      toast.show({
        tone: "success",
        title: t("successTitle"),
        description: t(`success${action[0].toUpperCase()}${action.slice(1)}` as "successPublish"),
        source: "api",
        dedupeKey: `editorial:${entityType}:${action}`,
      });
      // Two reads of one change, and both are wanted. This panel re-reads its
      // own state, because a host page is not obliged to render it server-side
      // — and the page re-reads the record, because publishing stamps
      // `publicationState` and a new `updatedAt`, and the form above this
      // panel was built from the old ones.
      //
      // Started together, not in series: neither depends on the other, and
      // awaiting the first put a whole round trip between the reader's press
      // and the panel settling.
      const refreshed = refresh();
      router.refresh();
      await refreshed;
      onAction?.(action);
    } catch {
      setFailure("serviceUnavailable");
    } finally {
      setRunning(null);
    }
  };

  /** Closes whatever was being asked for, and empties it — the last
   *  rejection's words must not be offered as the next one's default. */
  const dismissPrompt = (): void => {
    setPrompting(null);
    setReason("");
    setReturnTo("");
  };

  const press = (action: PanelAction): void => {
    setFailure(null);
    // Publish and approve are confirmed; reject and return ask for the reason
    // the API requires. Submit and resubmit move a draft one step and are
    // reversible by the reviewer, so they run on the press.
    if (action === "publish" || action === "publishApproved" || action === "approve" || needsReason(action)) {
      setReason("");
      setReturnTo("");
      setPrompting(action);
      return;
    }
    void run(action, {});
  };

  const actorName = (actor: EditorialActor | null) =>
    actor?.name ? localized(actor.name, locale) : t("unknownActor");

  return (
    // The one static tricolour edge on an editor screen: the panel where the
    // status is read and the decisions are taken (Chapter 12 §12.15, editor
    // recipe). `static` only — the Operational dose never animates an edge
    // under the pointer.
    <BrandBorder variant="static" tone="tricolor" className="rounded-[var(--radius-md)]">
    <aside
      aria-label={t("panelTitle")}
      className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)]"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-label font-bold text-[color:var(--color-text-primary)]">
          {t("panelTitle")}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={() => void refresh()} loading={refreshing}>
            {refreshing ? t("refreshing") : t("refresh")}
          </Button>
          {/*
            A disclosure, not a `<details>`: below `lg` this panel is a top bar
            that must fold away, and at `lg` it is a column that must always be
            open. `lg:hidden` takes the control out of the page — and out of
            the accessibility tree — at the width where collapsing is not
            offered, which no `open` attribute can express in CSS alone.
          */}
          {/* `Button`, not a hand-written copy of it. This is the one control
              that ships to all twelve pages, and the copy had already drifted:
              a fixed `h-11` where the registry says `min-h-11`, which clips a
              long Arabic label at 200% zoom, and no `disabled:` at all. */}
          <Button
            variant="ghost"
            className="lg:hidden"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? t("hidePanel") : t("showPanel")}
          </Button>
        </div>
      </div>

      <div
        id={bodyId}
        className={`${expanded ? "flex" : "hidden lg:flex"} flex-col gap-5 border-t border-[color:var(--color-border-default)] px-4 py-4`}
      >
        {/* The state changes without the reader asking — a decision lands, a
            refresh returns — so it is announced where a screen reader hears
            it. `status`, not `alert`: it is a standing fact, not an
            interruption (Chapter 8 L4 FB.7). */}
        <div role="status" className="flex flex-col gap-1">
          <p className="text-caption text-[color:var(--color-text-muted)]">{t("stateLabel")}</p>
          <p className="text-body font-bold text-[color:var(--color-text-primary)]">
            {publicationStateLabel(current, t)}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-caption text-[color:var(--color-text-muted)]">{t("lastPublished")}</p>
          {current.publishedAt ? (
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              {t("publishedByOn", {
                name: actorName(current.publishedBy),
                date: format.dateTime(new Date(current.publishedAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          ) : (
            <p className="text-body-sm text-[color:var(--color-text-muted)]">
              {t("neverPublished")}
            </p>
          )}
        </div>

        {current.mode === "blocked" ? (
          <div className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-warning)] px-3 py-2">
            <p className="text-label font-bold text-[color:var(--color-text-primary)]">
              {t("blockedTitle")}
            </p>
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              {blockedReasonLabel(current.blockedReason, t)}
            </p>
          </div>
        ) : null}

        {current.workflow ? (
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-label font-bold text-[color:var(--color-text-primary)]">
                {t("workflowTitle")}
              </h3>
              <p className="text-caption text-[color:var(--color-text-muted)]">
                {workflowStatusLabel(current.workflow.status, t)}
              </p>
            </div>
            <p className="text-body-sm text-[color:var(--color-text-secondary)]">
              {current.workflow.definitionName
                ? localized(current.workflow.definitionName, locale)
                : t("workflowUnnamed")}
            </p>

            <ol aria-label={t("workflowTitle")} className="flex list-none flex-col gap-2">
              {steps.map((step, index) => (
                <StepRow
                  key={step.id}
                  step={step}
                  index={index}
                  total={steps.length}
                  locale={locale}
                />
              ))}
            </ol>
          </section>
        ) : null}

        {/* Above the buttons, always — including when nothing is blocking, so
            its absence never has to be interpreted. */}
        <ReadinessList
          id={readinessId}
          blockers={current.publishBlockers}
          fieldLabels={fieldLabels}
        />

        {failure ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[color:var(--color-semantic-error)] px-3 py-2"
          >
            {failure === "staleRecord" ? (
              <>
                <p className="text-label font-bold text-[color:var(--color-text-primary)]">
                  {t("staleTitle")}
                </p>
                <p className="text-body-sm text-[color:var(--color-text-secondary)]">
                  {t("staleBody")}
                </p>
                <div>
                  <Button variant="secondary" onClick={() => window.location.reload()}>
                    {t("reload")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-label font-bold text-[color:var(--color-text-primary)]">
                  {t("failureTitle")}
                </p>
                <p className="text-body-sm text-[color:var(--color-text-secondary)]">
                  {errors(failure)}
                </p>
              </>
            )}
          </div>
        ) : null}

        {actions.length === 0 && held.length === 0 ? (
          <p className="text-body-sm text-[color:var(--color-text-muted)]">{t("noActions")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action}
                variant={variantFor(action)}
                loading={running === action}
                // One decision at a time: a second press while the first is in
                // flight is the H2 race, and the cheapest place to stop it is
                // before it leaves the browser.
                disabled={running !== null}
                onClick={() => press(action)}
              >
                {t(action)}
              </Button>
            ))}

            {held.map((action) => (
              <Button
                key={action}
                variant={variantFor(action)}
                disabled
                // The description is the reason, not the word "disabled": a
                // screen reader announces "publish now, dimmed" and then the
                // list of what is missing, which is what the reader came for.
                aria-describedby={readinessId}
              >
                {t(action)}
              </Button>
            ))}
          </div>
        )}

        <EditorialTimeline
          entries={current.history}
          locale={locale}
          published={current.publishedAt}
          publishedBy={current.publishedBy}
        />
      </div>

      <ConfirmDialog
        open={prompting === "publish"}
        title={t("confirmPublishTitle")}
        confirmLabel={t("confirmPublishAction")}
        cancelLabel={t("cancel")}
        busy={running === "publish"}
        onConfirm={() =>
          void run("publish", { expectedUpdatedAt: current.updatedAt })
        }
        onCancel={dismissPrompt}
      >
        {t("confirmPublishBody")}
      </ConfirmDialog>

      {/* Its own dialog, because what it puts on the site is different: the
          revision the approvers read, not whatever the draft holds now. It
          also carries no `expectedUpdatedAt` — the approval names the revision,
          so there is no "the draft moved under you" to guard against. */}
      <ConfirmDialog
        open={prompting === "publishApproved"}
        title={t("confirmPublishApprovedTitle")}
        confirmLabel={t("confirmPublishAction")}
        cancelLabel={t("cancel")}
        busy={running === "publishApproved"}
        onConfirm={() => void run("publishApproved", {})}
        onCancel={dismissPrompt}
      >
        {t("confirmPublishApprovedBody")}
      </ConfirmDialog>

      <ConfirmDialog
        open={prompting === "approve"}
        title={t("confirmApproveTitle")}
        confirmLabel={t("confirmApproveAction")}
        cancelLabel={t("cancel")}
        busy={running === "approve"}
        onConfirm={() => void run("approve", {})}
        onCancel={dismissPrompt}
      >
        {t("confirmApproveBody")}
      </ConfirmDialog>

      {/*
        Rejecting and returning ask for an explanation, and an explanation is
        data entry, not a confirmation — so it is a form in the panel rather
        than text inside a dialog. It also keeps the reason in the project's
        field standard, where the label, the hint and the invalid state are
        already bound to the control.
      */}
      {prompting !== null && needsReason(prompting) ? (
        <div className="flex flex-col gap-3 border-t border-[color:var(--color-border-default)] px-4 py-4">
          <h3 className="text-label font-bold text-[color:var(--color-text-primary)]">
            {prompting === "reject" ? t("reasonHeadingReject") : t("reasonHeadingReturn")}
          </h3>

          {prompting === "return" && returnable.length > 0 ? (
            <SelectField
              id={returnToId}
              label={t("returnToStep")}
              required
              placeholder
              value={returnTo}
              onChange={(event) => setReturnTo(event.target.value)}
              options={returnable.map((step) => ({
                value: step.id,
                label: t("stepHeading", { number: step.sequenceOrder + 1, total: steps.length }),
              }))}
            />
          ) : null}

          <TextField
            id={reasonId}
            label={t("reasonLabel")}
            required
            dir="auto"
            hint={prompting === "reject" ? t("reasonHintReject") : t("reasonHintReturn")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant={prompting === "reject" ? "destructive" : "primary"}
              loading={running === prompting}
              disabled={
                reason.trim() === "" ||
                (prompting === "return" && returnable.length > 0 && returnTo === "")
              }
              onClick={() =>
                void run(
                  prompting,
                  prompting === "return"
                    ? { reason: reason.trim(), returnedToStepId: returnTo }
                    : { reason: reason.trim() },
                )
              }
            >
              {prompting === "reject" ? t("sendReject") : t("sendReturn")}
            </Button>
            <Button variant="ghost" onClick={dismissPrompt}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
    </BrandBorder>
  );
};

/** One step, with who decides it and how far it has got. */
const StepRow = ({
  step,
  index,
  total,
  locale,
}: {
  step: WorkflowStepSummary;
  index: number;
  total: number;
  locale: AppLocale;
}) => {
  const t = useTranslations("Editorial");
  // The separator is copy, not punctuation this component may choose: the
  // same list is drawn for an Arabic and an English reader.
  const common = useTranslations("Common");

  return (
    <li
      className={`flex flex-col gap-1 rounded-[var(--radius-sm)] border px-3 py-2 ${
        step.isCurrent
          ? "border-[color:var(--color-brand-primary)] bg-[color:var(--color-surface-sunken)]"
          : "border-[color:var(--color-border-default)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-body-sm font-bold text-[color:var(--color-text-primary)]">
          {t("stepHeading", { number: index + 1, total })}
        </p>
        <p className="text-caption text-[color:var(--color-text-muted)]">
          {step.stepType === "Sequential" ? t("stepSequential") : t("stepParallel")}
        </p>
        {/* Said in words, not only by the border: colour alone is not a
            status (Chapter 8 L4, WCAG 1.4.1). */}
        {step.isCurrent ? (
          <p className="text-caption font-bold text-[color:var(--color-brand-primary)]">
            {t("stepCurrent")}
          </p>
        ) : null}
      </div>

      <p className="text-caption text-[color:var(--color-text-secondary)]">
        {t("stepProgress", { done: step.approvals, required: step.requiredApprovals })}
      </p>

      <p className="text-caption text-[color:var(--color-text-muted)]">
        {step.assignees.length === 0
          ? t("stepNoApprovers")
          : `${t("stepApprovers")} ${step.assignees
              .map((assignee) =>
                assignee.name ? localized(assignee.name, locale) : t("unknownActor"),
              )
              .join(common("listSeparator"))}`}
      </p>
    </li>
  );
};

type Translate = ReturnType<typeof useTranslations<"Editorial">>;

/**
 * The record's own state, in the reader's words.
 *
 * Read from `publicationState` with the running review layered on top: a
 * record under review is still a `Draft` upstream, and telling an author
 * "draft" while three people are deciding on it is true and useless.
 */
const publicationStateLabel = (state: EditorialState, t: Translate): string => {
  if (state.workflowStatus === "InProgress") {
    return t("stateInReview");
  }
  switch (state.publicationState) {
    case "Published":
      return t("statePublished");
    case "Unpublished":
      return t("stateUnpublished");
    case "Archived":
      return t("stateArchived");
    default:
      return t("stateDraft");
  }
};

/** Why nothing can be published. A reason this build does not know still
 *  reads as a sentence rather than as its own key. */
const blockedReasonLabel = (reason: string | null, t: Translate): string => {
  switch (reason) {
    case "noPolicy":
      return t("blockedNoPolicy");
    case "definitionMissing":
      return t("blockedDefinitionMissing");
    case "definitionInactive":
      return t("blockedDefinitionInactive");
    case "definitionForeignType":
      return t("blockedDefinitionForeignType");
    default:
      return t("blockedUnknown");
  }
};

const workflowStatusLabel = (status: string, t: Translate): string => {
  switch (status) {
    case "Approved":
      return t("workflowStatusApproved");
    case "Rejected":
      return t("workflowStatusRejected");
    case "Returned":
      return t("workflowStatusReturned");
    default:
      return t("workflowStatusInProgress");
  }
};

/** Publishing leads; rejecting ends the cycle and carries the destructive
 *  variant (ADR-0004). Everything between is secondary. */
const variantFor = (action: PanelAction): "primary" | "secondary" | "destructive" => {
  if (action === "reject") {
    return "destructive";
  }
  return action === "publish" || action === "publishApproved" || action === "approve" || action === "submit"
    ? "primary"
    : "secondary";
};
