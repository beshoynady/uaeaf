import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default request-config path (src/i18n/request.ts) — no argument needed.
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Same constraint as apps/web: this app imports
  // "@uaeaf/design-tokens/build/css/index.css" from the workspace package at
  // ../../packages/design-tokens (npm workspace symlink), so Turbopack's root
  // MUST be the monorepo root or that resolves as "leaving the filesystem root".
  turbopack: {
    root: join(__dirname, "..", ".."),
  },
};

export default withNextIntl(nextConfig);
