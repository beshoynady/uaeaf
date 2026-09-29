import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Countdown } from "./countdown";
import type { NextEventLike } from "@uaeaf/content/hero";

const labels = {
  days: "يوم",
  hours: "ساعة",
  minutes: "دقيقة",
  live: "الآن",
  countdown: "تبدأ بعد {days} يوم",
};

const event: NextEventLike = {
  isVisible: true,
  label: { ar: "البطولة القادمة", en: "Next championship" },
  name: { ar: "بطولة الإمارات", en: "UAE Championship" },
  venue: { ar: "دبي", en: "Dubai" },
  startsAt: "2026-10-17T14:00:00.000Z",
  endsAt: "2026-10-19T14:00:00.000Z",
};

describe("Countdown", () => {
  it("hides the digits from a screen reader behind a fixed accessible name", () => {
    render(
      <Countdown
        event={event}
        initial={{ state: "before", days: 6, hours: 14, minutes: 32 }}
        labels={labels}
      />,
    );
    const timer = screen.getByRole("timer");
    expect(timer).toHaveAccessibleName("تبدأ بعد 6 يوم");
    expect(timer).toHaveAttribute("aria-live", "off");
    for (const unit of screen.getAllByText(/^\d{2}$/)) {
      expect(unit.closest("[aria-hidden]")).not.toBeNull();
    }
  });

  it("shows the live label once the state is live, not a countdown", () => {
    render(<Countdown event={event} initial={{ state: "live" }} labels={labels} />);
    expect(screen.getByText("الآن")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("renders nothing once the event is over", () => {
    const { container } = render(
      <Countdown event={event} initial={{ state: "hidden" }} labels={labels} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
