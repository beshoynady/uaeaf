/**
 * Draws the fictional demo logos (api/seed/sponsor-relations/logos/*.svg)
 * as PNG at twice their size, for the sponsor-relations seed (ADR-0085 D2).
 *
 * The upload path refuses SVG by decision (a script-bearing document), so the
 * seed uploads these PNGs through the same `MediaAssetsService` the dashboard
 * uses. Playwright is already the web workspace's browser, so no rasteriser
 * dependency is added.
 *
 *   node scripts/rasterize-demo-logos.mjs      (from apps/web)
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const LOGOS = fileURLToPath(new URL("../../../api/seed/sponsor-relations/logos/", import.meta.url));
const SCALE = 2;

const sizeOf = (svg) => {
  const width = Number(/width="(\d+)"/.exec(svg)?.[1]);
  const height = Number(/height="(\d+)"/.exec(svg)?.[1]);
  if (!width || !height) throw new Error("An SVG without a numeric width and height cannot be drawn at a known size.");
  return { width, height };
};

const browser = await chromium.launch();
try {
  const files = (await readdir(LOGOS)).filter((name) => name.endsWith(".svg"));
  for (const file of files) {
    const svg = await readFile(join(LOGOS, file), "utf8");
    const { width, height } = sizeOf(svg);
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: SCALE });
    await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
    const png = await page.locator("svg").screenshot({ omitBackground: false });
    await writeFile(join(LOGOS, file.replace(/\.svg$/, ".png")), png);
    await page.close();
    console.log(`${file} → ${width * SCALE}×${height * SCALE}`);
  }
} finally {
  await browser.close();
}
