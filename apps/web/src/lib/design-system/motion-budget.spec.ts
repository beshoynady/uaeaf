import { readFileSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "node:fs";

/**
 * The motion library stays at its small entry point (ADR-0076 D3, Risks §4).
 *
 * `LazyMotion` + the `m` component is roughly 4.6 KB; importing the full
 * `motion` component instead pulls in about 34 KB, because its props-driven
 * API cannot be tree-shaken. The difference is invisible in review — both
 * lines read `from "motion/react"` — and it lands on the page whose Largest
 * Contentful Paint the whole hero design exists to protect.
 *
 * So the budget is a test rather than a note. The ADR says in as many words
 * that this "must be guarded by a test, not by discipline"; this is that
 * test.
 */
describe("motion budget", () => {
  const sources = globSync("src/**/*.{ts,tsx}", { cwd: join(process.cwd()) })
    .filter((path) => !path.endsWith(".spec.ts") && !path.endsWith(".spec.tsx"))
    // Normalised because `globSync` yields Windows separators here and the
    // expectations below are written the way the repository spells a path.
    .map((path) => ({ path: path.split("\\").join("/"), text: readFileSync(join(process.cwd(), path), "utf8") }));

  it("finds the application sources to check", () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it("never imports the full `motion` component", () => {
    const offenders = sources
      .filter(({ text }) => /from\s+["']motion\/react["']/.test(text))
      .filter(({ text }) => /\bimport\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*["']motion\/react["']/.test(text))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("configures reduced motion once, at the root, rather than per component", () => {
    const configs = sources.filter(({ text }) => text.includes("<MotionConfig")).map(({ path }) => path);

    expect(configs).toEqual(["src/components/ui/motion-provider.tsx"]);
  });
});
