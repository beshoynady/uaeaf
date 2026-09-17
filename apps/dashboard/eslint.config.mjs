import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Arrow functions (owner decision 2026-09-17, CLAUDE.md §30): a warning, so
  // files nobody has touched yet do not fail the build; class methods are not
  // affected by either rule.
  {
    rules: {
      "func-style": ["warn", "expression"],
      "prefer-arrow-callback": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
