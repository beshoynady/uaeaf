"use client";

import { useState } from "react";
import { FilterChip, SearchField, Surface, type SurfaceKind } from "@uaeaf/brand-ui";

const KINDS: readonly SurfaceKind[] = [
  "canvas",
  "raised",
  "photo-light",
  "brand-green",
  "brand-red",
  "ink",
];

/**
 * The two components that hold state, shown working rather than at rest.
 *
 * Split into its own client component so the rest of the Brand Kit stays server
 * rendered — a review page that shipped nineteen components to the browser to
 * demonstrate that seventeen of them do not need to be shipped would be
 * arguing against itself.
 *
 * One chip set and one field per surface, with real state, so a reviewer can
 * check the pressed state and the clear button on every ground including the
 * two where the field keeps its own neutral plate.
 */
export const InteractiveSpecimens = () => {
  const [selected, setSelected] = useState("all");
  const [query, setQuery] = useState("");

  return (
    <section className="brand-kit-specimen">
      <h2 className="brand-kit-specimen__title">FilterChip and SearchField — with real state</h2>
      <div className="brand-kit-specimen__grid">
        {KINDS.map((kind) => (
          <Surface key={kind} kind={kind} mesh={kind === "ink"} as="div" className="brand-kit-cell">
            <p className="brand-kit-cell__label">{kind}</p>

            <div className="brand-kit-row">
              {["all", "regulations", "policies"].map((option) => (
                <FilterChip
                  key={option}
                  label={option}
                  count={option === "all" ? 14 : 7}
                  countLabel="documents"
                  selected={selected === option}
                  onSelect={() => setSelected(option)}
                />
              ))}
            </div>

            <SearchField
              label="Search specimens"
              value={query}
              onValueChange={setQuery}
              placeholder="Type to reveal the clear button"
              clearLabel="Clear search"
            />
          </Surface>
        ))}
      </div>
    </section>
  );
};
