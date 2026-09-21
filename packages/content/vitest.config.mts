import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["hero/**/*.spec.ts", "sponsors/**/*.spec.ts", "time-range/**/*.spec.ts"],
  },
});
