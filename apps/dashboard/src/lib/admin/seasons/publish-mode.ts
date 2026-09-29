import type { PublishMode } from "./types";

/**
 * Which publishing door the screen offers, from what `GET
 * /workflow-policies/seasons/Edit` answered.
 *
 * The API is the arbiter (ADR-0125): `PublishingService.publishDirect`
 * re-resolves the policy at the moment of the publish and refuses with its
 * own code whatever this says. This only decides which control to draw, so
 * the reader is not offered "publish" on a type that sends everything to
 * review.
 *
 * - `readable: false` — the reader holds no `workflowPolicies:Read`, or the
 *   read failed. Nothing is known; "publish" is offered and the API answers.
 * - `null` row — no policy. The API publishes by permission in that case
 *   (`resolved.reason === 'noPolicy'` falls through), so the door is direct.
 * - a row — its `workflowRequired` decides.
 */
export const publishModeOf = (policy: unknown, readable: boolean): PublishMode => {
  if (!readable) return "unknown";
  if (policy === null || policy === undefined) return "direct";
  if (typeof policy !== "object") return "unknown";
  const required = (policy as { workflowRequired?: unknown }).workflowRequired;
  if (required === true) return "approval";
  return required === false ? "direct" : "unknown";
};
