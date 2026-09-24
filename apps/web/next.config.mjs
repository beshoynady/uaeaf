import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default request-config path (src/i18n/request.ts) — no argument needed.
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `@uaeaf/brand-ui` ships TSX source rather than a build step, so Next has to
  // compile it like application code. Without this the JSX reaches the bundler
  // untransformed and the build fails on the first `<Surface>`.
  transpilePackages: ["@uaeaf/brand-ui"],
  // This app imports "@uaeaf/design-tokens/build/css/index.css" from the workspace package at
  // ../../packages/design-tokens (npm workspace symlink) — Turbopack's root MUST be the monorepo
  // root (not this app's own directory) or that resolves as "leaving the filesystem root".
  turbopack: {
    root: join(__dirname, "..", ".."),
  },
};

export default withNextIntl(nextConfig);
