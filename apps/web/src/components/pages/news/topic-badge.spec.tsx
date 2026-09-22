import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopicBadge } from "./topic-badge";
import type { ArticleTopic } from "@/lib/api/types";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const TOPICS: ArticleTopic[] = ["nationalTeam", "training", "youth", "international", "community", "records"];

describe("TopicBadge", () => {
  it.each(TOPICS)("names the %s topic in words and draws it in its own tokens", (topic) => {
    render(<TopicBadge topic={topic} />);

    const chip = screen.getByText(`topic_${topic}`);
    const token = topic === "nationalTeam" ? "national-team" : topic;
    expect(chip.className).toContain(`--color-topic-${token}-surface`);
    expect(chip.className).toContain(`--color-topic-${token}-ink`);
  });

  it("draws an unclassified article neutrally, as no seventh colour", () => {
    render(<TopicBadge topic={null} />);

    const chip = screen.getByText("topicNone");
    expect(chip.className).not.toContain("--color-topic-");
    expect(chip.className).toContain("--color-text-secondary");
  });
});
