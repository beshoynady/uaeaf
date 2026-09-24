import type { BrandBorderTone } from "@uaeaf/brand-ui";
import type { ArticleTopic } from "@/lib/api/types";

/**
 * Which identity edge an article card carries, from its topic (ADR-0098 D5).
 *
 * The kit's border has three tones and the topic palette has six hues, so the
 * mapping cannot be one-to-one. It follows the one place the two palettes
 * already meet: `color.topic.national-team.surface` is `color.brand.primary`,
 * and `color.topic.international.*` is drawn from the red ramp. Those two
 * topics take the matching identity line; every other topic, and an article
 * nobody classified, takes the full tricolour, which is the identity's neutral
 * statement rather than a seventh colour claiming to mean something.
 *
 * The edge never carries the topic alone: the `TopicBadge` on the same card
 * names it in words (WCAG 1.4.1).
 */
export const topicTone = (topic: ArticleTopic | null): BrandBorderTone => {
  if (topic === "nationalTeam") return "green";
  if (topic === "international") return "red";
  return "tricolor";
};
