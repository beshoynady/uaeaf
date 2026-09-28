import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import {
  ChampionshipFallbackCard,
  ClubFinderCard,
  EventFallbackCard,
  PresidentFallbackCard,
} from "./index";

describe("fallback cards render with zero data props", () => {
  it("PresidentFallbackCard points at /about/president", () => {
    renderWithIntl(<PresidentFallbackCard />, "en");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/about/president");
  });

  it("ChampionshipFallbackCard points at /championships", () => {
    renderWithIntl(<ChampionshipFallbackCard />, "en");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/championships");
  });

  it("EventFallbackCard points at /events?view=calendar", () => {
    renderWithIntl(<EventFallbackCard />, "en");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/events?view=calendar");
  });

  it("ClubFinderCard points at /athletics#clubs", () => {
    renderWithIntl(<ClubFinderCard />, "en");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/athletics#clubs");
  });

  it("each fallback renders exactly one link", () => {
    for (const Card of [PresidentFallbackCard, ChampionshipFallbackCard, EventFallbackCard, ClubFinderCard]) {
      const { unmount } = renderWithIntl(<Card />, "en");
      expect(screen.getAllByRole("link")).toHaveLength(1);
      unmount();
    }
  });

  it("renders Arabic copy under the ar locale without falling back to a raw key", () => {
    renderWithIntl(<PresidentFallbackCard />, "ar");
    expect(screen.getByRole("link").textContent).not.toMatch(/HeaderCards\./);
  });
});
