import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    server: {
      // next-intl is ESM-only; Next.js's dep optimization can otherwise mis-bundle
      // it for Vitest, especially `createNavigation` (same constraint documented
      // in apps/web/vitest.config.mts).
      deps: { inline: ["next-intl"] },
    },
  },
  resolve: {
    alias: { "@": join(__dirname, "src") },
  },
});
