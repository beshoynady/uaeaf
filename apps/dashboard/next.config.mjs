import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import { LEGACY_REDIRECTS } from "./legacy-redirects.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default request-config path (src/i18n/request.ts) — no argument needed.
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `@uaeaf/brand-ui` ships TSX source rather than a build step, so Next has to
  // compile it like application code. Without this the JSX reaches the bundler
  // untransformed and the build fails on the first `<Surface>`.
  transpilePackages: ["@uaeaf/brand-ui"],
  // Same constraint as apps/web: this app imports
  // "@uaeaf/design-tokens/build/css/index.css" from the workspace package at
  // ../../packages/design-tokens (npm workspace symlink), so Turbopack's root
  // MUST be the monorepo root or that resolves as "leaving the filesystem root".
  turbopack: {
    root: join(__dirname, "..", ".."),
  },
  // Screens that moved keep their old addresses working (legacy-redirects.mjs).
  redirects: async () => LEGACY_REDIRECTS,
};

export default withNextIntl(nextConfig);
