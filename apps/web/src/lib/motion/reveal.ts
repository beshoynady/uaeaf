import type { CSSProperties } from "react";

/**
 * A reveal part's place inside its block (`motion.css`, `reveal-once.tsx`):
 * parts rise one stagger apart in step order, which is written in reading
 * order.
 */
export const revealStep = (n: number): CSSProperties => ({ "--reveal-step": n }) as CSSProperties;
