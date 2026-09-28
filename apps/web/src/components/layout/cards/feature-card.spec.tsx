import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { FeatureCard } from "./feature-card";

describe("FeatureCard", () => {
  it("wraps the whole card in exactly one link, not a link per line", () => {
    renderWithIntl(
      <FeatureCard
        eyebrow="e"
        title="t"
        meta="m"
        href="/about/president"
        cta="c"
        tone="brand-green"
      >
        <span>decoration</span>
      </FeatureCard>,
      "en",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders nothing at all when it has no title", () => {
    const { container } = renderWithIntl(
      <FeatureCard eyebrow="e" title={null} href="/x" cta="c" tone="brand-green" />,
      "en",
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("points its one link at the given destination", () => {
    renderWithIntl(
      <FeatureCard eyebrow="e" title="t" href="/championships" cta="c" tone="brand-red" />,
      "en",
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/championships");
  });

  it("carries data-surface set to the given tone — the mechanism the gradient and ink resolve from", () => {
    renderWithIntl(
      <FeatureCard eyebrow="e" title="t" href="/x" cta="c" tone="section-black" />,
      "en",
    );
    expect(screen.getByRole("link")).toHaveAttribute("data-surface", "section-black");
  });

  it("paints the surface it declares, per surface-paint-contract.spec.ts", () => {
    renderWithIntl(<FeatureCard eyebrow="e" title="t" href="/x" cta="c" tone="ink" />, "en");
    expect(screen.getByRole("link").className).toMatch(/\bbrand-surface\b/);
  });

  it("shows the eyebrow, title and cta text, and omits meta when none is given", () => {
    renderWithIntl(
      <FeatureCard eyebrow="Eyebrow text" title="Title text" href="/x" cta="Cta text" tone="brand-green" />,
      "en",
    );
    expect(screen.getByText("Eyebrow text")).toBeInTheDocument();
    expect(screen.getByText("Title text")).toBeInTheDocument();
    expect(screen.getByText("Cta text")).toBeInTheDocument();
  });

  it("shows meta when it is given", () => {
    renderWithIntl(
      <FeatureCard eyebrow="e" title="t" meta="Meta text" href="/x" cta="c" tone="brand-green" />,
      "en",
    );
    expect(screen.getByText("Meta text")).toBeInTheDocument();
  });
});
