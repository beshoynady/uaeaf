import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app imports "@uaeaf/design-tokens/build/css/index.css" from the workspace package at
  // ../../packages/design-tokens (npm workspace symlink) — Turbopack's root MUST be the monorepo
  // root (not this app's own directory) or that resolves as "leaving the filesystem root".
  turbopack: {
    root: join(__dirname, "..", ".."),
  },
};

export default nextConfig;
