import { useTranslations } from "next-intl";
import { BADGE } from "@/components/ui/surface";
import type { ArticleTopic } from "@/lib/api/types";

/**
 * Written out per topic rather than assembled from the id: Tailwind generates
 * only the class names it finds in the source, so a class built at runtime
 * would never be styled.
 */
const TONES: Record<ArticleTopic, string> = {
  nationalTeam:
    "border-[color:var(--color-topic-national-team-edge)] bg-[color:var(--color-topic-national-team-surface)] text-[color:var(--color-topic-national-team-ink)]",
  training:
    "border-[color:var(--color-topic-training-edge)] bg-[color:var(--color-topic-training-surface)] text-[color:var(--color-topic-training-ink)]",
  youth:
    "border-[color:var(--color-topic-youth-edge)] bg-[color:var(--color-topic-youth-surface)] text-[color:var(--color-topic-youth-ink)]",
  international:
    "border-[color:var(--color-topic-international-edge)] bg-[color:var(--color-topic-international-surface)] text-[color:var(--color-topic-international-ink)]",
  community:
    "border-[color:var(--color-topic-community-edge)] bg-[color:var(--color-topic-community-surface)] text-[color:var(--color-topic-community-ink)]",
  records:
    "border-[color:var(--color-topic-records-edge)] bg-[color:var(--color-topic-records-surface)] text-[color:var(--color-topic-records-ink)]",
};

/** No colour of its own: an article nobody classified is not filed under a
 *  seventh topic. A governed text pair on the recessed ground (ADR-0059 D6). */
const NEUTRAL =
  "border-transparent bg-[color:var(--color-surface-sunken)] text-[color:var(--color-text-secondary)]";

/**
 * What a story is about, as a coloured chip (ADR-0094).
 *
 * Bound to `topic`, never to `tags` or `category`: the topic is the closed
 * answer to "what is this about", the shelf decides which homepage section the
 * story appears in, and tags are free words. One chip per article, the same in
 * every placement — the card, the lead story and the article's own header.
 *
 * The label is always the topic's name in words (WCAG 1.4.1): the colour makes
 * it findable and never carries it alone, which also holds in high contrast,
 * where every chip is black on white. `relative` so a chip inside a card sits
 * above the headline's whole-card overlay rather than under it.
 */
export const TopicBadge = ({ topic }: { topic: ArticleTopic | null }) => {
  const t = useTranslations("News");

  return (
    <span className={`${BADGE} relative text-overline font-bold ${topic ? TONES[topic] : NEUTRAL}`}>
      {topic ? t(`topic_${topic}`) : t("topicNone")}
    </span>
  );
};
