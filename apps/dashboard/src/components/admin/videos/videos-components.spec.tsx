import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformMark } from "./platform-mark";
import { AssociationField } from "./association-field";
import { VIDEO_PLATFORMS } from "@/lib/admin/videos/types";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

/**
 * The two pieces every video screen shares.
 *
 * `PlatformMark` carries the brand colours; in the dashboard it shows the
 * platform's NAME beside the mark, because an editor scanning a table of
 * mixed sources reads the word faster than a logo, and the public cards are
 * the only place the name is hidden.
 *
 * `AssociationField` is the one that matters. Championships and events are not
 * built, so its option list is empty — and an empty select is a dead
 * affordance, which this project treats as a defect rather than a cosmetic
 * gap. It therefore draws nothing at all until there is something to choose.
 */
describe("PlatformMark", () => {
  it.each(VIDEO_PLATFORMS)("draws %s with its name beside the mark", (platform) => {
    render(<PlatformMark platform={platform} />);

    expect(screen.getByText(`platform_${platform}`)).toBeInTheDocument();
  });

  it("hides the mark itself from assistive technology, because the name carries it", () => {
    const { container } = render(<PlatformMark platform="youtube" />);

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws YouTube in its own brand colour, not a design-system token", () => {
    // These five colours belong to other organisations. They are the one place
    // in this system that is deliberately not a token.
    const { container } = render(<PlatformMark platform="youtube" />);

    expect(container.innerHTML).toContain("#FF0000");
  });
});

describe("AssociationField", () => {
  it("draws nothing at all while there is nothing to choose", () => {
    // Championships and events do not exist yet. A select with no options is
    // a control that looks operable and is not.
    const { container } = render(
      <AssociationField options={[]} value={null} onChange={() => undefined} label="l" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("draws the control once options exist", () => {
    const options = [{ value: "championships:66f0a1b2c3d4e5f60718293a", label: "UAE Championship 2026" }];

    render(<AssociationField options={options} value={null} onChange={() => undefined} label="Championship" />);

    expect(screen.getByLabelText("Championship")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "UAE Championship 2026" })).toBeInTheDocument();
  });

  it("offers a way back to no selection", () => {
    const options = [{ value: "championships:66f0a1b2c3d4e5f60718293a", label: "UAE Championship 2026" }];

    render(<AssociationField options={options} value={null} onChange={() => undefined} label="Championship" />);

    // Without this an editor who picks one by mistake cannot unpick it.
    expect(screen.getByRole("option", { name: "associationNone" })).toBeInTheDocument();
  });
});
