import { defineConfig } from "@playwright/test";

/**
 * Browser checks that need real layout, which jsdom cannot give (ADR-0069
 * D10, *The guard*): the identity lines' safe distance through every frame of
 * the entrance, and the President's Message text as a visitor receives it.
 *
 * Against a running site: `WEB_BASE_URL` (default the local dev server) and
 * `UAEAF_API_URL` for the stored record. One worker, because every case loads
 * a page from a dev server on a machine that also runs the API.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.WEB_BASE_URL ?? "http://localhost:3001",
    browserName: "chromium",
  },
});
