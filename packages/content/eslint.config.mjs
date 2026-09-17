import tseslint from "typescript-eslint";

/**
 * The shared hero rules are TypeScript source compiled by both Next apps. The
 * arrow-function rule (owner decision 2026-09-17, CLAUDE.md §30) applies here as
 * a warning, as it does in the apps and in the API's oxlint.
 */
export default tseslint.config({
  files: ["**/*.ts"],
  languageOptions: { parser: tseslint.parser },
  rules: {
    "func-style": ["warn", "expression"],
    "prefer-arrow-callback": "warn",
  },
});
